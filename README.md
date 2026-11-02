# ISABEL WATERS | Billing & Collection

A React and Supabase water utility billing system with a public customer portal and a separate staff portal.

## Run locally

1. Create a Supabase project. In **SQL Editor**, run [`supabase/schema.sql`](supabase/schema.sql) once, then run [`supabase/migrations/20261031_staff_rbac.sql`](supabase/migrations/20261031_staff_rbac.sql). The migration requires the two staff Auth users below to exist first. For an existing database, run only the migration.
2. Copy `.env.example` to `.env` and set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` to the publishable/anon key. The existing local `.env` still uses `VITE_SUPABASE_PUBLISHABLE_KEY`, which the client accepts for compatibility. `.env` is ignored by Git.
3. In Supabase **Authentication → URL Configuration**, set the Site URL to your local or deployed frontend URL. Add `http://localhost:5173/reset-password` and your deployed `/reset-password` URL to Redirect URLs so password recovery works.
   For live registrations, configure **Authentication → Emails → SMTP Settings** with your own SMTP provider. Supabase's built-in sender is limited to two emails per hour across the project and may only deliver to organization members. During local-only testing, you may temporarily turn off **Confirm Email** under **Authentication → Sign In / Providers → Email**; this removes email verification, so turn it back on before accepting real registrations.
4. Install and start the app:

   ```bash
   npm install
   npm run dev
   ```

   Open the local URL printed by Vite, normally `http://localhost:5173`.

Run `npm run build` for a production static build in `dist/`. Configure your host to serve `index.html` for unknown paths so React Router deep links work. Set the same `VITE_` values in the hosting build environment; Vite embeds publishable values at build time. Never put a Supabase service role key in a `VITE_` variable.

## Add staff and assign roles

1. In Supabase **Authentication → Users → Add user**, create `admin@isabelwaters.com` and `cashier@isabelwaters.com` with passwords. Do **not** provide meter metadata. Run the RBAC migration; it assigns these existing accounts their roles.
2. For another staff member, create the Auth user without meter metadata, then assign the intended role in **SQL Editor**. All new Auth users default to `customer` because public sign-up is enabled. Defaulting them to `cashier` would let anyone gain staff access by signing up without a meter number.

   ```sql
   update public.profiles
   set role = 'cashier' -- or 'admin'
   where id = (
     select id from auth.users
     where lower(email) = lower('staff@example.com')
   );
   ```

3. Sign in at `/portal`. Admins open `/admin`; cashiers open `/cashier`. There is deliberately no public link to the staff portal.

For the previously supplied `admin@isabelwaters.com` account and UUID, [`supabase/make-admin.sql`](supabase/make-admin.sql) verifies both identifiers before promoting the profile. If this account was originally registered as a customer, its old customer row remains in the database but is excluded from customer management by its new admin role.

Admins cannot self-register through the site. Admins see read-only monitoring, transaction history, cashier totals, overdue accounts, charts, and CSV export. Cashiers review registrations, approve or reject customers, generate bills, and post payments. Customer passwords are only managed through Supabase Auth; staff screens never display them.

## Customer flow

- `/register`: creates an Auth user; `handle_new_user()` writes a `customer` profile and a `pending` customer record from signup metadata. The role is hard-coded on the server.
- `/login`: signs in a customer. Pending customers see only the approval message. Inactive and rejected customers see account state messages.
- `/customer/*`: active customers can read only their bills and payments. They may edit only their own contact number and address, and may change their Auth password.
- `/portal`: staff-only login. A customer who attempts it is signed out and shown “Access denied.” Staff who use `/login` are signed out and directed to use the staff portal.

The current public rate comes from the latest `water_rates.effective_from` date on or before today. The default is ₱18.50/m³. Edit `water_rates` in SQL Editor to introduce new effective rates; existing bills keep the rate used when they were issued. The sidebar collection goal comes from `settings.monthly_collection_goal` (seeded at ₱100,000).

## Database and security

