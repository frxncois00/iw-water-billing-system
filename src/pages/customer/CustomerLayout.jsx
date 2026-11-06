import { useCallback, useEffect, useState } from 'react'
import { Link, NavLink, Outlet } from 'react-router-dom'
import { ServiceShell } from '../../components/ServiceShell.jsx'
import { Loading, Notice } from '../../components/UI.jsx'
import { supabase } from '../../lib/supabaseClient.js'
import { useAuth } from '../../context/AuthContext.jsx'
import { errorMessage } from '../../lib/format.js'

export default function CustomerLayout() {
  const { user,signOut } = useAuth()
  const [accounts,setAccounts] = useState(null)
  const [selected,setSelected] = useState('')
  const [error,setError] = useState('')
  const refresh = useCallback(async (preferred) => {
    const { data,error } = await supabase.from('contract_accounts').select('id,can,meter_no,service_address,status').order('can')
    if (error) throw error
    setAccounts(data)
    setSelected(prev => [preferred,prev,sessionStorage.getItem('iw-account-' + user.id)].find(id => data.some(a => a.id === id)) || data[0]?.id || '')
  }, [user.id])
  useEffect(() => { refresh().catch(err=>setError(errorMessage(err))) }, [refresh])
  useEffect(() => { if (selected) sessionStorage.setItem('iw-account-' + user.id, selected) }, [selected,user.id])
  const account = accounts?.find(a=>a.id===selected)
  return <ServiceShell><div className="billing-toolbar">
    <nav aria-label="Billing navigation">{[['dashboard','Overview'],['accounts','Accounts'],['bills','Invoices'],['payments','Payments'],['profile','Profile']].map(([path,label])=><NavLink key={path} to={'/customer/'+path}>{label}</NavLink>)}</nav>
    <button className="link-button" onClick={signOut}>Sign out</button></div>
    {accounts?.length > 0 && <label className="account-picker">Billing account
      <select aria-label="Billing account" value={selected} onChange={e=>setSelected(e.target.value)}>{accounts.map(a=><option value={a.id} key={a.id}>{a.can || 'CAN pending'} · {a.service_address || a.meter_no}</option>)}</select></label>}
    <Notice type="error">{error}</Notice>{error && <button className="button" onClick={()=>{setError('');refresh().catch(e=>setError(errorMessage(e)))}}>Retry</button>}
    {!accounts && !error ? <Loading/> : accounts && <div key={selected}><Outlet context={{ account, accounts,refresh }}/></div>}
  </ServiceShell>
}

export function NoAccount() {
  return <section className="service-form"><h2>No linked billing account</h2><Link className="button" to="/customer/accounts">Link a CAN</Link></section>
}
