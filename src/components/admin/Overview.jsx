import { Link } from 'react-router-dom'
import { billStatus, dateISOManila, peso, todayISO } from '../../lib/format.js'
import StatCard from '../StatCard.jsx'

export function getSummary(data) {
  const totalBilled = data.bills.reduce((sum, bill) => sum + Number(bill.amount), 0)
  const collected = data.bills.reduce((sum, bill) => sum + Number(bill.amount_paid), 0)
  const outstanding = data.bills.reduce((sum, bill) => sum + Number(bill.balance), 0)
  const today = todayISO()
  return {
    totalBilled, collected, outstanding,
    active: data.customers.filter((customer) => customer.status === 'active').length,
    pending: data.customers.filter((customer) => customer.status === 'pending').length,
    dueToday: data.bills.filter((bill) => bill.due_date === today && Number(bill.balance) > 0).length,
    collectedToday: data.payments.filter((payment) => payment.paid_at && dateISOManila(payment.paid_at) === today).reduce((sum, payment) => sum + Number(payment.amount), 0),
    rate: totalBilled ? collected / totalBilled * 100 : 0,
    paid: data.bills.filter((bill) => billStatus(bill) === 'Paid').length,
    partial: data.bills.filter((bill) => Number(bill.amount_paid) > 0 && Number(bill.balance) > 0).length,
    overdue: data.bills.filter((bill) => billStatus(bill) === 'Overdue').length,
  }
}

export function SummaryCards({ summary }) {
  return <div className="stats-grid"><StatCard label="Total Billed" value={peso(summary.totalBilled)} detail="All recorded bills" /><StatCard label="Collected" value={peso(summary.collected)} tone="green" detail="Payments posted" /><StatCard label="Outstanding" value={peso(summary.outstanding)} tone="orange" detail="Remaining balance" /><StatCard label="Active Customers" value={summary.active} tone="purple" detail="Approved accounts" /></div>
}

export function Snapshot({ summary }) {
  return <section className="panel snapshot-panel"><div className="panel-heading"><div><h2>Collection snapshot</h2></div><p>Live billing overview</p></div><div className="snapshot-list"><div><span>Due today</span><strong>{summary.dueToday}</strong></div><div><span>Collected today</span><strong>{peso(summary.collectedToday)}</strong></div><div><span>Collection rate</span><strong>{summary.rate.toFixed(1)}%</strong></div><div><span>Paid bills</span><strong>{summary.paid}</strong></div><div><span>Partial pays</span><strong>{summary.partial}</strong></div><div><span>Overdue</span><strong>{summary.overdue}</strong></div></div></section>
}
