import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { Loading } from './UI.jsx'

export default function RoleRoute({ role }) {
  const { profile, customer, loading, refreshIdentity, signOut } = useAuth()
  if (loading) return <Loading label="Loading your account…" />
  if (!profile) return <div className="center-stage"><div className="state-card"><h2>Account unavailable</h2><p>We could not load your account details.</p><button onClick={refreshIdentity} className="button">Try again</button><button onClick={signOut} className="button button-ghost">Sign out</button></div></div>
  if (profile.role !== role) return <Navigate replace to={profile.role === 'admin' ? '/admin' : profile.role === 'cashier' ? '/cashier' : '/customer/dashboard'} />
  if (role === 'customer' && customer?.status !== 'active') {
    const state = customer?.status
    const title = state === 'pending' ? 'Waiting for approval' : state === 'rejected' ? 'Registration declined' : 'Account deactivated'
    const description = state === 'pending'
      ? 'Registration received. Please wait for the administrator to verify your meter number and approve your account.'
      : state === 'rejected' ? 'Please contact the Isabel Waters office if you believe this is a mistake.' : 'Please contact the Isabel Waters office to reactivate your account.'
    return <div className="center-stage"><div className="state-card"><span className="state-icon">IW</span><p className="eyebrow">ISABEL WATERS</p><h1>{title}</h1><p>{description}</p><button onClick={refreshIdentity} className="button">Check status</button><button onClick={signOut} className="button button-ghost">Sign out</button></div></div>
  }
  return <Outlet />
}
