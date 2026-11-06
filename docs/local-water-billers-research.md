# Local Water Biller Research for Isabel Waters

**Benchmark organizations:** Manila Water Company, Inc. and Maynilad Water Services, Inc.  
**Research date:** 4 November 2026 (Asia/Manila)  
**Purpose:** Translate public customer-service practices into requirements for the Isabel Waters billing and collection system.

> This is product and process research, not a legal opinion. Manila Water and Maynilad are MWSS concessionaires. Their exact tariffs, fees, service areas, and concession rules do not automatically apply to Isabel Waters. Isabel Waters must confirm its legal entity, regulator, approved tariff, tax status, service contract, and local operating policies before these are encoded as rules.

## 1. Executive findings

1. **A customer portal account is not a water service connection.** A portal normally links a verified person to an existing contract account. A new service connection is a case-management process involving documents, inspection, approval, fees, a job order, installation, meter assignment, and activation.
2. **The durable business identifiers are the contract account and meter, not the login.** One person may own or manage several properties/accounts; a property can change owners or occupants; a meter can be replaced; and an authorized representative can act for an owner. These should be separate records.
3. **Billing is a controlled ledger, not just `usage × rate`.** Large utilities show tariff versions, customer classifications, actual/average/adjusted readings, line-item charges, prior balances, taxes, discounts, miscellaneous/service charges, credit memos, payments, and adjustments.
4. **Offline service remains first-class.** Business-area offices, hotlines, email, SMS/social channels, field staff, paper forms, payment partners, printed bills, notices, and job orders work alongside the portal.
5. **Complaints and field work need traceable cases.** Every inquiry, billing protest, leak report, meter issue, disconnection, and reconnection should have a reference number, ownership, status, SLA timestamps, communications, evidence, and resolution.
6. **Privacy must cover the whole operation.** Paper forms, phone recordings/notes, ID copies, property documents, field photos, portal data, payment references, exports, and third-party payment processors are all in scope—not only the website.
7. **Philippine invoicing terminology has changed.** Under the Ease of Paying Taxes rules, an Invoice is the principal evidence of sale; an Official/Collection/Payment Receipt is supplementary proof of payment. Isabel Waters should have its accountant/tax adviser approve the printed and electronic formats before production use.

## 2. What Manila Water and Maynilad publicly show

| Area | Manila Water | Maynilad | Reusable lesson for Isabel Waters |
|---|---|---|---|
| Service footprint | East Zone operation organized around service-area offices and a 24-hour consumer desk | West Zone divided into Business Areas, zones, sub-zones, and district-metered areas | Store service area, route/zone, barangay, and responsible team on every account and work order |
| Account identifier | Contract Account Number (CAN) used for portal validation and payment | Unique eight-digit CAN; treated as confidential | Generate an immutable account number; do not use email, user ID, or meter number as the account identity |
| Customer channels | Service-area office, 1627 hotline, email, social media, app | Business-area office, 1626 hotline, email, SMS/social, Zone Specialist, My Water Bill portal | Use one case queue across walk-in, phone, email, portal, and field referrals |
| Portal/app | Bills, payment history, payment, alerts/advisories, concerns | e-SOA, bill notifications, alerts, payment channel information | Link portal access to an already verified account; support notification preferences and paperless opt-in |
| Bill/invoice | Service and billing information, recent consumption, charge summary, adjustments, recent payments, announcements, detachable payment stub | Service info, metering info, reading type, recent payments, billing summary, reminders; separate service invoice and credit memo where applicable | Produce an itemized, versioned Invoice and keep payment acknowledgement separate |
| Rates | Basic charge plus applicable adjustments, environmental/sewer/meter maintenance charges, taxes, and other charges | Socialized tariff by customer class/consumption plus applicable adjustments, environmental/sewer/meter maintenance charges, taxes, and other charges | Build a configurable charge engine, never hard-code a single rate |
| Payments | Accredited banks, online/mobile channels, payment centers; employees/service providers are not authorized to accept payment | Banks, mobile/online channels, payment centers, check and corporate arrangements | Maintain an approved channel registry, posting status, batch reconciliation, and clear anti-fraud wording |
| Service application | Public material describes requirements + area inspection by a Territory Manager before installation | Detailed requirements; owner/authorized representative; office/hotline/email/Zone Specialist entry points | Implement application, document validation, inspection, estimate, approval, payment, installation, and activation as distinct stages |
| Collections | Unpaid amounts and possible disconnection are reflected in billing/service rules | Notice of Disconnection, Request to Accept Payment (RAP), fees, automatic reconnection job order after required payment posts | Generate notices and controlled field orders; do not let a cashier directly change physical-service state |
| Complaints | Consumer desk and M.W. C.A.R.E.S.; concerns routed to Territory Managers | Hotline, digital/social, BA offices, Zone Specialists; formal billing contest rules | Build complaint categories, evidence upload, provisional collection treatment, escalation, and SLA reporting |

