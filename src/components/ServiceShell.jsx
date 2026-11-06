import { Droplet } from 'lucide-react'
import { Link, NavLink } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'

export function ServiceShell({ children, footer }) {
  const { user, role } = useAuth()
  const portal = role === 'admin' ? '/admin' : role === 'cashier' ? '/cashier' : '/customer/dashboard'
  return <div className="service-site">
    <header className="service-header"><div className="service-bar">
      <Link className="service-brand" to="/"><Droplet size={24} /> Isabel Waters</Link>
      <nav aria-label="Customer services">
        <NavLink to="/apply">New service</NavLink><NavLink to="/concerns">Concerns</NavLink>
        <NavLink to="/track">Track request</NavLink>
        <Link className="service-login" to={user ? portal : '/login'}>{user ? 'My portal' : 'Log in'}</Link>
      </nav>
    </div></header>
    <main className="service-main">{children}</main>
    {footer}
  </div>
}

export function OfficeContact() {
  const { VITE_OFFICE_ADDRESS: address, VITE_OFFICE_CONTACT: phone, VITE_OFFICE_EMAIL: email } = import.meta.env
  return <aside className="office-contact"><strong>Visit or contact the office</strong>
    {address && <span>{address}</span>}{phone && <a href={'tel:' + phone}>{phone}</a>}
    {email && <a href={'mailto:' + email}>{email}</a>}
    {!address && !phone && !email && <span>Walk-in, phone and email requests use the same application process.</span>}
  </aside>
}
