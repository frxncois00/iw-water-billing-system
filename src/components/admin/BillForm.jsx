import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Droplets, RotateCcw, Save } from 'lucide-react'
import { supabase } from '../../lib/supabaseClient.js'
import { tierBreakdown } from '../../lib/tieredBilling.js'
import { errorMessage, peso, todayISO } from '../../lib/format.js'
import { Notice } from '../UI.jsx'

const dueDate = () => { const day = new Date(`${todayISO()}T12:00:00Z`); day.setUTCDate(day.getUTCDate() + 14); return day.toISOString().slice(0, 10) }
const initial = () => ({ customer_id: '', billing_month: todayISO().slice(0, 7), due_date: dueDate(), first_previous_reading: '0', current_reading: '' })

export default function BillForm({ customers, bills, onSaved }) {
  const navigate = useNavigate()
  const [form, setForm] = useState(initial)
  const [search, setSearch] = useState('')
  const [tiers, setTiers] = useState([])
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  useEffect(() => {
    let active = true
    supabase.from('rate_tiers').select('*').eq('is_active', true).lte('effective_from', todayISO()).order('effective_from', { ascending: false }).order('min_m3')
      .then(({ data, error: rateError }) => { if (!active) return; if (rateError) setError(rateError.message); else if (data?.length) setTiers(data.filter((tier) => tier.effective_from === data[0].effective_from)); else setError('No active tiered water rate is configured.') })
    return () => { active = false }
  }, [])
  const eligible = customers.filter((customer) => customer.status === 'active' && `${customer.full_name} ${customer.meter_no}`.toLowerCase().includes(search.toLowerCase()))
  const selected = customers.find((customer) => customer.id === form.customer_id)
  const last = useMemo(() => bills.filter((bill) => bill.customer_id === form.customer_id).sort((a, b) => b.billing_month.localeCompare(a.billing_month))[0], [bills, form.customer_id])
  const previous = last ? Number(last.current_reading) : Number(form.first_previous_reading || 0)
  const usage = form.current_reading === '' ? 0 : Math.max(0, Number(form.current_reading) - previous)
  const breakdown = tierBreakdown(usage, tiers)
  const charge = breakdown.reduce((sum, line) => sum + line.amount, 0)
  const prior = bills.filter((bill) => bill.customer_id === form.customer_id).reduce((sum, bill) => sum + Number(bill.balance), 0)
  const update = (key) => (event) => setForm((current) => ({ ...current, [key]: event.target.value }))
  const save = async (event) => {
    event.preventDefault(); setError('')
    if (!selected || selected.status !== 'active') return setError('Select an active customer.')
    if (!tiers.length) return setError('No active tiered water rate is configured.')
    if (Number(form.current_reading) < previous) return setError('Current reading must be at least the previous reading.')
    const month = `${form.billing_month}-01`
    if (bills.some((bill) => bill.customer_id === selected.id && bill.billing_month === month)) return setError('A bill already exists for this customer and month.')
    setBusy(true)
    const { data: id, error: saveError } = await supabase.rpc('create_bill', { p_customer_id: selected.id, p_billing_month: month, p_due_date: form.due_date, p_current_reading: Number(form.current_reading), p_first_previous_reading: last ? null : previous })
    setBusy(false)
    if (saveError) return setError(saveError.code === '23505' ? 'A bill already exists for this customer and month.' : errorMessage(saveError))
    await onSaved()
    navigate(`/cashier/bills/${id}/print`)
  }
  return <section className="panel bill-form-panel"><div className="panel-heading"><div><span className="panel-icon"><Droplets size={20} /></span><h2>Generate Water Bill</h2></div><p>Tiered water charges</p></div><Notice type="error">{error}</Notice><form className="form-grid" onSubmit={save}><label className="span-2">Search customer<input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Name or meter number" /></label><label className="span-2">Customer<select required value={form.customer_id} onChange={update('customer_id')}><option value="">Select an active customer</option>{eligible.map((customer) => <option key={customer.id} value={customer.id}>{customer.full_name} · {customer.meter_no}</option>)}</select></label><label>Address<input readOnly value={selected?.address || ''} /></label><label>Meter no.<input readOnly value={selected?.meter_no || ''} /></label><label>Billing month<input type="month" required value={form.billing_month} onChange={update('billing_month')} /></label><label>Due date<input type="date" required value={form.due_date} onChange={update('due_date')} /></label><label>Previous reading <span className="label-unit">m³</span><input type="number" min="0" step="0.01" readOnly={!!last} value={last ? last.current_reading : form.first_previous_reading} onChange={update('first_previous_reading')} /></label><label>Current reading <span className="label-unit">m³</span><input type="number" min={previous} step="0.01" required value={form.current_reading} onChange={update('current_reading')} /></label><div className="calculation-box span-2"><span>USAGE</span><strong>{usage.toFixed(2)} m³</strong></div><div className="span-2 tier-preview"><strong>Charge breakdown</strong>{breakdown.map((line) => <div key={line.label}><span>{line.label}{line.rate && ` · ${line.quantity.toFixed(2)} m³ × ${peso(line.rate)}`}</span><strong>{peso(line.amount)}</strong></div>)}<div><span>Water charge</span><strong>{peso(charge)}</strong></div><div><span>Previous unpaid balance</span><strong>{peso(prior)}</strong></div><div><span>Unpaid penalties</span><strong>{peso(0)}</strong></div></div><div className="bill-total span-2"><span>Total due</span><strong>{peso(charge + prior)}</strong></div><div className="form-actions span-2"><button type="button" className="button button-ghost" onClick={() => { setForm(initial()); setError('') }}><RotateCcw size={17} /> Clear form</button><button className="button" disabled={busy || !tiers.length}><Save size={17} /> {busy ? 'Saving…' : 'Save billing'}</button></div></form></section>
}
