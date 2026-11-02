import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { Loading } from './UI.jsx'

export default function RoleRedirect() {
  const { user, role, loading, identityError, refreshIdentity, signOut } = useAuth()
  if (loading) return <Loading label="Checking your account…" />
  if (!user) return <Navigate to="/portal" replace />
  if (identityError || !role) return <div className="center-stage"><div className="state-card"><h2>Account unavailable</h2><p>{identityError || 'Your role could not be loaded.'}</p><button className="button" onClick={refreshIdentity}>Try again</button><button className="button button-ghost" onClick={signOut}>Sign out</button></div></div>
  return <Navigate to={role === 'admin' ? '/admin' : role === 'cashier' ? '/cashier' : '/customer/dashboard'} replace />
}
