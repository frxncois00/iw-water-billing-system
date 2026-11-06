import { useEffect,useState } from 'react'
import { Link,useLocation } from 'react-router-dom'
import { PublicPage } from './PortalFrame.jsx'
import ConnectionOffer from '../../components/ConnectionOffer.jsx'
import RequestDocuments, { CaseAttachment,encodeFile } from '../../components/RequestDocuments.jsx'
import { Notice } from '../../components/UI.jsx'
import { useAuth } from '../../context/AuthContext.jsx'
import { supabase } from '../../lib/supabaseClient.js'
import { dateLabel,errorMessage } from '../../lib/format.js'

const topics={Leak:'leak','No water':'water_service','Low pressure':'water_service',Billing:'billing',Other:'general'}
const otherTypes={general:'General inquiry',payment:'Payment',meter:'Meter',application:'Application follow-up',account:'Account access',privacy:'Privacy',other:'Other'}
const channels={online:'Online',walk_in:'Walk-in',phone:'Phone',email:'Email',other:'Other'}
const documents=['Government ID','Proof of ownership or lease']

export function RequestForm({application=false,connectionChange=false}) {
  const { user,profile,role }=useAuth()
  const staff=['admin','cashier'].includes(role)
  const location=useLocation()
  const [topic,setTopic]=useState(location.state?.topic in topics ? location.state.topic : 'Leak')
  const [step,setStep]=useState(0)
  const [busy,setBusy]=useState(false)
  const [error,setError]=useState('')
  const [receipt,setReceipt]=useState(null)
  const [pending,setPending]=useState([])
  const [accounts,setAccounts]=useState([])
  useEffect(()=>{
    let active=true
    if (user && !staff && !application) supabase.from('contract_accounts').select('can').then(({data})=>{if(active)setAccounts(data || [])})
    return ()=>{active=false}
  },[user,staff,application])

  async function upload(files,codes){
    const failed=[]
    for(const [label,file] of files){
      try {
        const {error}=await supabase.rpc('submit_intake_document',{p_reference:codes.reference_no,p_token:codes.tracking_token,p_label:label,p_type:file.type,p_content:await encodeFile(file)})
        if(error) throw error
      } catch { failed.push([label,file]) }
    }
    setPending(failed)
    if(failed.length) setError('Your application was received. These files were not attached: '+failed.map(([name])=>name).join(', ')+'. Retry or bring them to the office.')
  }
  async function submit(event){
    event.preventDefault()
    if(busy)return
    const fields=new FormData(event.currentTarget)
    const value=key=>String(fields.get(key) || '').trim()
    setError('')
    if(application){
      const inputs=event.currentTarget.querySelectorAll('.step-fields:not([hidden]) input')
      if(Array.from(inputs).some(input=>!input.reportValidity()))return
    }
    if(application && step<2){
      if(step===0 && !value('address'))return setError('Enter the service address.')
      if(step===1 && (!value('name') || (!value('phone')&&!value('email'))))return setError('Enter a name and a phone number or email.')
      setStep(step+1);return
    }
    const files=application?documents.map(label=>[label,fields.get(label)]).filter(([,f])=>f?.name):[]
    if(files.some(([,f])=>f.size>2097152 || !['application/pdf','image/png','image/jpeg'].includes(f.type)))return setError('Choose a PDF, JPEG or PNG no larger than 2 MB.')
    setBusy(true)
    try {
      const params={p_channel:staff?value('channel'):'online',p_name:value('name')||null,p_phone:value('phone')||null,p_email:value('email')||null}
      const {data,error}=application
        ? await supabase.rpc('submit_service_application',{...params,p_address:value('address'),p_notes:[value('type'),value('landmark')].filter(Boolean).join(' · ')})
        : await supabase.rpc('submit_service_case',{...params,p_category:connectionChange?'account':topic==='Other'?value('otherType'):topics[topic],p_description:[connectionChange?value('requestType'):topic,value('description')].filter(Boolean).join(': '),p_location:value('location')||null,p_can:value('can')||null})
      if(error)throw error
      setReceipt(data[0])
      if(files.length)await upload(files,data[0])
    }catch(err){setError(errorMessage(err))}finally{setBusy(false)}
  }
  const title=application?'Apply for a new connection':connectionChange?'Reconnection or disconnection':'Report a concern'
  const intro=application?'Start with your property, contact details, and any available documents.':connectionChange?'Request restoration or a temporary or permanent disconnection.':'Report a leak, low pressure, or a billing issue. No login is required.'
  const channel=staff && <label>Received through<select name="channel">{Object.entries(channels).map(([v,label])=><option key={v} value={v}>{label}</option>)}</select></label>
  const contact=<><label>Phone<input name="phone" type="tel" maxLength="40"/></label><label>Email<input name="email" type="email" maxLength="254" defaultValue={!staff?user?.email:''}/></label></>
  return <PublicPage title={title} intro={intro}><div className="two">
    {receipt ? <section className="ok"><h2>{application?'Application received':'Request received'}</h2><p>Save both codes to track your request.</p>
      <dl className="reference"><dt>Reference number</dt><dd>{receipt.reference_no}</dd><dt>Tracking code</dt><dd>{receipt.tracking_token}</dd></dl>
      {!application && <CaseAttachment reference={receipt.reference_no} token={receipt.tracking_token}/>}
      <Notice type="error">{error}</Notice>{pending.length>0 && <button type="button" className="btn ghost" disabled={busy} onClick={async()=>{setBusy(true);setError('');try{await upload(pending,receipt)}finally{setBusy(false)}}}>Retry attachments</button>}
      <div className="row"><Link className="btn" to="/track" state={receipt}>Track this request</Link></div></section> :
    <form onSubmit={submit} noValidate={application} className="iw-card">{channel}
      {application ? <><div className="stepper">{['Property','You','Documents'].map((label,i)=><span key={label} className={i===step?'on':i<step?'done':''} aria-current={i===step?'step':undefined}>{i+1} {label}</span>)}</div>
        <fieldset hidden={step!==0} className="step-fields"><label>Connection type<select name="type"><option>Residential</option><option>Commercial</option><option>Institutional</option></select></label>
          <label>Property address<input name="address" maxLength="500" required={step===0}/></label><label>Nearest landmark (optional)<input name="landmark" maxLength="500"/></label></fieldset>
        <fieldset hidden={step!==1} className="step-fields"><label>Full name<input name="name" autoComplete="name" required={step===1} maxLength="160" defaultValue={!staff?profile?.full_name:''}/></label><p className="hint">Provide a phone number or email for follow-up.</p>{contact}</fieldset>
        <fieldset hidden={step!==2} className="step-fields">{documents.map(label=><label key={label}>{label} (optional)<input type="file" name={label} accept="application/pdf,image/jpeg,image/png"/></label>)}<p className="hint">PDF or image, up to 2 MB each. You may also bring documents to the office.</p></fieldset>
      </> : <>
        {connectionChange ? <label>Request type<select name="requestType"><option>Reconnection after payment</option><option>Temporary disconnection</option><option>Permanent disconnection</option></select></label> :
        <><label id="topic-label">What is it about?</label><div className="chips" role="group" aria-labelledby="topic-label">{Object.keys(topics).map(label=><button type="button" className="chip" key={label} aria-pressed={topic===label} onClick={()=>setTopic(label)}>{label}</button>)}</div>
          {topic==='Other' && <label>Type<select name="otherType">{Object.entries(otherTypes).map(([id,label])=><option key={id} value={id}>{label}</option>)}</select></label>}
          <label>Location or nearest landmark<input name="location" maxLength="500"/></label></>}
        <label>CAN {connectionChange?'':'(optional)'}<input required={connectionChange} name="can" inputMode="numeric" pattern="[0-9]{9}" minLength="9" maxLength="9" placeholder="583104927" list="known-cans"/></label><datalist id="known-cans">{accounts.filter(a=>a.can).map(a=><option key={a.can}>{a.can}</option>)}</datalist>
        <label>{connectionChange?'Reason or notes':'Details'}<textarea name="description" required={!connectionChange} maxLength="2700" rows="4"/></label>
        <label>Name (optional)<input name="name" maxLength="160" defaultValue={!staff?profile?.full_name:''}/></label><p className="hint">Leave contact details if you want a reply.</p>{contact}</>}
      <Notice type="error">{error}</Notice><div className="row">
        {application && step>0 && <button type="button" className="btn ghost" disabled={busy} onClick={()=>{setStep(step-1);setError('')}}>Back</button>}
        <button className="btn aq" disabled={busy}>{busy?'Sending…':application?step===2?'Submit application':'Continue':connectionChange?'Send request':'Send report'}</button></div>
    </form>}
    <aside className="aside">{application?<><b>Before you start</b><p>Have your property address and contact information ready.</p><b>Fees</b><p>The office prepares a connection estimate after inspection.</p></>:connectionChange?<><b>Service changes</b><p>The office reviews your request and confirms the next steps before field work.</p></>:<><b>Burst main or flooding?</b><p>Select Leak and include the exact spot or a nearby landmark.</p></>}</aside>
  </div></PublicPage>
}

