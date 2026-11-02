import { Link } from 'react-router-dom'
import { AlertCircle, ArrowRight, CheckCircle2, CircleDollarSign, Clock3, Droplets, TrendingUp, Users } from 'lucide-react'
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
  return <div className="stats-grid"><StatCard label="Total Billed" value={peso(summary.totalBilled)} icon={CircleDollarSign} detail="All recorded bills" /><StatCard label="Collected" value={peso(summary.collected)} icon={CheckCircle2} tone="green" detail="Payments posted" /><StatCard label="Outstanding" value={peso(summary.outstanding)} icon={AlertCircle} tone="orange" detail="Remaining balance" /><StatCard label="Active Customers" value={summary.active} icon={Users} tone="purple" detail="Approved accounts" /></div>
}

export function Snapshot({ summary }) {
  return <section className="panel snapshot-panel"><div className="panel-heading"><div><span className="panel-icon"><TrendingUp size={20} /></span><h2>Collection snapshot</h2></div><p>Live billing overview</p></div><div className="snapshot-list"><div><span><Clock3 size={18} /> Due today</span><strong>{summary.dueToday}</strong></div><div><span><CircleDollarSign size={18} /> Collected today</span><strong>{peso(summary.collectedToday)}</strong></div><div><span><Droplets size={18} /> Collection rate</span><strong>{summary.rate.toFixed(1)}%</strong></div><div><span><CheckCircle2 size={18} /> Paid bills</span><strong>{summary.paid}</strong></div><div><span><CircleDollarSign size={18} /> Partial pays</span><strong>{summary.partial}</strong></div><div><span><AlertCircle size={18} /> Overdue</span><strong>{summary.overdue}</strong></div></div></section>
}
