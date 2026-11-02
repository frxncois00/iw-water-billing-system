import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowUpRight } from 'lucide-react'
import { getOwnBills } from '../../lib/api.js'
import { dateLabel, monthLabel, peso } from '../../lib/format.js'
import StatusBadge from '../../components/StatusBadge.jsx'
import { EmptyState, Loading, Notice, PageHeader } from '../../components/UI.jsx'

export default function MyBills() {
  const [bills, setBills] = useState(null)
  const [error, setError] = useState('')
  useEffect(() => { let active = true; getOwnBills().then((items) => { if (active) setBills(items) }).catch((err) => { if (active) setError(err.message) }); return () => { active = false } }, [])
  return <div className="page-content"><PageHeader eyebrow="BILLING HISTORY" title="My bills" description="View usage, balances, and printable statements." /><Notice type="error">{error}</Notice>{!bills && !error ? <Loading /> : bills && <section className="panel ledger-panel">{bills.length ? <div className="table-scroll"><table><thead><tr><th>Bill no.</th><th>Month</th><th>Usage</th><th>Amount</th><th>Paid</th><th>Balance</th><th>Due date</th><th>Status</th><th>Action</th></tr></thead><tbody>{bills.map((bill) => <tr key={bill.id}><td><strong>{bill.bill_no}</strong></td><td>{monthLabel(bill.billing_month)}</td><td>{Number(bill.water_used).toFixed(2)} m³</td><td>{peso(bill.amount)}</td><td>{peso(bill.amount_paid)}</td><td className="money-cell">{peso(bill.balance)}</td><td>{dateLabel(bill.due_date)}</td><td><StatusBadge bill={bill} /></td><td><Link className="link-button" to={`/customer/bills/${bill.id}/print`}>View/Print <ArrowUpRight size={14} /></Link></td></tr>)}</tbody></table></div> : <EmptyState title="No bills yet" description="Your monthly bills will appear here when staff issues them." />}</section>}</div>
}