Official references: [Manila Water bill information](https://www.manilawater.com/customers/bill-information), [Manila Water app](https://www.manilawater.com/customers/manila-water-app), [Manila Water payment facilities](https://www.manilawater.com/customers/payment-facilities), [Manila Water contact channels](https://www.manilawater.com/contact-us), [Maynilad customer requirements and Business Areas](https://www.mayniladwater.com.ph/contact-us/), [Maynilad bill guide](https://www.mayniladwater.com.ph/how-to-read-your-water-bill/), [Maynilad FAQs](https://www.mayniladwater.com.ph/contact-us/faqs/), and [Maynilad payment channels](https://www.mayniladwater.com.ph/payment-channels/).

## 3. End-to-end operating processes

### 3.1 New water service connection — offline/hybrid

The following is the practical target flow. Maynilad publishes the entry points and initial document requirements; inspection, cost estimate, work-order, and installation stages are the operational steps implied by those requirements and by water-utility practice. Isabel Waters should approve its own exact sequence and SLAs.

1. **Inquiry and pre-check**
   - Capture applicant, property/service address, service class, ownership/tenure, landmark/neighbor account, and preferred contact channel.
   - Check whether the address is in the service area, whether a connection already exists, whether there are blocked/illegal accounts, and whether network capacity is available.
   - Issue an application reference number and a requirements checklist.
2. **Application and documents**
   - Receive a signed application and privacy notice acknowledgement.
   - Scan/record documents, but keep originals/physical copies only if policy or law requires them.
   - Mark each document pending, accepted, rejected, expired, or waived, with verifier and reason.
3. **Identity and authority verification**
   - Confirm owner/applicant identity and legal tenure.
   - If represented, validate the representative's ID and authorization/SPA.
   - For a company, validate registration and the signatory's authority.
4. **Site inspection / technical assessment**
   - Assign an inspector; schedule the visit; capture GPS/location, photos, nearest main, pipe/meter size, road type, restoration/excavation needs, feasibility, hazards, and recommendation.
   - Record whether an LGU, HOA, subdivision, or road excavation permit is required.
5. **Estimate and approval**
   - Produce a versioned estimate showing connection materials/labor, installation/service invoice items, deposit, and permits.
   - Separate technical approval, commercial approval, and exceptional waiver approval.
6. **Contract and payment**
   - Present the service agreement, schedule of rates/fees, customer responsibilities, privacy notice, and disconnection/complaint rules.
   - Record acceptance and issue the correct BIR-approved Invoice/payment acknowledgement.
7. **Installation work order**
   - Generate a controlled work order only after prerequisites pass.
   - Reserve/issue serialized materials and a meter; schedule the crew; record actual materials and work performed.
8. **Completion and activation**
   - Capture installed meter serial, seal number, initial reading, installation photos, completion date, crew, customer acknowledgement, and exceptions.
   - Create/activate the contract account, assign route/reading cycle, and send the first-reading/billing schedule.

**Maynilad's published initial documents** include proof of ownership/tenure (e.g. title, deed of sale, or contract to sell), application form, government IDs with specimen signatures, TIN, HOA clearance where relevant, SPA if represented, a neighbor's sample CAN/meter number, excavation permit after inspection when needed, and SEC documentation for a company. Open/depressed areas may use certification from an authorized government/housing agency. Requirements can vary after assessment. See [Maynilad's official requirements](https://www.mayniladwater.com.ph/contact-us/).

### 3.2 Online portal enrollment

Recommended flow for an **existing active account**:

1. User creates a login and verifies email/mobile.
2. User requests to link a contract account using CAN plus non-public validation data.
3. System performs rate limiting and risk checks. High-risk or mismatched requests go to manual review.
4. The registered owner approves a representative where applicable.
5. System records the relationship (`owner`, `occupant`, `authorized representative`, `viewer`, etc.), scope, start/end dates, and audit trail.
6. User accepts portal Terms and acknowledges the Privacy Notice; optional alerts and paperless billing use separate preferences/consents.
7. Portal exposes only authorized accounts and permitted actions.

Manila Water's terms use account-validation details such as CAN, billing period, consumption, and meter information and tell users not to disclose them. Those fields should **not all be treated as secure secrets**, because some appear on printed bills. Isabel Waters should prefer an OTP sent to an independently verified owner contact or manual review for first-time linking. See [MY.MANILAWATER.APP Terms](https://mediafiles.manilawater.com/public/pages/67e0f85018901587e4013222/application-form-mw-app-bor.pdf).

### 3.3 Meter reading and billing

1. Create reading cycles and routes for active meters.
2. Assign route batches to meter readers; allow offline capture with sync.
3. Capture reading, timestamp, reader, GPS (where proportionate), meter/photo evidence, and exception code.
4. Validate against prior reading, expected range, rollover/replacement, duplicate entry, and unusual consumption.
5. Route anomalies to supervisor review or meter investigation.
6. Classify the approved reading as **Actual, Average/Estimated, or Adjusted** and preserve the reason and approval.
7. Apply the tariff version effective for the period and the account's customer classification.
8. Generate immutable charge lines, invoice number, issue date, due date, and delivery status.
9. Deliver print and/or electronic Invoice according to preference; record delivery attempts and failures.

Minimum bill/invoice content for the product design:

- Issuer legal name, registered address, TIN/tax classification, and BIR-required invoice information
- Invoice number and contract account number
- Account name, service address, customer classification, route/cycle
- Meter serial/number, reading dates, previous/current readings, consumption, and reading type
- Billing period, issue date, due date
- Each charge/discount/tax/adjustment as a separate line with tariff/version source
- Previous unpaid amount, credits, current charges, amount due
- Recent payments (informational), payment channels, complaint/contact instructions
- Notices/advisories and machine-readable payment reference/QR only when securely designed

Maynilad's current bill guide explicitly distinguishes Actual, Average, and Adjusted readings and separates service charges such as installation, reopening, illegal-use fees, and deposits into a Service Invoice; reversals can produce a Credit Memo. See the [official Maynilad bill guide](https://www.mayniladwater.com.ph/how-to-read-your-water-bill/).

### 3.4 Payment and reconciliation

1. Accept a payment intent at the office or receive a transaction from an approved partner.
2. Validate account, amount, channel, tender/reference, payer details only where required, and duplicate/idempotency key.
3. Post to an unapplied-cash/credit balance or allocate under an approved rule (normally oldest valid receivable first, with exceptions for disputed items).
4. Generate a payment acknowledgement/collection receipt if used; do not mislabel it as the principal tax Invoice.
5. Keep overpayments as customer credit or process a controlled refund—do not reject them without a policy reason.
6. Reconcile cashier shifts and partner settlement batches against bank/processor totals.
7. Route unmatched, reversed, charged-back, short, duplicate, or wrong-account transactions to an exception queue.
8. Never delete a posted payment. Reverse/void with reason, approver, linked correcting entry, and audit history.

Controls to adopt:

- Cashier opening/closing session, collection summary, denomination/count, shortage/overage
- Unique cashier/payment/invoice references and idempotent partner callbacks
- Maker-checker approval for voids, refunds, write-offs, credits, and manual adjustments
- Separation of cash collection, reconciliation, and adjustment approval
- Approved payment-channel registry; prominent warning that unauthorized employees/agents cannot accept payment
- Settlement date and posting date kept separately

### 3.5 Billing complaint / contested bill

1. Open a case against one or more invoices; issue a reference number.
2. Capture reason, requested remedy, contact channel, supporting Invoice/payment proof/photos, and the provider action already taken.
3. Flag the disputed amount without erasing the receivable.
4. Apply Isabel Waters' approved provisional-payment and collection-hold policy.
5. Investigate reading history, photos, meter condition, leaks, tariff/classification, prior adjustments, and payments.
6. Approve outcome: no error, corrected reading, rebill, debit/credit memo, payment reposting, meter test/replacement, payment plan, or escalation.
7. Send a reasoned resolution and preserve evidence, dates, owner, approvals, and customer acknowledgement/appeal.

Maynilad publicly describes provisional payment rules for contested bills and a 60-day period after bill generation for complaints. Treat those as **benchmarks only**, not Isabel Waters defaults. MWSS asks customers to complain first to the concessionaire; an escalated complaint includes CAN, account name, address, contact details, and supporting documents such as the statement/invoice. See [Maynilad FAQs](https://www.mayniladwater.com.ph/contact-us/faqs/) and the [MWSS RO Citizen's Charter](https://ro.mwss.gov.ph/wp-content/uploads/2023/10/MWSS-RO-CITIZENS-CHARTER-2023-1st-Edition_02-October-2023.pdf).

### 3.6 Delinquency, notice, disconnection, and reconnection

Recommended controlled flow:

1. Age receivables and exclude paid, reversed, stayed, disputed, or protected accounts according to policy.
2. Produce a reviewable delinquency list; supervisors resolve exceptions.
3. Generate a dated written Notice of Disconnection with amount, cure deadline, channels, complaint rights, and contact details.
4. Record delivery method/status and required notice period.
5. After the cure period, approve and issue a disconnection work order to an authorized field team.
6. Field team records pre/post reading, action, timestamp, GPS/photo where proportionate, seal/status, and failed-attempt reason.
7. Once the approved amount/fees post, generate a reconnection work order—cashiers should not directly mark a service physically reconnected.
8. Field completion reactivates supply status and records the reconnection reading.

The Manila Water revised concession agreement permits disconnection when charges remain unpaid 60 days after due date, requires at least seven days' prior written notice, and describes reconnection after all outstanding charges/penalties/reconnection charges are paid. This is an **MWSS concession benchmark**, not a rule to copy without confirming Isabel Waters' regulator and contract. See [MWSS/Manila Water Revised Concession Agreement, section 6.6](https://ro.mwss.gov.ph/wp-content/uploads/2022/01/REVISED-CA-FOR-MANILA-WATER-30-MARCH-2021.pdf).

### 3.7 Other service cases the system should support

- Change of ownership/account name
- Add/remove authorized representative
- Additional meter or service connection
- Temporary closure, permanent termination, and deposit refund
- Reconnection/reopening
- Meter testing, defective meter, replacement, relocation, stolen meter, or tamper investigation
- Leak before meter, leak after meter advisory, low/no pressure, water quality, interruption
- Billing/payment correction, wrong-account payment, refund, credit balance
- Senior citizen/lifeline/socialized-rate application and periodic eligibility review
- Septic/sewer/desludging request if Isabel Waters provides those services
- Illegal connection/tampering case with restricted evidence and due process
- Data subject request: access, correction, objection/erasure where applicable

## 4. Documents and records catalogue

### 4.1 Customer completes or submits

| Document/record | Key fields or attachments | Product treatment |
|---|---|---|
| New service application | Applicant, owner, service address, class/use, contact, tenure, signature, declaration | Versioned form + application case |
| Proof of identity | Accepted ID type/number, expiry, copy if necessary | Restricted document; masked display; retention schedule |
| Proof of ownership/tenure | Title/tax declaration/deed/contract/agency certification as policy permits | Restricted document; verifier outcome |
| Authorization / SPA | Owner and representative identities, scope, validity, signatures | Separate relationship with expiry/revocation |
| HOA/subdivision/LGU clearance | Issuer, reference, date, validity | Requirement rule based on location/work |
| Corporate authority | SEC registration, secretary certificate/board resolution, signatory | Organization account + authorized signatory |
| Tax/customer details | TIN only when required; billing name/address | Field-level access and masking |
| Paperless/alert enrollment | channel, destination, effective date, opt-in/out | Preference history, not bundled consent |
| Complaint/protest | invoice/account, issue, requested remedy, evidence | Service case with SLA and escalation |
| Change/termination request | requested change, effective date, proof/authority | Approval workflow |
| Deposit refund request | account, proof of original deposit if required, destination | Finance approval and refund ledger |

Maynilad publishes a [Customer Authorization Form](https://www.mayniladwater.com.ph/wp-content/uploads/2023/11/Customer-Authorization-Form-1.pdf) with owner/representative signatures, internal validation/approval, termination conditions, and lists of acceptable identification/authority documents. Isabel Waters can reuse the **concept and fields**, but should not copy the form verbatim.

### 4.2 Isabel Waters issues or completes

- Requirements checklist and application acknowledgement/reference
- Document verification checklist
- Site inspection/technical assessment and photos
- Cost estimate/quotation and approval
- Water service agreement/contract and schedule of approved rates/fees
- BIR-compliant Invoice for connection/service charges
- Installation/disconnection/reconnection/meter-replacement work order
- Material issue/return record
- Completion report, meter/seal assignment, initial reading, customer acknowledgement
- Monthly Water Invoice and, when applicable, Service Invoice
- Payment/collection acknowledgement (supplementary document)
- Debit/Credit Memo and adjustment approval
- Notice of Disconnection and proof of delivery
- Request to Accept Payment or equivalent payoff statement for closed accounts
- Complaint acknowledgement, investigation report, and resolution letter
- Account statement/ledger and deposit refund documentation
- Service advisory/interruption notice

## 5. Roles and permissions for Isabel Waters

These are recommended system roles derived from the workflows; they are not a claim that either benchmark company uses these exact job titles.

| Role | Allowed responsibilities | Important restrictions |
|---|---|---|
| Customer / account viewer | View authorized accounts, invoices, payments, cases; update limited contact/preferences; submit requests | Cannot change service class, meter, readings, charges, status, or legal account holder |
| Customer service/front desk | Create applications/cases, scan documents, update non-financial contact data, schedule visits | Cannot approve own exceptions, tariffs, adjustments, or refunds |
| Document verifier | Validate identity, tenure, authority, eligibility | Restricted document access; no billing writes |
| Field inspector | Perform technical survey and recommendation | No commercial approval or payment posting |
| Approver/supervisor | Approve/reject applications, waivers, exceptions | Maker-checker separation; reason required |
| Installer/maintenance crew | Receive work orders; record materials, readings, photos, completion | Cannot originate/approve payable work orders |
| Meter reader | Assigned-route reading capture and exceptions | Cannot change approved prior readings or tariffs |
| Billing officer | Review readings, generate invoice batches, resolve exceptions | Cannot collect cash or unilaterally approve adjustments |
| Billing supervisor | Approve estimated/adjusted readings, rebills, debit/credit memos | High-risk actions audited; thresholds/dual approval |
| Cashier | Take office payments, issue acknowledgement, close shift | Cannot alter invoices, tariffs, or delete/void payments alone |
| Reconciliation/accounting | Reconcile shifts/partners/bank; process approved corrections | Cannot originate and approve same refund/adjustment |
| Collections officer | Delinquency review, notices, payment arrangements | Cannot physically disconnect or alter ledger balances |
| Disconnection/reconnection crew | Execute approved field orders and evidence | Cannot decide eligibility or receive payment |
| Complaint/resolution officer | Investigate and resolve cases within authority | Adjustments require appropriate approval |
| Tariff/config administrator | Maintain approved rates, fees, cycles, templates | Effective dating; no retroactive silent edits; dual approval |
| System administrator | Users, roles, security configuration, integrations | No default access to customer documents or finance transactions |
| Privacy/DPO | Privacy notices, requests, breach/incident oversight, PIA, vendor controls | Independent review; access only as needed |
| Auditor/regulator/manager | Read-only reports, audit logs, SLA and financial summaries | No operational mutation |

Every sensitive action should record actor, role, timestamp, previous/new values, reason, case/work-order reference, device/channel where appropriate, and approval chain.

## 6. Privacy program and Privacy Notice requirements

The [Data Privacy Act of 2012](https://privacy.gov.ph/data-privacy-act-/) requires transparency, legitimate purpose, proportionality, data-subject rights, reasonable organizational/physical/technical security, confidentiality, accountability for processors, and breach handling. The National Privacy Commission also states that organizations processing personal data should appoint a [Data Protection Officer](https://privacy.gov.ph/appointing-a-data-protection-officer/) and conduct a privacy impact assessment for relevant processing/projects.

### 6.1 Privacy Notice sections Isabel Waters needs

1. Identity and contact details of the legal entity/personal information controller and DPO/privacy contact
2. Categories of people and data collected
3. Specific purposes and lawful bases for each purpose
4. Whether a field is required and consequences of not providing it
5. Collection sources: forms, portal, calls, email/SMS/social, field inspection, meter/usage, payment partners
6. Recipients: authorized staff, contractors, payment providers, banks, hosting/communications vendors, regulators/LGUs/law enforcement where lawful
7. Cross-border/cloud processing where applicable
8. Retention periods or objective criteria by record class
9. Security measures at a meaningful, non-sensitive level
10. Data-subject rights and how identity will be verified for a request
11. Complaint route to Isabel Waters and the NPC
12. Automated decisions/profiling, if any
13. Cookies/analytics for the public site/portal
14. Notice version, effective date, and material-change notification method

Do not use consent as a catch-all. Contract/service delivery and legal obligations will often be the appropriate basis for core account/billing processing; optional marketing, nonessential analytics, and some notification choices may need distinct consent or opt-out treatment based on counsel's assessment.

### 6.2 Data and security controls

- Perform a Privacy Impact Assessment before production and whenever major processing changes.
- Keep an inventory/data-flow map and vendor/processor register.
- Minimize ID copies and TIN collection; mask identifiers in screens, logs, exports, and support messages.
- Separate identity, contract account, property, meter, and portal-user data.
- Encrypt in transit and at rest; protect document storage with short-lived authorized access.
- Use least privilege, MFA for staff, strong session controls, account-linking verification, and rate limits.
- Maintain immutable audit logs and security/incident logs; alert on bulk exports and unusual access.
- Define retention by category (applications, contracts, invoices/accounting, payments, IDs, calls, cases, field photos, access logs) and automated disposal holds.
- Provide access/correction/request workflows without allowing erasure that conflicts with lawful accounting, contract, regulatory, or dispute retention.
- Contractually bind processors and assess payment, SMS/email, cloud, support, and field-service vendors.
- Maintain incident response and breach-notification assessment procedures.
- Never expose customer passwords to staff; never store card credentials or mobile-wallet secrets unless a properly scoped compliant processor handles them.

Maynilad's policy is a useful benchmark: it identifies data collected through forms, legal documents, calls, meetings, SMS/email/social and portals; covers service eligibility, delivery, alerts, complaints, and payments; limits access; addresses processors/disclosures, correction, security, and retention; and distinguishes third-party payment processing. See [Maynilad General Privacy Policy](https://www.mayniladwater.com.ph/privacy-policy/).

## 7. Portal Terms and service contract topics

### 7.1 Portal Terms of Use

- Eligibility, account creation, identity/account-link verification, and authority to represent an owner
- Permitted use and prohibited access/scraping/tampering
- Credential/OTP security, reporting compromise, session termination, and account suspension
- Available services and which record controls if portal information differs from the signed/issued official record
- Electronic communications, delivery assumptions, paperless opt-in/out, and contact-data responsibility
- Third-party payment links/processors, fees, posting delay, reversals, refunds, chargebacks, and proof of payment
- User-submitted case evidence and acceptable content
- Availability/maintenance and appropriately drafted disclaimers
- Intellectual property and links
- Privacy Notice incorporation without trying to convert all processing into consent
- Changes, termination, severability, governing Philippine law, venue/dispute route, and contacts

Manila Water's published Terms are a useful issue checklist: acceptable use, protection of validation details, service scope, precedence of the delivered statement over portal balance, third-party payment facilities, security/availability, privacy, IP, suspension, governing law, and authorized-representative enrollment. Do **not** copy broad liability/indemnity language without Philippine counsel and consumer-fairness review. See [MY.MANILAWATER.APP Terms](https://mediafiles.manilawater.com/public/pages/67e0f85018901587e4013222/application-form-mw-app-bor.pdf).

### 7.2 Water Service Agreement / customer contract

This should be separate from portal Terms and cover:

- Parties, service premises, customer class/use, account and meter ownership
- Access for reading, inspection, maintenance, emergency work, and replacement
- Customer duties: protect meter/seal, report leaks/issues, keep access clear, maintain private plumbing, update details
- Rate/fee authority and how approved changes take effect
- Reading, estimated/adjusted billing, due dates, credits, deposits, refunds, and taxes
- Payment allocation and returned/reversed payments
- Billing disputes, meter tests, complaint/escalation process, and provisional payment rules
- Illegal connection/tampering and investigation/due process
- Planned/unplanned interruptions and notices
- Delinquency, notice, disconnection, reconnection, and termination
- Change of owner/occupant/representative and transfer restrictions
- Liability allocation, force majeure, amendments, notices, dispute handling, governing law
- Privacy Notice acknowledgement and necessary data processing (without bundling optional consent)

## 8. Regulatory and tax guardrails

- **Regulator and tariff:** Confirm whether Isabel Waters is an LGU/water district/private operator, its Certificate of Public Convenience/franchise/contract, and whether NWRB, LWUA, an LGU, or another authority approves rates and service rules.
- **Do not copy concession rules:** Manila Water/Maynilad timelines and charges reflect MWSS arrangements. Store policies as effective-dated configuration with an approving resolution/order reference.
- **Invoices:** BIR [RR 7-2024](https://bir-cdn.bir.gov.ph/BIR/pdf/RR%20No.%207-%202024.pdf) made the Invoice the principal sales document and treats Official/Collection/Payment Receipts as supplementary proof of payment. The BIR's [2026 Revenue Regulations page](https://www.bir.gov.ph/2026-Revenue-Regulations) lists RR 6-2026 as amending mandatory invoice information. Obtain current accountant/BIR approval for Invoice, Service Invoice, Credit Memo, and payment acknowledgement templates and for computerized/electronic invoicing obligations.
- **Accounting retention:** RR 7-2024 describes a five-year period for books and accounting records; other legal, audit, contract, dispute, and regulator periods may be longer. Use a reviewed record schedule, not one universal deletion period.
- **Privacy:** Complete DPO, registration/notification if applicable, PIA, processor contracts, rights, retention, incident, and breach processes before collecting production IDs/property documents.
- **Consumer fairness:** Have counsel review deposits, penalties, disputed-bill treatment, disconnection, reconnection, liability limits, venue, electronic-delivery presumptions, and amendment clauses.

## 9. Gap analysis against the current Isabel Waters repository

### Present strengths

- Separate public/customer and staff entry points
- Database-enforced roles and row-level security
- Customer approval state and staff-controlled meter verification
- Tiered, effective-dated rate rows and stored charge lines
- One bill per customer/month and reading monotonicity controls
- Payment ledger/allocation, unique transaction numbering, partial payments, and cashier attribution
- Printable bill, customer history, admin monitoring, and CSV export

### Critical gaps

| Priority | Current gap | Why it matters / target |
|---|---|---|
| P0 | Registration creates a customer record from a self-entered meter number | Split portal signup/account linking from new-service application; staff should assign/verify accounts and meters |
| P0 | Customer, Auth user, contract account, property, and meter are effectively one record/ID | Normalize these entities to support multiple accounts, ownership changes, representatives, meter replacement, and non-email customers |
| P0 | Printed output says “WATER BILL/BILLING STATEMENT” and payment flow uses OR numbering | Replace with accountant-approved Invoice + supplementary payment acknowledgement naming/fields under current BIR rules |
| P0 | No Privacy Notice, Terms, service agreement acceptance, consent/preference history, DPO/request workflow, or retention schedule | Required before real personal documents and customer data are collected |
| P1 | Only `admin`, `cashier`, `customer`; admin is mostly read-only | Add operational roles and maker-checker permissions for verification, reading, billing, adjustment, reconciliation, field work, complaints, config, privacy, and audit |
| P1 | Rates only model water tiers; fixed 14-day due date in UI | Add customer classes, tariff versions, minimum/fixed charges, taxes, discounts, fees, due-date policy, and effective-dated approval source |
| P1 | `previous_balance` is displayed in a new bill while debt remains on original bills | Ensure presentation never double-counts the account total; distinguish carried-forward display from receivable ledger and allocations |
| P1 | No overpayment/customer credit | Support unapplied credit and controlled refund; Maynilad publicly carries overpayments to later bills |
| P1 | No reading route, meter reader, evidence, exception, or Actual/Average/Adjusted state | Add mobile/offline meter-reading workflow and supervisor validation before billing |
| P1 | No adjustments, credit/debit memos, rebilling, void approval, refund, reconciliation, or closeout | Financial records need reversible accounting entries, approval, and settlement controls—not delete/edit |
| P1 | No application documents, inspection, estimate, work orders, inventory/materials, meter/seal lifecycle, or activation | Needed for real new connection and field operations |
| P1 | No complaint/service request/dispute/SLA module | Required for customer care, evidence, escalation, and regulatory reporting |
| P1 | No notices, delivery proof, delinquency workflow, disconnection/reconnection work orders | Physical-service state must follow policy, notice, approval, and field evidence |
| P2 | No notification delivery log, paperless choice, or failed-delivery handling | Add channel preferences, verified destinations, template/version, sent/delivered/failed states, and opt-out history |
| P2 | Manual/claimed GCash reference with no processor settlement integration | Add pending/verified/reconciled/reversed states; never treat a typed reference as settled cash |
| P2 | Browser print only; no archival rendered copy/hash | Preserve the exact issued Invoice version or reproducible immutable snapshot and delivery record |
| P2 | No service-area/route/zone model | Needed for assignments, meter reading, advisories, outages, field work, and reporting |

## 10. Recommended target data model

Core entities:

- `people`, `organizations`, `portal_users`, `account_parties` (relationship/authority)
- `properties/service_premises`, `service_areas`, `routes`, `reading_cycles`
- `contract_accounts`, `service_agreements`, `account_status_history`
- `meters`, `meter_installations`, `meter_seals`, `meter_events`
- `applications`, `requirements`, `application_documents`, `verifications`, `inspections`, `estimates`, `approvals`
- `work_orders`, `work_order_assignments`, `materials`, `completion_evidence`
- `meter_readings`, `reading_exceptions`, `reading_approvals`
- `tariff_schedules`, `rate_components`, `customer_classes`, `discount_eligibility`
- `invoices`, `invoice_lines`, `debit_memos`, `credit_memos`, `adjustments`
- `payments`, `payment_allocations`, `customer_credits`, `refunds`, `settlement_batches`, `cashier_sessions`
- `service_cases`, `complaints`, `case_messages`, `case_evidence`, `sla_events`
- `notices`, `delivery_attempts`, `notification_preferences`, `consent_records`
- `documents`, `retention_classes`, `legal_holds`, `data_subject_requests`
- `users`, `roles`, `permissions`, `approval_rules`, `audit_events`

Important state histories should be append-only/effective-dated. Do not overwrite meter assignments, ownership, tariffs, notices, invoice lines, or posted financial events without a linked correction record.

## 11. Suggested implementation roadmap

### Phase 0 — decisions before more coding

1. Confirm Isabel Waters' legal/regulatory/tax profile and approved rates/fees.
2. Approve operating policies: application, deposits, billing, estimated readings, disputes, payments/credits/refunds, delinquency, disconnection/reconnection, and record retention.
3. Have counsel/accountant approve Privacy Notice, portal Terms, service agreement, application forms, Invoice, payment acknowledgement, notices, and credit/debit memo templates.

### Phase 1 — correct the foundation

1. Separate portal users, people/organizations, premises, contract accounts, and meters.
2. Replace self-claimed meter registration with secure account-link requests and staff verification.
3. Add granular staff roles, permission checks, approvals, and complete audit events.
4. Add document storage metadata, access controls, retention classes, and acceptance/consent versions.

### Phase 2 — field-to-bill operations

1. Service-connection application, requirements, inspection, estimate, approval, work order, meter/seal installation, and activation.
2. Routes/cycles and mobile/offline reading with photo/exceptions and supervisor approval.
3. Configurable tariff components/customer classes and BIR-approved immutable Invoice output.

### Phase 3 — cash and customer care

1. Customer credits, overpayments, refunds, reversals, reconciliation, cashier closeout, and partner settlement.
2. Complaints/service requests, disputed bills, case communications, evidence, SLA, and escalation.
3. Notice delivery, delinquency review, disconnection/reconnection work orders, and field completion.

### Phase 4 — portal and integrations

1. Multi-account portal, e-Invoices, paperless preference, alerts/advisories, case tracking, and secure document download.
2. Verified payment integration with idempotent callbacks and settlement reconciliation.
3. Management/regulatory dashboards for collections, aging, reading exceptions, service levels, complaints, work orders, privacy requests, and audit exceptions.

## 12. Source notes and limitations

- Research prioritizes official Manila Water, Maynilad, MWSS RO, NPC, and BIR materials available publicly as of the research date.
- Public pages do not reveal every internal control, staff title, form, or back-office step. Items labeled “recommended,” “target,” or “implied” are system-design deductions, not claims about confidential company procedures.
- Fees, tariffs, contact information, and program rules change. The system should store effective dates and source/approval documents rather than encode values in frontend code.
- Before launch, validate the proposed process through interviews with Isabel Waters management, cashiering/accounting, meter readers, installers, customer service, legal/privacy, IT/security, and a small set of customers.

