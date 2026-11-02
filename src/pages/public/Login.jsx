import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, ArrowRight, Droplets } from 'lucide-react'
import { supabase } from '../../lib/supabaseClient.js'
import { useAuth } from '../../context/AuthContext.jsx'
import { Notice } from '../../components/UI.jsx'
import { errorMessage } from '../../lib/format.js'

export default function Login() {
  const navigate = useNavigate()
  const { refreshIdentity, setGuestFlow } = useAuth()
  useEffect(() => { setGuestFlow(true); return () => setGuestFlow(false) }, [setGuestFlow])
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [resetBusy, setResetBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const submit = async (event) => {
    event.preventDefault(); setBusy(true); setError(''); setMessage('')
    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
      if (signInError) throw signInError
      const { data: profile, error: profileError } = await supabase.from('profiles').select('role').eq('id', data.user.id).single()
      if (profileError) throw profileError
      if (profile.role === 'admin' || profile.role === 'cashier') {
        await supabase.auth.signOut()
        setError('Staff must log in at the staff portal.')
        return
      }
      await refreshIdentity()
      navigate('/customer/dashboard', { replace: true })
    } catch (err) { setError(errorMessage(err)) }
    finally { setBusy(false) }
  }

  const reset = async () => {
    setError(''); setMessage('')
    if (!email.trim()) { setError('Enter your email address first, then request a reset link.'); return }
    setResetBusy(true)
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: `${window.location.origin}/reset-password` })
    if (resetError) setError(errorMessage(resetError))
    else setMessage('If that email is registered, a password reset link is on its way.')
    setResetBusy(false)
  }

  return <div className="auth-page"><div className="auth-side"><Link className="site-logo light-logo" to="/"><span><Droplets size={25} /></span><strong>ISABEL WATERS</strong></Link><div><p className="eyebrow">YOUR WATER ACCOUNT</p><h1>Welcome back<br />to a clearer view.</h1><p>One secure place for your monthly bills, balances, and payment record.</p></div><span>Billing & Collection</span></div><main className="auth-main"><Link to="/" className="back-link"><ArrowLeft size={17} /> Back to home</Link><div className="auth-card"><p className="eyebrow">CUSTOMER ACCESS</p><h2>Log in to your account</h2><p className="muted">Enter the email and password you registered with.</p><Notice type="error">{error}</Notice><Notice type="success">{message}</Notice><form onSubmit={submit} className="form-stack"><label>Email address<input type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" /></label><label>Password<input type="password" autoComplete="current-password" required value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Enter your password" /></label><button className="forgot-link" type="button" onClick={reset} disabled={resetBusy}>{resetBusy ? 'Sending…' : 'Forgot password?'}</button><button className="button button-full" disabled={busy}>{busy ? 'Signing in…' : 'Log in'} <ArrowRight size={17} /></button></form><p className="auth-switch">New to Isabel Waters? <Link to="/register">Create an account</Link></p></div></main></div>
}
