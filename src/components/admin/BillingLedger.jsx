import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowUpRight, Search } from 'lucide-react'
import { billStatus, monthLabel, peso } from '../../lib/format.js'
import StatusBadge from '../StatusBadge.jsx'
import { EmptyState, Notice } from '../UI.jsx'
import CollectionModal from './CollectionModal.jsx'

export default function BillingLedger({ bills, onPaymentSaved, title = 'Billing ledger', description = 'Track every bill and collect payments.', showSearch = true }) {
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState(null)
  const [success, setSuccess] = useState('')
  const filtered = useMemo(() => bills.filter((bill) => `${bill.customer?.full_name || ''} ${bill.customer?.meter_no || ''} ${bill.bill_no}`.toLowerCase().includes(search.toLowerCase())), [bills, search])
  const saved = async () => { await onPaymentSaved(); setSuccess('Payment recorded. Bill balance and dashboard are updated.') }
  return <section className="panel ledger-panel"><div className="panel-heading ledger-heading"><div><h2>{title}</h2><p>{description}</p></div>{showSearch && <label className="search-field"><Search size={17} /><span className="sr-only">Search bills</span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search name or meter" /></label>}</div><Notice type="success" onClose={() => setSuccess('')}>{success}</Notice>{filtered.length ? <div className="table-scroll"><table><thead><tr><th>Customer</th><th>Meter</th><th>Month</th><th>Usage</th><th>Amount</th><th>Paid</th><th>Balance</th><th>Status</th><th>Action</th></tr></thead><tbody>{filtered.map((bill) => <tr key={bill.id}><td><strong>{bill.customer?.full_name || 'Customer unavailable'}</strong><small>{bill.customer?.address || '—'}</small></td><td>{bill.customer?.meter_no || '—'}</td><td>{monthLabel(bill.billing_month)}</td><td>{Number(bill.water_used).toFixed(2)} m³</td><td className="money-cell">{peso(bill.amount)}</td><td>{peso(bill.amount_paid)}</td><td className="money-cell">{peso(bill.balance)}</td><td><StatusBadge bill={bill} /></td><td><div className="table-actions">{Number(bill.balance) > 0 && <button className="link-button" onClick={() => setSelected(bill)}>Collect</button>}<Link className="link-button" to={`/cashier/bills/${bill.id}/print`}>View/Print <ArrowUpRight size={14} /></Link></div></td></tr>)}</tbody></table></div> : <EmptyState title={bills.length ? 'No matching bills' : 'No bills yet'} description={bills.length ? 'Try another name or meter number.' : 'Generate the first bill using the form above.'} />}{selected && <CollectionModal bill={selected} bills={bills} onClose={() => setSelected(null)} onSaved={saved} />}</section>
}
