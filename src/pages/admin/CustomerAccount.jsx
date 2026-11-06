import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'
import { ArrowLeft, ArrowUpRight } from 'lucide-react'
import { useAdminData } from '../../hooks/useAdminData.js'
import { supabase } from '../../lib/supabaseClient.js'
import { billStatus, dateLabel, monthLabel, peso } from '../../lib/format.js'
import { EmptyState, Loading, Notice } from '../../components/UI.jsx'
import StatusBadge from '../../components/StatusBadge.jsx'
import TablePagination, { useTablePagination } from '../../components/TablePagination.jsx'

export default function CustomerAccount() {
  const { id } = useParams()
  const location = useLocation()
  const { data, loading, error } = useAdminData()
  const customer = data?.customers.find((row) => row.id === id)
  const bills = useMemo(() => (data?.bills || []).filter((bill) => bill.customer_id === id), [data, id])
  const [selectedId, setSelectedId] = useState('')
  const [items, setItems] = useState([])
  const [itemError, setItemError] = useState('')
  const pagination = useTablePagination(bills, 10, [id])
  const selected = bills.find((bill) => bill.id === selectedId) || bills[0]
  const base = location.pathname.startsWith('/admin') ? '/admin' : '/cashier'

  useEffect(() => { setSelectedId(bills[0]?.id || '') }, [id, bills[0]?.id])
  useEffect(() => {
    if (!selected?.id) { setItems([]); return }
    let active = true
    setItemError('')
    supabase.from('bill_items').select('*').eq('bill_id', selected.id).order('id').then(({ data: rows, error: loadError }) => {
      if (!active) return
      if (loadError) setItemError(loadError.message)
      else setItems(rows || [])
    })
    return () => { active = false }
  }, [selected?.id])

  if (loading && !data) return <div className="page-content"><Loading /></div>
  if (!customer) return <div className="page-content"><h1>Service account not found</h1><Link className="button button-ghost" to={`${base}/customers`}><ArrowLeft size={16} /> Back to customers</Link></div>

  return <div className="page-content customer-account-page">
    <Link className="back-link" to={`${base}/customers`}><ArrowLeft size={16} /> Customers & service accounts</Link>
    <Notice type="error">{error}</Notice>
    <section className="panel account-information" aria-labelledby="account-information-heading">
      <div className="account-information-heading"><div><h1 id="account-information-heading">{customer.full_name}</h1><p>Contact and connection details recorded for this account.</p></div><StatusBadge status={customer.status} /></div>
      <dl className="account-information-grid">
        <div><dt>Customer account number</dt><dd>{customer.can || 'Not assigned'}</dd></div>
        <div><dt>Property type</dt><dd>{customer.property_type || 'Not recorded'}</dd></div>
        <div><dt>Active mobile number</dt><dd>{customer.mobile_no || 'Not recorded'}</dd></div>
        <div><dt>Email address</dt><dd>{customer.email || 'Not recorded'}</dd></div>
        <div className="account-info-wide"><dt>Service address</dt><dd>{customer.address || 'Not recorded'}</dd></div>
        <div><dt>Meter number</dt><dd>{customer.meter_no || 'Not recorded'}</dd></div>
        <div><dt>Installation reading</dt><dd>{customer.initial_reading != null ? `${Number(customer.initial_reading).toFixed(2)} m³` : 'Not recorded'}</dd></div>
      </dl>
    </section>
    <div className="customer-billing-layout">
      <section className="panel customer-bill-history"><div className="panel-heading"><div><h2>Past billings</h2><p>Select a bill to view its complete information.</p></div></div>{bills.length ? <><div className="table-scroll"><table><thead><tr><th>Billing month</th><th>Bill no.</th><th>Usage</th><th>Amount</th><th>Balance</th><th>Status</th></tr></thead><tbody>{pagination.visibleRows.map((bill) => <tr className={`clickable-row ${selected?.id === bill.id ? 'selected-row' : ''}`} key={bill.id} tabIndex="0" onClick={() => setSelectedId(bill.id)} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') setSelectedId(bill.id) }}><td><strong>{monthLabel(bill.billing_month)}</strong></td><td>{bill.bill_no}</td><td>{Number(bill.usage_m3 ?? bill.water_used).toFixed(2)} m³</td><td>{peso(bill.amount)}</td><td>{peso(bill.balance)}</td><td><StatusBadge bill={bill} /></td></tr>)}</tbody></table></div><TablePagination {...pagination} total={bills.length} /></> : <EmptyState title="No billing history" description="This service account has no issued bills yet." />}</section>
      <aside className="panel selected-bill-panel">{selected ? <><div className="selected-bill-heading"><div><span>Selected billing</span><h2>{monthLabel(selected.billing_month)}</h2><p>{selected.bill_no}</p></div><StatusBadge bill={selected} /></div><dl className="bill-info-list"><div><dt>Previous reading</dt><dd>{Number(selected.previous_reading).toFixed(2)} m³</dd></div><div><dt>Current reading</dt><dd>{Number(selected.current_reading).toFixed(2)} m³</dd></div><div><dt>Consumption</dt><dd>{Number(selected.usage_m3 ?? selected.water_used).toFixed(2)} m³</dd></div><div><dt>Due date</dt><dd>{dateLabel(selected.due_date)}</dd></div></dl><Notice type="error">{itemError}</Notice><div className="bill-item-list"><h3>Charge details</h3>{items.map((item) => <div key={item.id}><span>{item.description}{item.unit_rate != null && <small>{Number(item.quantity || 0).toFixed(2)} m³ × {peso(item.unit_rate)}</small>}</span><strong>{peso(item.amount)}</strong></div>)}<div><span>Water charge</span><strong>{peso(selected.water_charge ?? selected.amount)}</strong></div><div><span>Previous balance</span><strong>{peso(selected.previous_balance)}</strong></div><div><span>Amount paid</span><strong>- {peso(selected.amount_paid)}</strong></div></div><div className="selected-bill-total"><span>Current balance</span><strong>{peso(selected.balance)}</strong></div><Link className="button button-full" to={`${base}/bills/${selected.id}/print`}>View or export PDF <ArrowUpRight size={16} /></Link></> : <EmptyState title="Select a billing" />}</aside>
    </div>
  </div>
}
