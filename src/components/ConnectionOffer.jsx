import { useEffect,useState } from 'react'
import { supabase } from '../lib/supabaseClient.js'
import { peso,dateLabel } from '../lib/format.js'
import { Notice } from './UI.jsx'

export default function ConnectionOffer({ applicationId,reference,token=null,status,updated }) {
  const [offer,setOffer] = useState(null)
  const [busy,setBusy] = useState(false)
  const [error,setError] = useState('')
  useEffect(()=>{
    let active=true
    supabase.rpc('read_connection_offer',{p_reference:reference,p_token:token}).then(({data,error})=>{
      if(active){setOffer(data?.[0] || null);setError(error?.message || '')}
    })
    return ()=>{active=false}
  },[reference,token,status])
  async function submit(event) {
    event.preventDefault()
    const fields=new FormData(event.currentTarget)
    setBusy(true); setError('')
    try {
      const {error} = offer
        ? await supabase.rpc('accept_connection_offer',{p_reference:reference,p_token:token})
        : await supabase.rpc('issue_connection_offer',{p_application:applicationId,p_amount:fields.get('amount'),p_agreement:fields.get('agreement')})
      if(error) throw error
      updated()
    } catch(err){setError(err.message)}
    finally{setBusy(false)}
  }
  if(!offer && !(applicationId && status==='estimate')) return <Notice type="error">{error}</Notice>
  return <section className="checklist"><h2>Connection estimate</h2><Notice type="error">{error}</Notice><form onSubmit={submit} className="form-stack">
    {offer ? <><strong>{peso(offer.amount)}</strong><p style={{whiteSpace:'pre-wrap'}}>{offer.agreement}</p>
      {offer.accepted_at ? <Notice type="success">Agreement accepted {dateLabel(offer.accepted_at)}</Notice> : status==='approval' &&
      <button className="button" disabled={busy}>{applicationId ? 'Record signed agreement' : 'Accept estimate and agreement'}</button>}</> :
    <><label>Approved connection charges (₱)<input name="amount" type="number" required min="0" step="0.01"/></label>
      <label>Service agreement<textarea name="agreement" required rows="5"/></label>
      <button className="button" disabled={busy}>Issue estimate and agreement</button></>}
  </form></section>
}
