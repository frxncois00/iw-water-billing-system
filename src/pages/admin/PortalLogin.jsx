import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowRight, Droplets, LockKeyhole } from 'lucide-react'
import { useAuth } from '../../context/AuthContext.jsx'
import { Notice } from '../../components/UI.jsx'
import { errorMessage } from '../../lib/format.js'

export default function PortalLogin() {
  const navigate = useNavigate()
  const { signIn, signOut, setGuestFlow } = useAuth()
  useEffect(() => { setGuestFlow(true); return () => setGuestFlow(false) }, [setGuestFlow])
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const submit = async (event) => {
    event.preventDefault(); setBusy(true); setError('')
    try {
      const role = await signIn(email, password)
      if (!['admin', 'cashier'].includes(role)) {
        await signOut()
        setError('Access denied')
        return
      }
      navigate(role === 'admin' ? '/admin' : '/cashier', { replace: true })
    } catch (err) { setError(errorMessage(err)) }
    finally { setBusy(false) }
  }
  return <main className="portal-page"><div className="portal-glow" /><div className="portal-wrap"><Link to="/" className="portal-brand"><span><Droplets size={27} /></span>ISABEL WATERS</Link><div className="portal-card"><span className="portal-lock"><LockKeyhole size={24} /></span><p className="eyebrow">RESTRICTED ACCESS</p><h1>Staff Portal</h1><p>Sign in to manage water billing and collections.</p><Notice type="error">{error}</Notice><form onSubmit={submit} className="form-stack"><label>Staff email<input type="email" autoComplete="username" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="staff@example.com" /></label><label>Password<input type="password" autoComplete="current-password" required value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Enter your password" /></label><button className="button button-full" disabled={busy}>{busy ? 'Verifying…' : 'Enter portal'} <ArrowRight size={18} /></button></form></div><p className="portal-foot">Authorized Isabel Waters personnel only</p></div></main>
}
