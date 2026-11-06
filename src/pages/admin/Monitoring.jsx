import { useMemo, useState } from 'react'
import { Download } from 'lucide-react'
import { useAdminData } from '../../hooks/useAdminData.js'
import { billStatus, dateISOManila, dateLabel, monthLabel, peso, todayISO } from '../../lib/format.js'
import { EmptyState, Loading, Notice, PageHeader } from '../../components/UI.jsx'
import StatCard from '../../components/StatCard.jsx'
import StatusBadge from '../../components/StatusBadge.jsx'

const csvCell = (value) => `"${String(value ?? '').replace(/^[\s]*[=+\-@]/, "'$&").replaceAll('"', '""')}"`
function exportCsv(rows) {
  const columns = ['Date', 'Bill no.', 'Customer', 'Cashier / Staff', 'Amount', 'Method', 'Reference', 'Bill status']
  const content = [columns, ...rows.map(({ payment, bill, customer, cashier }) => [payment.paid_at, bill?.bill_no, customer?.full_name, cashier?.full_name || cashier?.email, payment.amount, payment.method, payment.reference_no, bill ? billStatus(bill) : ''])]
    .map((row) => row.map(csvCell).join(',')).join('\r\n')
  const link = document.createElement('a')
  link.href = URL.createObjectURL(new Blob(['\uFEFF', content], { type: 'text/csv;charset=utf-8' }))
  link.download = `isabel-waters-payments-${todayISO()}.csv`
  link.click()
  URL.revokeObjectURL(link.href)
}