`supabase/schema.sql` creates `profiles`, `customers`, `water_rates`, `bills`, `payments`, and `settings`, with foreign keys, indexes, a unique meter number, and one bill per customer per month. Every table has RLS enabled. Customers cannot insert or update bills or payments, and cannot alter their role, status, or meter number. `guard_customer_update()` enforces the allowed customer fields in addition to RLS. Public visitors can only read water rates and check meter availability through the narrow `is_meter_number_available()` function.

The RBAC migration preserves the existing `customer` role for the public portal, adds `cashier`, and makes `admin` read-only for customers, bills, and payments. It adds `payments.collected_by`; earlier payments retain a null collector and display as legacy/unknown. Cashier IDs on new payments are checked against the signed-in user by RLS and a trigger. The profile role is stored only in the database and cannot be changed through the app. Run the migration before using the new staff routes; frontend changes alone do not enforce database security.

`calculate_bill()` derives usage, amount, balance, and stored paid/partial/unpaid status from the readings and posted amount. `apply_payment()` recalculates paid amount and balance from the payment ledger after inserts, edits, or deletions. An overpayment fails the transaction. “Overdue” is computed when a positive balance has a due date before today; it is not stored. Collection rate is total collected divided by total billed.

The schema includes conditional demo seed rows for `sample.maria@isabelwaters.example` and `sample.juan@isabelwaters.example`. If you want those sample customers and prior-month bills, create those two Auth users **before** running the schema script. The seed block only adds demo records for matching Auth users; it does not create Auth credentials. If those accounts do not exist, the app starts with no demo customer data.

## Quick verification

### Phase 1: tiered billing and official receipts

After the staff RBAC migration, run [`supabase/migrations/20261031_phase1_billing_collection.sql`](supabase/migrations/20261031_phase1_billing_collection.sql) in SQL Editor. This adds tiered rates, charge lines, payment allocations, and transactional OR counters. Phase 1 payments can be partial and span multiple older bills; amounts above the full running balance are rejected until customer credit is implemented in Phase 3. Prior balance is printed as a snapshot and remains owed on its original bill, so it is not counted twice. Existing payments keep a blank OR number.

1. Sign in as cashier, search an existing active customer, enter readings, and save. Confirm the tier breakdown and print view. A first bill permits editing the previous reading; later bills take it from the latest bill.
2. Try the same customer and month twice, and try a current reading below the previous one. Both must fail.
3. Collect a partial payment by Cash, then a GCash or Bank Transfer payment with a reference. Confirm that allocation starts with the oldest due bill and that each receipt shows a unique OR number.
4. Try a direct `insert`, `update`, or `delete` on `bills` and `payments` as cashier through Supabase REST/client. RLS must reject all of them. Try `create_bill` and `record_payment` as admin; the functions must reject the role.
5. Submit two concurrent cashier payments to the same customer and check that the second sees the updated balance and that committed OR numbers are unique and consecutive. A failed payment must not consume an OR number.

The migration has not been run against the connected Supabase project by this repository change. Apply it before testing the new cashier screens.

1. Register a customer and check that the account is pending and has no bill access.
2. Log into `/portal` as a cashier, review the pending customer, verify the meter, and approve.
3. Generate a bill for the active customer. Try the same month again to confirm it is blocked.
4. Collect a partial payment, then the remainder. The ledger should move from Partial to Paid and the balance should reach ₱0.00.
5. Log in as the customer and confirm the bill and payment history are visible. Print a bill from either portal.
6. Log in as admin and check `/admin` monitoring. Try opening `/cashier` directly; it should return to `/admin`. Try opening `/admin` as cashier; it should return to `/cashier`.
7. While signed in as admin, attempt an insert into `bills` or `payments` through the Supabase client or REST API. RLS must reject the write. Confirm a cashier payment records that cashier's UUID in `collected_by`.

The app uses browser print for PDF output. Office address, contact, and GCash account details are deliberately not invented; set optional `VITE_OFFICE_ADDRESS` and `VITE_OFFICE_CONTACT` for the landing page and give the verified payment account to customers through your office workflow.
