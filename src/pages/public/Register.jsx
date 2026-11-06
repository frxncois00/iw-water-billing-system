import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabaseClient.js'
import { useAuth } from '../../context/AuthContext.jsx'
import AuthScreen from './AuthScreen.jsx'
import { SocialSignIn } from './SocialSignIn.jsx'
import { Notice } from '../../components/UI.jsx'
import { errorMessage } from '../../lib/format.js'

export default function Register() {
  const { setGuestFlow } = useAuth()
  useEffect(() => { setGuestFlow(true); return () => setGuestFlow(false) }, [setGuestFlow])
  const [busy,setBusy] = useState(false)
  const [error,setError] = useState('')
  const [done,setDone] = useState('')
  async function submit(event) {
    event.preventDefault()
    const fields = new FormData(event.currentTarget)
    setBusy(true); setError('')
    try {
      const name = fields.get('name').trim()
      if (!name) throw new Error('Enter your name.')
      if (fields.get('password') !== fields.get('confirm')) throw new Error('Passwords do not match.')
      const { data,error } = await supabase.auth.signUp({ email: fields.get('email').trim(), password: fields.get('password'), options: { data: { full_name: name } } })
      if (error) throw error
      setDone(data.session ? 'Your login is ready.' : 'Check your email to confirm your login.')
    } catch (err) { setError(errorMessage(err)) }
    finally { setBusy(false) }
  }
  return <AuthScreen register>
    {done ? <><Notice type="success">{done}</Notice><Link className="button" to="/customer/accounts">Continue to billing accounts</Link></> :
    <form onSubmit={submit} className="form-stack"><label>Full name<input required name="name" autoComplete="name"/></label>
      <label>Email<input required name="email" type="email" autoComplete="email"/></label>
      <label>Password<input required name="password" minLength="8" type="password" autoComplete="new-password"/></label>
      <label>Confirm password<input required name="confirm" type="password" autoComplete="new-password"/></label>
      <Notice type="error">{error}</Notice><button className="button" disabled={busy}>{busy ? 'Creating…' : 'Create login'}</button>
      </form>}
    {!done && <SocialSignIn from="/customer/accounts"/>}
  </AuthScreen>
}
