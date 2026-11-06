import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../../lib/supabaseClient.js'
import { dateLabel, errorMessage, peso, todayISO } from '../../lib/format.js'
import { EmptyState, Loading, Notice, PageHeader } from '../../components/UI.jsx'

export default function RatesCharges() {
  const [rates,setRates] = useState(null)
  const [logs,setLogs] = useState([])
  const [error,setError] = useState('')
  const [busy,setBusy] = useState(false)
  const [usage,setUsage] = useState('20')
  const [form,setForm] = useState({rate:'',effective_from:todayISO(),reason:''})

  async function load() {
    setError('')
    const [rateResult,logResult] = await Promise.all([
      supabase.from('rate_tiers').select('*').eq('min_m3',0).is('max_m3',null).is('fixed_charge',null).order('effective_from',{ascending:false}),
      supabase.from('rate_change_log').select('*').order('created_at',{ascending:false}).limit(50),
    ])
    if(rateResult.error) setError(errorMessage(rateResult.error))
    else setRates(rateResult.data || [])
    if(!logResult.error) setLogs(logResult.data || [])
  }
  useEffect(()=>{load()},[])
  const active = useMemo(()=>rates?.find(rate=>rate.is_active && rate.effective_from<=todayISO()),[rates])
  const previewRate = form.rate === '' ? Number(active?.rate_per_m3 || 0) : Number(form.rate || 0)
  const previewUsage = Math.max(0,Number(usage || 0))

  async function save(event) {
    event.preventDefault();setBusy(true);setError('')
    const {error:saveError}=await supabase.rpc('set_cubic_rate',{p_rate:Number(form.rate),p_effective_from:form.effective_from,p_reason:form.reason.trim()})
    setBusy(false)
    if(saveError) return setError(saveError.code==='PGRST202'?'Apply the single cubic rate migration to Supabase first.':errorMessage(saveError))
    setForm({rate:'',effective_from:todayISO(),reason:''});await load()
  }

  return <div className="page-content rates-page"><PageHeader eyebrow="BILLING CONFIGURATION" title="Rates & charges" description="Set the cubic-meter rate used automatically for new water bills." />
    <Notice type="error">{error}</Notice>{rates===null&&!error?<Loading/>:<>
      <div className="rates-layout"><section className="panel rate-editor"><div className="panel-heading"><div><h2>Active cubic rate</h2><p>One rate applies to every bill unless staff records an override.</p></div></div>
        <div className="active-rate"><span>Current approved rate</span><strong>{active?`${peso(active.rate_per_m3)} / m³`:'Not configured'}</strong><small>{active?`Effective ${dateLabel(active.effective_from)}`:'Billing is blocked until an approved rate is added.'}</small></div>
        <form className="form-stack" onSubmit={save}><label>New rate per m³<input required type="number" min="0" step="0.01" value={form.rate} onChange={e=>setForm({...form,rate:e.target.value})} placeholder="Enter approved cubic rate" /></label><label>Effective date<input required type="date" value={form.effective_from} onChange={e=>setForm({...form,effective_from:e.target.value})}/></label><label>Reason for change<textarea required minLength="3" maxLength="500" value={form.reason} onChange={e=>setForm({...form,reason:e.target.value})} placeholder="State the approval or reason for this rate" /></label><button className="button" disabled={busy}>{busy?'Saving…':'Save cubic rate'}</button></form>
      </section><aside className="panel rate-preview"><h2>Calculation preview</h2><label>Sample consumption <span className="label-unit">m³</span><input type="number" min="0" step="0.01" value={usage} onChange={e=>setUsage(e.target.value)}/></label><div><span>Consumption</span><strong>{previewUsage.toFixed(2)} m³</strong></div><div><span>Rate per m³</span><strong>{peso(previewRate)}</strong></div><div className="preview-total"><span>Estimated water charge</span><strong>{peso(previewUsage*previewRate)}</strong></div><p>No minimum charge or consumption tiers are applied.</p></aside></div>
      <section className="panel rate-history"><div className="panel-heading"><div><h2>Rate history</h2><p>Issued bills keep the amount calculated when they were created.</p></div></div>{logs.length?<div className="table-scroll"><table><thead><tr><th>Effective date</th><th>Rate</th><th>Reason</th><th>Changed by</th><th>Recorded</th></tr></thead><tbody>{logs.map(log=><tr key={log.id}><td>{dateLabel(log.effective_from)}</td><td><strong>{peso(log.rate_per_m3)} / m³</strong></td><td>{log.reason}</td><td>Administrator</td><td>{dateLabel(log.created_at)}</td></tr>)}</tbody></table></div>:<EmptyState title="No approved rate changes yet" description="Save the first cubic rate to begin the history."/>}</section>
    </>}</div>
}
