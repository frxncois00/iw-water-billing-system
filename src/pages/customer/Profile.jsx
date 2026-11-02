import { useState } from 'react'
import { LockKeyhole, ShieldCheck, UserRound } from 'lucide-react'
import { useAuth } from '../../context/AuthContext.jsx'
import { supabase } from '../../lib/supabaseClient.js'
import { errorMessage } from '../../lib/format.js'
import { Notice, PageHeader } from '../../components/UI.jsx'

export default function Profile() {
  const { user, profile, customer, refreshIdentity } = useAuth()
  const [contact, setContact] = useState(customer?.contact_no || '')
  const [address, setAddress] = useState(customer?.address || '')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [busy, setBusy] = useState(false)
  const [passwordBusy, setPasswordBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [passwordMessage, setPasswordMessage] = useState('')
  const [passwordError, setPasswordError] = useState('')

  const saveDetails = async (event) => {
    event.preventDefault(); setError(''); setMessage(''); setBusy(true)
    const { error: saveError } = await supabase.from('customers').update({ contact_no: contact.trim(), address: address.trim() }).eq('id', user.id)
    if (saveError) setError(errorMessage(saveError))
    else { await refreshIdentity(); setMessage('Your contact details have been updated.') }
    setBusy(false)
  }
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
  return <div className="page-content"><PageHeader eyebrow="ACCOUNT SETTINGS" title="My profile" description="Keep your contact details current and your account secure." /><div className="profile-grid"><section className="panel profile-panel"><div className="panel-heading"><div><span className="panel-icon"><UserRound size={20} /></span><h2>Account details</h2></div></div><Notice type="error">{error}</Notice><Notice type="success">{message}</Notice><form onSubmit={saveDetails} className="form-stack"><label>Full name<input value={profile?.full_name || ''} readOnly /></label><label>Email address<input value={user?.email || ''} readOnly /></label><label>Meter no.<input value={customer?.meter_no || ''} readOnly /></label><label>Contact no.<input value={contact} onChange={(event) => setContact(event.target.value)} /></label><label>Address<input required value={address} onChange={(event) => setAddress(event.target.value)} /></label><button className="button" disabled={busy}>{busy ? 'Saving…' : 'Save changes'}</button></form><p className="profile-note"><ShieldCheck size={16} /> For name or meter changes, please contact the office.</p></section><section className="panel profile-panel"><div className="panel-heading"><div><span className="panel-icon"><LockKeyhole size={20} /></span><h2>Change password</h2></div></div><Notice type="error">{passwordError}</Notice><Notice type="success">{passwordMessage}</Notice><form onSubmit={savePassword} className="form-stack"><label>New password<input type="password" minLength={8} autoComplete="new-password" required value={password} onChange={(event) => setPassword(event.target.value)} placeholder="At least 8 characters" /></label><label>Confirm new password<input type="password" minLength={8} autoComplete="new-password" required value={confirm} onChange={(event) => setConfirm(event.target.value)} placeholder="Repeat new password" /></label><button className="button button-outline" disabled={passwordBusy}>{passwordBusy ? 'Updating…' : 'Update password'}</button></form></section></div></div>
}
