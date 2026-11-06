import { useState } from 'react'
import { LockKeyhole, UserRound } from 'lucide-react'
import { useAuth } from '../../context/AuthContext.jsx'
import { supabase } from '../../lib/supabaseClient.js'
import { errorMessage } from '../../lib/format.js'
import { Notice, PageHeader } from '../../components/UI.jsx'

export default function Profile() {
  const { user, profile } = useAuth()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [passwordBusy, setPasswordBusy] = useState(false)
  const [passwordMessage, setPasswordMessage] = useState('')
  const [passwordError, setPasswordError] = useState('')

  const savePassword = async (event) => {
    event.preventDefault(); setPasswordError(''); setPasswordMessage('')
    if (password.length < 8) { setPasswordError('Password must be at least 8 characters.'); return }
    if (password !== confirm) { setPasswordError('Passwords do not match.'); return }
    setPasswordBusy(true)
    const { error: updateError } = await supabase.auth.updateUser({ password })
    if (updateError) setPasswordError(errorMessage(updateError))
    else { setPassword(''); setConfirm(''); setPasswordMessage('Password updated successfully.') }
    setPasswordBusy(false)
  }
  return <div className="page-content"><PageHeader eyebrow="ACCOUNT SETTINGS" title="My profile" description="Manage your portal login." /><div className="profile-grid"><section className="panel profile-panel"><div className="panel-heading"><div><span className="panel-icon"><UserRound size={20} /></span><h2>Account details</h2></div></div><div className="form-stack"><label>Full name<input value={profile?.full_name || ''} readOnly /></label><label>Email address<input value={user?.email || ''} readOnly /></label></div></section><section className="panel profile-panel"><div className="panel-heading"><div><span className="panel-icon"><LockKeyhole size={20} /></span><h2>Change password</h2></div></div><Notice type="error">{passwordError}</Notice><Notice type="success">{passwordMessage}</Notice><form onSubmit={savePassword} className="form-stack"><label>New password<input type="password" minLength={8} autoComplete="new-password" required value={password} onChange={(event) => setPassword(event.target.value)} placeholder="At least 8 characters" /></label><label>Confirm new password<input type="password" minLength={8} autoComplete="new-password" required value={confirm} onChange={(event) => setConfirm(event.target.value)} placeholder="Repeat new password" /></label><button className="button button-outline" disabled={passwordBusy}>{passwordBusy ? 'Updating…' : 'Update password'}</button></form></section></div></div>
}
