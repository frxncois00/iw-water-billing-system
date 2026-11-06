# Database update: CAN linking and public intake

Run [the migration](../supabase/migrations/20261104_accounts_applications_concerns.sql) in the Supabase SQL Editor **after** `schema.sql`, `20261031_staff_rbac.sql`, and `20261031_phase1_billing_collection.sql`. Take a database backup first. The migration is transactional and preserves existing customers, invoices/bills, and payments. It has **not** been run against a Supabase project by this repository change.

## What this query adds

- `contract_accounts`: one row per water billing account, independent of portal users. Existing `customers` rows are backfilled. `can` starts empty because this repository does not contain Isabel Waters' actual CAN list.
- `account_contacts`: existing contact information, readable by staff only.
- `portal_account_links`: many users per CAN and many CANs per user; signup no longer creates a new customer/meter record.
- `bills.account_id`: backfilled and automatically assigned for bills made by the legacy billing function.
- `service_applications` and `application_requirements`: one queue for online, walk-in, phone, email, and other staff-entered requests.
- `service_cases`: concerns from logged-in or guest users, with or without a CAN.
- RPCs: `link_account_by_can`, `unlink_account`, `submit_service_application`, `submit_service_case`, `track_public_request`.
- Row-level security for billing access through account links and staff-only intake records.

## Import real existing CANs

First inspect the backfill in SQL Editor:

```sql
select id, legacy_customer_id, account_name, meter_no, can, status
from public.contract_accounts
order by created_at;
```

Match Isabel Waters' official customer list using an unambiguous source identifier. If meter numbers are confirmed unique and correct in that source, a single verified update looks like:

```sql
update public.contract_accounts
set can = 'IW-12345678', updated_at = now()
where legacy_customer_id = (
  select id from public.customers where upper(meter_no) = 'VERIFIED-METER-NO'
);
```

Check that the update affected exactly one row. Do not fabricate CANs, overwrite an existing CAN, or expose the import sheet through a public table. Import in a staging process with duplicate and mismatch review if there are many accounts.

## Example client calls

```js
// Logged-in user: links an existing CAN; no owner/household role is created.
await supabase.rpc('link_account_by_can', { p_can: 'IW-12345678' })

// Anyone, including anon: a new online service application.
await supabase.rpc('submit_service_application', {
  p_channel: 'online', p_name: 'Applicant Name', p_phone: '09...',
  p_email: null, p_address: 'Service address', p_notes: null,
})

// Anyone, including anon: a concern without login or CAN.
await supabase.rpc('submit_service_case', {
  p_channel: 'online', p_category: 'leak',
  p_description: 'Pipe leaking near the road', p_name: 'Reporter',
  p_phone: '09...', p_email: null, p_location: 'Barangay and landmark', p_can: null,
})
```

The submission RPCs return a `reference_no` and a secret `tracking_token`. Show the token to the submitter once and store it securely if they need guest tracking. `track_public_request` returns only request type, status, and last update time.

For walk-in, phone, email, or another channel, a signed-in cashier/admin calls the same submission RPC with the appropriate `p_channel`. Anonymous callers cannot claim to be staff-entered. A guest CAN in a concern is a *claim for staff triage*, not proof of account access.

## Customer pages

The React portal uses the account links for registration, account selection, invoices and posted payments. Public forms at `/apply` and `/concerns` use the same intake RPCs as staff-assisted requests. Tracking at `/track` uses the reference and secret code.

Run [the page support migration](../supabase/migrations/20261105_requested_documents.sql) once after the account migration. It supports privately submitted requested files, customer-visible replies and activation of an installed connection using an office-issued CAN. Cashiers use `/cashier/requests` to record updates and review documents. Inspection, service agreements, connection charges and installation are handled by the office and reflected in the application status.

Set `VITE_BILLER_PAYMENT_URL` to the approved provider's hosted payment page that accepts the CAN as the payment reference. Configure verified office details using the variables in `.env.example`. Rebuild after changing frontend configuration. The provider receives the payment and staff confirm it through the existing collection workflow before it appears on the account. There is no automatic settlement integration.
