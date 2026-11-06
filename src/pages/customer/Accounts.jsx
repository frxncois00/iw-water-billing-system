import { useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { Notice } from '../../components/UI.jsx'
import { errorMessage } from '../../lib/format.js'
import { supabase } from '../../lib/supabaseClient.js'

export default function Accounts() {
  const { accounts,refresh } = useOutletContext()
  const [busy,setBusy] = useState(false)
  const [can,setCan] = useState('')
  const [error,setError] = useState('')
  const [notice,setNotice] = useState('')
  async function change(id) {
    setBusy(true); setError(''); setNotice('')
    try {
      const {data,error} = id ? await supabase.rpc('unlink_account',{p_account_id:id}) : await supabase.rpc('link_account_by_can',{p_can:can.trim()})
      if (error) throw error
      await refresh(id ? undefined : data)
      setCan(''); setNotice(id ? 'Account unlinked.' : 'Account linked.')
    } catch(err) { setError(errorMessage(err)) }
    finally { setBusy(false) }
  }
  return <section className="service-form"><h1>Billing accounts</h1>
    <form className="form-stack" onSubmit={e=>{e.preventDefault();change(null)}}>
      <label>Contract account number (CAN)<input required maxLength="32" value={can} onChange={e=>setCan(e.target.value)} /></label>
      <button className="button" disabled={busy}>Link account</button></form>
    <Notice type="error">{error}</Notice><Notice type="success">{notice}</Notice>
    {accounts.map(a=><div className="account-line" key={a.id}><div><strong>{a.can || 'CAN pending'}</strong><p>{a.service_address}</p></div>
      <button className="link-button" disabled={busy || !a.can} onClick={()=>change(a.id)}>Unlink</button></div>)}
  </section>
}