export default function Monitoring() {
  const { data, loading, error, refresh } = useAdminData()
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [cashierId, setCashierId] = useState('')
  const [status, setStatus] = useState('')
  const [period, setPeriod] = useState('daily')
  const view = useMemo(() => {
    if (!data) return null
    const bills = new Map(data.bills.map((bill) => [bill.id, bill]))
    const customers = new Map(data.customers.map((customer) => [customer.id, customer]))
    const profiles = new Map(data.profiles.map((profile) => [profile.id, profile]))
    const cashiers = data.profiles.filter((profile) => profile.role === 'cashier')
    const payments = data.payments.map((payment) => {
      const bill = bills.get(payment.bill_id)
      return { payment, bill, customer: customers.get(bill?.customer_id), cashier: profiles.get(payment.collected_by) }
    }).filter(({ payment, bill }) => (!from || dateISOManila(payment.paid_at) >= from) && (!to || dateISOManila(payment.paid_at) <= to) && (!cashierId || payment.collected_by === cashierId) && (!status || (bill && billStatus(bill).toLowerCase() === status)))
    const billed = data.bills.reduce((sum, bill) => sum + Number(bill.amount), 0)
    const collected = data.payments.reduce((sum, payment) => sum + Number(payment.amount), 0)
    const outstanding = data.bills.reduce((sum, bill) => sum + Number(bill.balance), 0)
    const totals = cashiers.map((cashier) => {
      const own = data.payments.filter((payment) => payment.collected_by === cashier.id)
      return { cashier, amount: own.reduce((sum, payment) => sum + Number(payment.amount), 0), count: own.length, latest: own[0]?.paid_at }
    }).sort((a, b) => b.amount - a.amount)
    const trend = new Map()
    for (const { payment } of payments) {
      const key = dateISOManila(payment.paid_at).slice(0, period === 'daily' ? 10 : 7)
      trend.set(key, (trend.get(key) || 0) + Number(payment.amount))
    }
    const chart = [...trend].sort(([a], [b]) => a.localeCompare(b)).slice(-12)
    const overdue = data.bills.filter((bill) => Number(bill.balance) > 0 && bill.due_date < todayISO())
    const statuses = ['Paid', 'Partial', 'Unpaid'].map((label) => ({ label, count: data.bills.filter((bill) => bill.status === label.toLowerCase()).length }))
    return { cashiers, payments, billed, collected, outstanding, totals, chart, overdue, statuses }
  }, [data, from, to, cashierId, status, period])

  return <div className="page-content admin-monitor"><PageHeader eyebrow="ADMIN MONITORING" title="Collection overview" description="Billing, payments, and Cashier / Staff activity across all accounts." />
    <Notice type="error">{error}</Notice>{error && <button className="button button-ghost" onClick={refresh}>Retry</button>}
    {loading && !data ? <Loading /> : view && <>
      <div className="stats-grid"><StatCard label="Total billed" value={peso(view.billed)} detail="All bills" /><StatCard label="Total collected" value={peso(view.collected)} detail="All payments" tone="green" /><StatCard label="Outstanding" value={peso(view.outstanding)} detail="Remaining balance" tone="orange" /><StatCard label="Collection rate" value={`${view.billed ? (view.collected / view.billed * 100).toFixed(1) : '0.0'}%`} detail="Collected ÷ billed" tone="purple" /></div>
      <div className="monitor-grid"><section className="panel monitor-panel"><div className="panel-heading"><div><h2>Collections over time</h2></div><select aria-label="Chart period" value={period} onChange={(event) => setPeriod(event.target.value)}><option value="daily">Daily</option><option value="monthly">Monthly</option></select></div>{view.chart.length ? <div className="bar-chart">{view.chart.map(([label, amount]) => <div className="bar-column" key={label} title={`${label}: ${peso(amount)}`}><span>{peso(amount)}</span><div style={{ height: `${Math.max(6, amount / Math.max(...view.chart.map(([, value]) => value)) * 100)}%` }} /><small>{label}</small></div>)}</div> : <EmptyState title="No payments in this range" />}</section>
      <section className="panel monitor-panel"><h2>Bill status</h2><div className="status-bars">{view.statuses.map(({ label, count }) => <div key={label}><span>{label} <strong>{count}</strong></span><div><i className={`status-${label.toLowerCase()}`} style={{ width: `${data.bills.length ? count / data.bills.length * 100 : 0}%` }} /></div></div>)}</div><p className="muted">Status reflects each bill's current balance.</p></section></div>
      <section className="panel monitor-panel"><h2>Per-cashier collections</h2>{view.totals.length ? <div className="table-scroll"><table><thead><tr><th>Cashier</th><th>Payments</th><th>Collected</th><th>Latest collection</th></tr></thead><tbody>{view.totals.map(({ cashier, count, amount, latest }) => <tr key={cashier.id}><td><strong>{cashier.full_name || cashier.email}</strong><small>{cashier.email}</small></td><td>{count}</td><td>{peso(amount)}</td><td>{latest ? dateLabel(latest) : '—'}</td></tr>)}</tbody></table></div> : <EmptyState title="No cashier accounts" />}</section>
      <section className="panel monitor-panel"><div className="panel-heading"><div><h2>Transaction history</h2><p>{view.payments.length} matching payments</p></div><button className="button button-ghost" onClick={() => exportCsv(view.payments)}><Download size={16} /> Export CSV</button></div><div className="monitor-filters"><label>From<input type="date" value={from} onChange={(event) => setFrom(event.target.value)} /></label><label>To<input type="date" value={to} onChange={(event) => setTo(event.target.value)} /></label><label>Cashier<select value={cashierId} onChange={(event) => setCashierId(event.target.value)}><option value="">All cashiers</option>{view.cashiers.map((cashier) => <option value={cashier.id} key={cashier.id}>{cashier.full_name || cashier.email}</option>)}</select></label><label>Bill status<select value={status} onChange={(event) => setStatus(event.target.value)}><option value="">All statuses</option><option value="paid">Paid</option><option value="partial">Partial</option><option value="unpaid">Unpaid</option><option value="overdue">Overdue</option></select></label></div>{view.payments.length ? <div className="table-scroll"><table><thead><tr><th>Date</th><th>Customer / bill</th><th>Cashier</th><th>Amount</th><th>Method</th><th>Status</th></tr></thead><tbody>{view.payments.map(({ payment, bill, customer, cashier }) => <tr key={payment.id}><td>{dateLabel(payment.paid_at)}</td><td><strong>{customer?.full_name || 'Unknown customer'}</strong><small>{bill?.bill_no || payment.bill_id}</small></td><td>{cashier?.full_name || cashier?.email || 'Legacy / unknown'}</td><td>{peso(payment.amount)}</td><td>{payment.method}{payment.reference_no && <small>{payment.reference_no}</small>}</td><td>{bill && <StatusBadge bill={bill} />}</td></tr>)}</tbody></table></div> : <EmptyState title="No matching transactions" />}</section>
      <section className="panel monitor-panel"><h2>Overdue accounts</h2>{view.overdue.length ? <div className="table-scroll"><table><thead><tr><th>Customer</th><th>Bill</th><th>Due date</th><th>Balance</th></tr></thead><tbody>{view.overdue.map((bill) => <tr key={bill.id}><td><strong>{bill.customer?.full_name || 'Unknown customer'}</strong><small>{bill.customer?.meter_no}</small></td><td>{monthLabel(bill.billing_month)}</td><td>{dateLabel(bill.due_date)}</td><td>{peso(bill.balance)}</td></tr>)}</tbody></table></div> : <EmptyState title="No overdue accounts" />}</section>
      <section className="panel monitor-panel"><h2>Customers</h2><div className="table-scroll"><table><thead><tr><th>Name</th><th>Meter</th><th>Address</th><th>Status</th></tr></thead><tbody>{data.customers.map((customer) => <tr key={customer.id}><td>{customer.full_name}</td><td>{customer.meter_no}</td><td>{customer.address}</td><td><StatusBadge status={customer.status} /></td></tr>)}</tbody></table></div></section>
    </>}
  </div>
}