export function TrackRequest() {
  const { state } = useLocation()
  const [result,setResult] = useState(null)
  const [error,setError] = useState('')
  const [busy,setBusy] = useState(false)
  async function track(event) {
    event.preventDefault()
    const fields = new FormData(event.currentTarget)
    setError(''); setResult(null); setBusy(true)
    try {
      const {data,error} = await supabase.rpc('track_public_request',{p_reference:fields.get('reference').trim().toUpperCase(),p_token:fields.get('token').trim()})
      if (error?.code === '22P02' || (!error && !data?.length)) throw new Error('No matching request. Check both codes.')
      if (error) throw error
      const update = await supabase.rpc('request_message',{p_reference:fields.get('reference').trim().toUpperCase(),p_token:fields.get('token').trim()})
      if(update.error) throw update.error
      setResult({...data[0],...update.data?.[0],reference:fields.get('reference').trim().toUpperCase(),token:fields.get('token').trim()})
    } catch(err) { setError(errorMessage(err)) }
    finally { setBusy(false) }
  }
  return <PublicPage title="Track a request" intro="Enter the reference number and private tracking code you received when you applied or sent a report."><section className="iw-card"><form className="form-stack" onSubmit={track} onChange={()=>setResult(null)}>
    <label>Reference number<input name="reference" required defaultValue={state?.reference_no}/></label>
    <label>Tracking code<input name="token" required autoComplete="off" defaultValue={state?.tracking_token}/></label>
    <button className="button" disabled={busy}>{busy ? 'Checking…' : 'Check status'}</button></form>
    <Notice type="error">{error}</Notice>{result && <div className="tracking-result" role="status"><h2>{result.reference}</h2><ul className="tl"><li className="c"><b>{result.current_status.replaceAll('_',' ')}</b><small>{result.request_type}</small></li></ul><p>Updated {dateLabel(result.updated_at)}</p>{result.message && <p>{result.message}</p>}{result.issued_can && <p>Issued CAN · {result.issued_can}</p>}</div>}
    {result?.request_type==='concern' && !['resolved','closed','rejected'].includes(result.current_status) && <CaseAttachment reference={result.reference} token={result.token}/>}
    {result?.request_type==='application' && <ConnectionOffer reference={result.reference} token={result.token} status={result.current_status} updated={()=>setResult(prev=>({...prev,current_status:'payment',updated_at:new Date().toISOString()}))}/>}
    {result?.request_type==='application' && <RequestDocuments reference={result.reference} token={result.token} closed={['activated','cancelled','rejected'].includes(result.current_status)}/>}
  </section></PublicPage>
}
