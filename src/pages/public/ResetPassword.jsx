import { useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabaseClient.js'
import { Notice } from '../../components/UI.jsx'
import { errorMessage } from '../../lib/format.js'

export default function ResetPassword() {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')
  const submit = async (event) => {
    event.preventDefault(); setError('')
    if (password.length < 8) { setError('Password must be at least 8 characters.'); return }
    if (password !== confirm) { setError('Passwords do not match.'); return }
    setBusy(true)
    const { error: updateError } = await supabase.auth.updateUser({ password })
    if (updateError) setError(errorMessage(updateError))
    else { await supabase.auth.signOut(); setDone(true) }
    setBusy(false)
  }
  return <main className="center-stage"><div className="auth-card reset-card"><p className="eyebrow">ACCOUNT RECOVERY</p><h1>Set a new password</h1><Notice type="error">{error}</Notice>{done ? <><p>Your password has been updated. You can now log in.</p><Link to="/login" className="button">Go to login</Link></> : <form onSubmit={submit} className="form-stack"><label>New password<input type="password" minLength={8} required autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} /></label><label>Confirm new password<input type="password" minLength={8} required autoComplete="new-password" value={confirm} onChange={(event) => setConfirm(event.target.value)} /></label><button className="button button-full" disabled={busy}>{busy ? 'Saving…' : 'Update password'}</button></form>}</div></main>
}
