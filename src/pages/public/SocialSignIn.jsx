import { useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext.jsx'
import { supabase } from '../../lib/supabaseClient.js'
import { Loading, Notice } from '../../components/UI.jsx'

const providers = { google: 'Google', apple: 'Apple' }
const returnKey = 'iw-social-return'
const customerPath = path => typeof path === 'string' && path.startsWith('/customer/') ? path : '/customer/dashboard'

function ProviderMark({ id }) {
  if (id === 'apple') return <svg aria-hidden="true" width="21" height="21" viewBox="0 0 24 24"><path fill="currentColor" d="M17.05 12.54c.03 3.29 2.88 4.38 2.91 4.4-.02.08-.46 1.56-1.51 3.09-.91 1.32-1.85 2.63-3.34 2.66-1.46.03-1.93-.86-3.6-.86s-2.19.83-3.56.89c-1.43.05-2.52-1.42-3.43-2.74C2.65 17.29 1 12.38 2.92 9.04a5.3 5.3 0 0 1 4.49-2.72c1.4-.03 2.73.95 3.59.95.86 0 2.48-1.18 4.18-1.01.72.03 2.75.29 4.05 2.2-.11.07-2.21 1.29-2.18 4.08ZM14.32 4.55c.76-.92 1.28-2.2 1.14-3.48-1.1.04-2.44.73-3.23 1.65-.71.82-1.34 2.14-1.17 3.39 1.22.09 2.47-.62 3.26-1.56Z"/></svg>
  return <span aria-hidden="true" className="iw-provider-mark google">G</span>
}

export function SocialSignIn({ from }) {
  const [pending,setPending] = useState('')
  const [error,setError] = useState('')
  async function start(provider) {
    setPending(provider); setError('')
    try {
      const url = import.meta.env.VITE_SUPABASE_URL
      const apikey = import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
      const settings = await fetch(url+'/auth/v1/settings',{ headers:{apikey} })
      if (!settings.ok) throw new Error('Could not check sign-in options. Try again or use your email.')
      if (!(await settings.json()).external?.[provider]) throw new Error(providers[provider]+' sign-in is unavailable. Continue with your email.')
      sessionStorage.setItem(returnKey,customerPath(from))
      const {error} = await supabase.auth.signInWithOAuth({provider,options:{redirectTo:window.location.origin+'/auth/return'}})
      if(error) throw error
    } catch(err) { setError(err.message); setPending('') }
  }
  return <div className="iw-provider-list"><div className="iw-auth-divider">Or</div>
    {Object.entries(providers).map(([id,name])=><button type="button" key={id} disabled={!!pending} onClick={()=>start(id)}>
      <ProviderMark id={id}/>{pending===id?'Connecting…':'Continue with '+name}</button>)}
    <Notice type="error">{error}</Notice></div>
}

export function SocialReturn() {
  const {user,role,loading,identityError,signOut} = useAuth()
  if(loading) return <Loading label="Completing sign-in…"/>
  if(user && role==='customer') return <Navigate replace to={customerPath(sessionStorage.getItem(returnKey))}/>
  return <main className="iw-auth-scene"><section className="iw-auth-sheet iw-auth-body">
    <h1>Sign-in help</h1><p>{identityError || (user ? 'Use the staff portal with this account.' : 'Sign-in was not completed.')}</p>
    {user ? <Link to="/portal" onClick={async e=>{e.preventDefault();await signOut();window.location.assign('/portal')}}>Continue to staff portal</Link> : <Link to="/login">Return to sign in</Link>}
  </section></main>
}
