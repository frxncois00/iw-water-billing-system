import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { RotateCcw, Save } from 'lucide-react'
import { supabase } from '../../lib/supabaseClient.js'
import { tierBreakdown } from '../../lib/tieredBilling.js'
import { errorMessage, peso, todayISO } from '../../lib/format.js'
import { Notice } from '../UI.jsx'

const dueDate = () => {
  const day = new Date(`${todayISO()}T12:00:00Z`)
  day.setUTCDate(day.getUTCDate() + 14)
  return day.toISOString().slice(0, 10)
}

const initial = () => ({
  customer_id: '', billing_month: todayISO().slice(0, 7), due_date: dueDate(),
  first_previous_reading: '0', current_reading: '', usage_override: '', rate_override: '',
})

export default function BillForm({ customers, bills, onSaved, printBasePath = '/cashier', externalBreakdown = false }) {
  const navigate = useNavigate()
  const [form, setForm] = useState(initial)
  const [search, setSearch] = useState('')
  const [tiers, setTiers] = useState([])
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    let active = true
    supabase.from('rate_tiers').select('*').eq('is_active', true).lte('effective_from', todayISO()).order('effective_from', { ascending: false }).order('min_m3')
      .then(({ data, error: rateError }) => {
        if (!active) return
        if (rateError) setError(rateError.message)
        else if (data?.length) setTiers(data.filter((tier) => tier.effective_from === data[0].effective_from))
        else setTiers([])
      })
    return () => { active = false }
  }, [])

  const eligible = customers.filter((customer) => customer.status === 'active')
  const customerLabel = (customer) => `${customer.full_name} · ${customer.can || customer.meter_no}`
  const chooseCustomer = (event) => {
    const value = event.target.value
    const normalized = value.trim().toLowerCase()
    const match = eligible.find((customer) => {
      const name = customer.full_name?.trim().toLowerCase()
      const meter = customer.meter_no?.trim().toLowerCase()
      const can = customer.can?.trim().toLowerCase()
      return customerLabel(customer).toLowerCase() === normalized || name === normalized || meter === normalized || can === normalized
    })

    setSearch(value)
    setForm((current) => ({
      ...current,
      customer_id: match?.id || '',
      first_previous_reading: String(match?.initial_reading ?? 0),
    }))
  }
  const selected = customers.find((customer) => customer.id === form.customer_id)
  const last = useMemo(() => bills.filter((bill) => bill.customer_id === form.customer_id).sort((a, b) => b.billing_month.localeCompare(a.billing_month))[0], [bills, form.customer_id])
  const previous = last ? Number(last.current_reading) : Number(form.first_previous_reading || 0)
  const meterUsage = form.current_reading === '' ? 0 : Math.max(0, Number(form.current_reading) - previous)
  const hasUsageOverride = form.usage_override !== ''
  const hasRateOverride = form.rate_override !== ''
  const usage = hasUsageOverride ? Math.max(0, Number(form.usage_override)) : meterUsage
  const breakdown = hasRateOverride ? [{ label: 'Custom cubic rate', quantity: usage, rate: Number(form.rate_override), amount: usage * Number(form.rate_override) }] : tierBreakdown(usage, tiers)
  const charge = Math.round(breakdown.reduce((sum, line) => sum + line.amount, 0) * 100) / 100
  const prior = bills.filter((bill) => bill.customer_id === form.customer_id).reduce((sum, bill) => sum + Number(bill.balance), 0)
  const adjusted = hasUsageOverride || hasRateOverride
  const update = (key) => (event) => setForm((current) => ({ ...current, [key]: event.target.value }))
  const reset = () => { setForm(initial()); setSearch(''); setError('') }

  const save = async (event) => {
    event.preventDefault()
    setError('')
    if (!selected || selected.status !== 'active') return setError('Select an active customer.')
    if (!tiers.length && !hasRateOverride) return setError('No active cubic rate is configured. Ask an administrator to add one in Rates & Charges, or enter a justified one-off rate.')
    if (form.current_reading === '' || Number(form.current_reading) < previous) return setError('Current reading must be at least the previous reading.')
    if (hasUsageOverride && Number(form.usage_override) < 0) return setError('Billable usage cannot be negative.')
    if (hasRateOverride && Number(form.rate_override) < 0) return setError('Custom rate cannot be negative.')
    const billingMonth = `${form.billing_month}-01`
    if (bills.some((bill) => bill.customer_id === selected.id && bill.billing_month === billingMonth)) return setError('A bill already exists for this customer and month.')

    setBusy(true)
    const { data: id, error: saveError } = await supabase.rpc('create_staff_bill', {
      p_customer_id: selected.id,
      p_billing_month: billingMonth,
      p_due_date: form.due_date,
      p_current_reading: Number(form.current_reading),
      p_first_previous_reading: last ? null : previous,
      p_usage_m3: hasUsageOverride ? Number(form.usage_override) : null,
      p_rate_per_m3: hasRateOverride ? Number(form.rate_override) : null,
      p_adjustment_note: adjusted ? 'Usage or cubic rate adjusted by staff' : null,
    })
    setBusy(false)
    if (saveError) {
      if (saveError.code === 'PGRST202') return setError('The staff billing adjustment migration has not been applied to Supabase yet.')
      if (/no active water rate is configured/i.test(saveError.message || '')) return setError('Set the approved cubic rate in Admin → Rates & Charges before saving this bill.')
      return setError(saveError.code === '23505' ? 'A bill already exists for this customer and month.' : errorMessage(saveError))
    }
    await onSaved()
    navigate(`${printBasePath}/bills/${id}/print`)
  }

  const breakdownView = <aside className={`${externalBreakdown ? 'panel ' : ''}billing-card bill-breakdown`} aria-labelledby="bill-breakdown-heading">
    <h3 id="bill-breakdown-heading">Water bill breakdown</h3>
    <div className="breakdown-summary"><span>Consumption</span><strong>{usage.toFixed(2)} m³</strong></div>
    <div className="breakdown-summary"><span>Provider</span><strong>Isabel Waters</strong></div>
    <div className="breakdown-lines">
      {breakdown.map((line) => <div key={line.label}><span>{line.label}{line.rate != null && <small>{line.quantity.toFixed(2)} m³ × {peso(line.rate)}</small>}</span><strong>{peso(line.amount)}</strong></div>)}
      <div><span>Water charge</span><strong>{peso(charge)}</strong></div>
      <div><span>Previous unpaid balance</span><strong>{peso(prior)}</strong></div>
      <div><span>Unpaid penalties</span><strong>{peso(0)}</strong></div>
    </div>
    <div className="breakdown-total"><span>Total due{adjusted && <small>Staff adjusted</small>}</span><strong>{peso(charge + prior)}</strong></div>
    <div className="breakdown-summary cost-rate"><span>Effective cost per m³</span><strong>{usage > 0 ? peso(charge / usage) : peso(0)}</strong></div>
  </aside>

  return <><section className="panel bill-form-panel">
    <div className="panel-heading"><div><h2>Generate water bill</h2></div><p>Metered or staff-adjusted billing</p></div>
    <Notice type="error">{error}</Notice>
    <form className="billing-form" onSubmit={save}>
      <div className="form-grid customer-details">
        <label className="span-2">Customer
          <input
            list="billing-customers"
            required
            value={search}
            onChange={chooseCustomer}
            placeholder="Search by customer name, CAN, or meter number"
            autoComplete="off"
          />
          <datalist id="billing-customers">
            {eligible.map((customer) => <option key={customer.id} value={customerLabel(customer)} />)}
          </datalist>
          <small className="field-hint">Type a customer name, CAN, or meter number, then select an active account.</small>
        </label>
      <label>Address<input readOnly value={selected?.address || ''} /></label>
      <label>Meter no.<input readOnly value={selected?.meter_no || ''} /></label>
      </div>
      <div className={`billing-workspace${externalBreakdown ? ' billing-workspace-single' : ''}`}>
        <section className="usage-details" aria-labelledby="usage-details-heading">
          <h3 id="usage-details-heading">Usage details</h3>
          <div className="form-grid">
      <label>Billing month<input type="month" required value={form.billing_month} onChange={update('billing_month')} /></label>
      <label>Due date<input type="date" required value={form.due_date} onChange={update('due_date')} /></label>
      <label>Previous reading <span className="label-unit">m³</span><input type="number" min="0" step="0.01" readOnly={!!last} value={last ? last.current_reading : form.first_previous_reading} onChange={update('first_previous_reading')} /></label>
      <label>Current reading <span className="label-unit">m³</span><input type="number" min={previous} step="0.01" required value={form.current_reading} onChange={update('current_reading')} /></label>
      <div className="calculation-box span-2"><span>METER USAGE</span><strong>{meterUsage.toFixed(2)} m³</strong></div>
      <fieldset className="billing-adjustments span-2">
        <legend>Staff adjustments <span>Optional</span></legend>
        <p>{tiers.length ? `Leave these blank to use meter consumption and the active ${peso(tiers[0].rate_per_m3)} per m³ rate.` : 'No active cubic rate is configured. Enter a one-off rate, or configure one in Rates & Charges.'}</p>
        <div className="form-grid">
          <label>Billable usage <span className="label-unit">m³</span><input type="number" min="0" step="0.01" value={form.usage_override} onChange={update('usage_override')} placeholder={meterUsage.toFixed(2)} /></label>
          <label>One-off rate per m³ <span className="label-unit">PHP</span><input type="number" min="0" step="0.01" value={form.rate_override} onChange={update('rate_override')} placeholder={tiers.length ? `Use active rate (${peso(tiers[0].rate_per_m3)})` : 'Enter rate per m³'} /></label>
        </div>
      </fieldset>
          </div>
        </section>
        {!externalBreakdown && breakdownView}
      </div>
      <div className="form-actions"><button type="button" className="button button-ghost" onClick={reset}><RotateCcw size={17} /> Clear form</button><button className="button" disabled={busy || (!tiers.length && !hasRateOverride)}><Save size={17} /> {busy ? 'Saving…' : 'Save billing'}</button></div>
    </form>
  </section>{externalBreakdown && breakdownView}</>
}
