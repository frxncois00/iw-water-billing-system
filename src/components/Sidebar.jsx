import { useEffect, useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { BarChart3, CreditCard, Droplets, FileText, LogOut, Menu, Settings2, Users, Wallet, X } from 'lucide-react'
import { useAuth } from '../context/AuthContext.jsx'
import { supabase } from '../lib/supabaseClient.js'
import { peso } from '../lib/format.js'

const cashierLinks = [
  { to: '/cashier', label: 'Dashboard', icon: BarChart3 },
  { to: '/cashier/requests', label: 'Service Applications & Requests', icon: FileText },
  { to: '/cashier/customers', label: 'Customers & Service Accounts', icon: Users },
  { to: '/cashier/billing', label: 'Billing', icon: FileText },
  { to: '/cashier/collection', label: 'Collections', icon: Wallet },
]
const adminLinks = [
  { to: '/admin', label: 'Dashboard', icon: BarChart3 },
  { to: '/admin/customers', label: 'Customers & Service Accounts', icon: Users },
  { to: '/admin/billing', label: 'Billing Reports', icon: FileText },
  { to: '/admin/collections', label: 'Collections', icon: Wallet },
  { to: '/admin/adjustments', label: 'Adjustments & Corrections', icon: FileText },
  { to: '/admin/delinquent', label: 'Delinquent Accounts', icon: CreditCard },
  { to: '/admin/rates', label: 'Rates & Charges', icon: Settings2 },
  { to: '/admin/service-requests', label: 'Service Applications & Requests', icon: FileText },
  { to: '/admin/concerns', label: 'Concerns & Complaints', icon: FileText },
  { to: '/admin/users-audit', label: 'Users and Audit Logs', icon: Users },
  { to: '/admin/settings', label: 'Settings', icon: Settings2 },
]
const customerLinks = [
  { to: '/customer/dashboard', label: 'My Dashboard', icon: BarChart3 },
  { to: '/customer/bills', label: 'My Bills', icon: FileText },
  { to: '/customer/payments', label: 'Payment History', icon: CreditCard },
  { to: '/customer/profile', label: 'Profile', icon: Settings2 },
]

export default function Sidebar({ area }) {
  const { profile, signOut } = useAuth()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [goal, setGoal] = useState(null)
  // A small settings query is isolated to the staff shell; customer navigation never reads settings.
  useEffect(() => {
    if (area !== 'cashier') return
    let active = true
    supabase.from('settings').select('value').eq('key', 'monthly_collection_goal').maybeSingle()
      .then(({ data }) => { if (active && data) setGoal(Number(data.value)) })
    return () => { active = false }
  }, [area])
  const links = area === 'admin' ? adminLinks : area === 'cashier' ? cashierLinks : customerLinks
  const logout = async () => { await signOut(); navigate(area === 'customer' ? '/login' : '/portal', { replace: true }) }
  return <div className={`app-shell ${area === 'customer' ? 'customer-shell' : 'staff-shell'}`}>
    <button className="mobile-menu button button-ghost" onClick={() => setOpen(!open)} aria-label={open ? 'Close navigation' : 'Open navigation'}>{open ? <X /> : <Menu />} <span>Menu</span></button>
    {open && <button className="sidebar-scrim" onClick={() => setOpen(false)} aria-label="Close navigation" />}
    <aside className={`sidebar ${open ? 'sidebar-open' : ''}`}>
      <div className="brand"><span className="brand-icon"><Droplets size={24} /></span><span><strong>ISABEL WATERS</strong><small>Billing & Collection</small></span></div>
      <div className="sidebar-divider" />
      <p className="sidebar-caption">{area === 'admin' ? 'ADMIN MONITORING' : area === 'cashier' ? 'CASHIER / STAFF WORKSPACE' : 'CUSTOMER PORTAL'}</p>
      <nav aria-label="Main navigation">{links.map(({ to, label, icon: Icon }) => <NavLink end={to === '/cashier' || to === '/admin'} key={to} to={to} onClick={() => setOpen(false)} className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}><Icon size={19} strokeWidth={1.9} />{label}</NavLink>)}</nav>
      <div className="sidebar-bottom">
        {area === 'cashier' && <div className="goal-box"><span className="goal-top">MONTHLY COLLECTION GOAL</span><strong>{goal === null ? 'Loading…' : peso(goal)}</strong><small>Keep the collection moving</small></div>}
        <div className="sidebar-user"><span className="avatar">{profile?.full_name?.slice(0, 1).toUpperCase() || 'I'}</span><span><strong>{profile?.full_name || profile?.email || 'Isabel Waters'}</strong><small>{area === 'admin' ? 'Administrator' : area === 'cashier' ? 'Cashier / Staff' : 'Customer'}</small></span></div>
        <button className="nav-item logout" onClick={logout}><LogOut size={19} strokeWidth={1.9} />Logout</button>
      </div>
    </aside>
    <main className="app-main"><Outlet /></main>
  </div>
}
