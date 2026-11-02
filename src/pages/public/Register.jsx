import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, ArrowRight, CheckCircle2, Droplets } from 'lucide-react'
import { supabase } from '../../lib/supabaseClient.js'
import { Notice } from '../../components/UI.jsx'
import { errorMessage } from '../../lib/format.js'
import { useAuth } from '../../context/AuthContext.jsx'

const initial = { full_name: '', email: '', contact_no: '', address: '', meter_no: '', password: '', confirm_password: '' }

export default function Register() {
  const { setGuestFlow } = useAuth()
  useEffect(() => { setGuestFlow(true); return () => setGuestFlow(false) }, [setGuestFlow])
  const [form, setForm] = useState(initial)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)
  const [needsEmailConfirmation, setNeedsEmailConfirmation] = useState(false)
  const update = (key) => (event) => setForm((current) => ({ ...current, [key]: event.target.value }))
  const submit = async (event) => {
    event.preventDefault(); setError('')
    const { full_name, email, contact_no, address, meter_no, password, confirm_password } = form
    if (![full_name, email, contact_no, address, meter_no, password, confirm_password].every((value) => value.trim())) { setError('Please complete all fields.'); return }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) { setError('Enter a valid email address.'); return }
    if (password.length < 8) { setError('Password must be at least 8 characters.'); return }
    if (password !== confirm_password) { setError('Passwords do not match.'); return }
    setBusy(true)
    try {
      const normalizedMeter = meter_no.trim().toUpperCase()
      const { data: available, error: meterError } = await supabase.rpc('is_meter_number_available', { requested_meter: normalizedMeter })
      if (meterError) throw meterError
      if (!available) { setError('That meter number is already registered. Please contact the office if it belongs to you.'); return }
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(), password,
        options: { data: { full_name: full_name.trim(), contact_no: contact_no.trim(), address: address.trim(), meter_no: normalizedMeter } },
      })
      if (signUpError) throw signUpError
      setNeedsEmailConfirmation(!data.session)
      // Some Supabase projects disable email confirmation and return a session immediately.
      // Keep the registration confirmation visible in either configuration.
      if (data.session) await supabase.auth.signOut()
      setDone(true)
    } catch (err) { setError(errorMessage(err)) }
    finally { setBusy(false) }
  }
  return <div className="auth-page register-page"><div className="auth-side"><Link className="site-logo light-logo" to="/"><span><Droplets size={25} /></span><strong>ISABEL WATERS</strong></Link><div><p className="eyebrow">GET CONNECTED</p><h1>Welcome to<br />your water account.</h1><p>Register once, get your meter verified, then see your monthly bills online.</p></div><span>Billing & Collection</span></div><main className="auth-main"><Link to="/" className="back-link"><ArrowLeft size={17} /> Back to home</Link>{done ? <div className="auth-card success-card"><CheckCircle2 size={46} /><p className="eyebrow">REGISTRATION SUBMITTED</p><h2>Thank you for registering.</h2><p>Registration received. {needsEmailConfirmation && 'Check your email and confirm your address. '}Please wait for the administrator to verify your meter number and approve your account.</p><Link to="/login" className="button">Go to login <ArrowRight size={17} /></Link></div> : <div className="auth-card register-card"><p className="eyebrow">CUSTOMER REGISTRATION</p><h2>Create your account</h2><p className="muted">Use the meter number shown on your water account.</p><Notice type="error">{error}</Notice><form onSubmit={submit} className="form-grid"><label className="span-2">Full name<input autoComplete="name" required value={form.full_name} onChange={update('full_name')} placeholder="Your full name" /></label><label>Email address<input type="email" autoComplete="email" required value={form.email} onChange={update('email')} placeholder="you@example.com" /></label><label>Contact no.<input type="tel" autoComplete="tel" required value={form.contact_no} onChange={update('contact_no')} placeholder="09XX XXX XXXX" /></label><label className="span-2">Address<input autoComplete="street-address" required value={form.address} onChange={update('address')} placeholder="Your service address" /></label><label className="span-2">Meter no.<input required value={form.meter_no} onChange={update('meter_no')} placeholder="Enter your meter number" /></label><label>Password<input type="password" autoComplete="new-password" required minLength={8} value={form.password} onChange={update('password')} placeholder="At least 8 characters" /></label><label>Confirm password<input type="password" autoComplete="new-password" required value={form.confirm_password} onChange={update('confirm_password')} placeholder="Repeat password" /></label><button className="button button-full span-2" disabled={busy}>{busy ? 'Submitting…' : 'Register account'} <ArrowRight size={17} /></button></form><p className="auth-switch">Already registered? <Link to="/login">Log in</Link></p></div>}</main></div>
}
