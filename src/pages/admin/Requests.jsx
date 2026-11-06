import ConnectionOffer from '../../components/ConnectionOffer.jsx'
import RequestDocuments, { CaseAttachment } from '../../components/RequestDocuments.jsx'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabaseClient.js'
import { Loading, Notice } from '../../components/UI.jsx'
import { dateLabel,errorMessage } from '../../lib/format.js'

const queues = {
  service_applications: { title:'Applications', columns:'applicant_name,service_address,notes', states:['received','requirements_pending','document_review','inspection','estimate','approval','payment','installation','activated','rejected','cancelled'] },
  service_cases: { title:'Concerns', columns:'description,category,location_text,claimed_can,reporter_name,resolution_summary', states:['received','triage','assigned','investigating','waiting','resolved','closed','rejected'] },
}

export default function Requests() {
  const [queue,setQueue] = useState('service_applications')
  return <div className="page-content"><h1>Customer requests</h1><div className="billing-toolbar"><nav aria-label="Request queues">
    {Object.entries(queues).map(([key,q])=><button key={key} className="button button-ghost" aria-pressed={key===queue} onClick={()=>setQueue(key)}>{q.title}</button>)}</nav>
    <Link className="button" to={queue==='service_cases' ? '/concerns' : '/apply'}>Record request</Link></div>
    <RequestQueue key={queue} queue={queue}/></div>
}

function RequestQueue({queue}) {
  const [rows,setRows] = useState(null)
  const [page,setPage] = useState(0)
  const [error,setError] = useState('')
  const [revision,reload] = useState(0)
  useEffect(()=>{
    let active = true
    setRows(null); setError('')
    supabase.from(queue).select('id,reference_no,channel,status,customer_message,contact_no,contact_email,updated_at,' + queues[queue].columns)
      .order('created_at',{ascending:false}).order('id').range(page*25,page*25+24).then(({data,error})=>{
        if(active) { if(error)setError(errorMessage(error)); else setRows(data) }
      })
    return ()=>{active=false}
  },[queue,page,revision])
  return <><Notice type="error">{error}</Notice>{!rows && !error && <Loading/>}
    {rows?.map(row=><RequestRow key={row.id + row.updated_at} row={row} queue={queue} saved={()=>reload(n=>n+1)}/>)}
    {rows?.length===0 && <p>No requests on this page.</p>}
    <div className="billing-toolbar"><button className="button button-ghost" disabled={!page} onClick={()=>setPage(page-1)}>Previous</button><button className="button button-ghost" disabled={rows?.length!==25} onClick={()=>setPage(page+1)}>Next</button></div></>
}

function RequestRow({row,queue,saved}) {
  const [busy,setBusy] = useState(false)
  const [error,setError] = useState('')
  async function update(event) {
    event.preventDefault()
    const fields = new FormData(event.currentTarget)
    const changes = {status:fields.get('status') || row.status,customer_message:fields.get('message')?.trim() || null,updated_at:new Date().toISOString()}
    if(queue==='service_cases') changes.resolution_summary = fields.get('notes')?.trim() || null
    setBusy(true); setError('')
    try {
      if (queue==='service_applications' && changes.status==='activated' && row.status!=='activated') {
        const {error}=await supabase.rpc('activate_application',{p_id:row.id,p_can:fields.get('can'),p_meter:fields.get('meter'),p_reading:fields.get('reading') || null,p_message:changes.customer_message})
        if(error) throw error
        saved(); return
      }
      const {error} = await supabase.from(queue).update(changes).eq('id',row.id).eq('updated_at',row.updated_at).select('id').single()
      if(error) throw error
      saved()
    } catch(err) { setError(errorMessage(err)) }
    finally { setBusy(false) }
  }
  return <details className="queue-row"><summary><strong>{row.reference_no}</strong> · {row.status.replaceAll('_',' ')} · {dateLabel(row.updated_at)}</summary>
    <p>{[row.applicant_name || row.reporter_name,row.service_address || row.location_text,row.claimed_can].filter(Boolean).join(' · ')}</p>
    {row.notes && <p>{row.notes}</p>}
    <p>{[row.channel,row.contact_no,row.contact_email].filter(Boolean).join(' · ')}</p>
    {row.description && <p>{row.category} · {row.description}</p>}
    <form onSubmit={update} className="form-stack"><label>Status<select name="status" disabled={row.status==='activated'} defaultValue={row.status}>{queues[queue].states.filter(s=>s!=='activated' || ['installation','activated'].includes(row.status)).map(state=><option value={state} key={state}>{state.replaceAll('_',' ')}</option>)}</select></label>
      {queue==='service_applications' && row.status==='installation' && <fieldset><legend>Completed installation</legend><label>Issued CAN<input name="can"/></label><label>Installed meter<input name="meter"/></label><label>Initial reading (m³)<input name="reading" type="number" min="0" step="0.01"/></label></fieldset>}
      <label>Update for customer<textarea name="message" maxLength="1500" defaultValue={row.customer_message}/></label>
      {queue==='service_cases' && <label>Resolution notes<textarea name="notes" defaultValue={row.resolution_summary}/></label>}
      <Notice type="error">{error}</Notice><button className="button" disabled={busy}>{busy?'Saving…':'Save update'}</button></form>
    {queue==='service_applications' && <ConnectionOffer applicationId={row.id} reference={row.reference_no} status={row.status} updated={saved}/>}
    {queue==='service_applications' && <RequestDocuments applicationId={row.id} closed={['activated','rejected','cancelled'].includes(row.status)}/>}
    {queue==='service_cases' && <CaseAttachment caseId={row.id} reference={row.reference_no}/>}
  </details>
}
