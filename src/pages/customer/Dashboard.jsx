import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, CalendarDays, Droplets, FileText, Wallet } from 'lucide-react'
import { useAuth } from '../../context/AuthContext.jsx'
import { getOwnBills } from '../../lib/api.js'
import { billStatus, dateLabel, monthLabel, peso } from '../../lib/format.js'
import StatusBadge from '../../components/StatusBadge.jsx'
import StatCard from '../../components/StatCard.jsx'
import { EmptyState, Loading, Notice, PageHeader } from '../../components/UI.jsx'

export default function CustomerDashboard() {
  const { profile } = useAuth()
  const [bills, setBills] = useState(null)
  const [error, setError] = useState('')
  useEffect(() => { let active = true; getOwnBills().then((items) => { if (active) setBills(items) }).catch((err) => { if (active) setError(err.message) }); return () => { active = false } }, [])
  const latest = bills?.[0]
  const outstanding = bills?.reduce((sum, bill) => sum + Number(bill.balance), 0) || 0
  return <div className="page-content"><PageHeader eyebrow="WELCOME BACK" title={`Hello, ${profile?.full_name?.split(' ')[0] || 'customer'}`} description="Your water account at a glance." /><Notice type="error">{error}</Notice>{!bills && !error ? <Loading /> : bills && <><div className="stats-grid customer-stats"><StatCard label="Latest Bill" value={latest ? peso(latest.amount) : peso(0)} icon={FileText} detail={latest ? monthLabel(latest.billing_month) : 'No bills posted yet'} /><StatCard label="Due Date" value={latest ? dateLabel(latest.due_date) : '—'} icon={CalendarDays} tone="purple" detail="Latest bill" /><StatCard label="Latest Balance" value={latest ? peso(latest.balance) : peso(0)} icon={Wallet} tone="orange" detail={latest ? billStatus(latest) : 'No balance'} /><StatCard label="Total Outstanding" value={peso(outstanding)} icon={Droplets} tone="green" detail="Across all bills" /></div><div className="customer-dashboard-grid"><section className="panel latest-panel"><div className="panel-heading"><div><h2>Latest water bill</h2><p>Your most recent billing statement</p></div>{latest && <StatusBadge bill={latest} />}</div>{latest ? <><div className="latest-amount"><span>Balance due</span><strong>{peso(latest.balance)}</strong></div><div className="detail-list"><div><span>Billing month</span><strong>{monthLabel(latest.billing_month)}</strong></div><div><span>Due date</span><strong>{dateLabel(latest.due_date)}</strong></div><div><span>Water used</span><strong>{Number(latest.water_used).toFixed(2)} m³</strong></div></div><Link to={`/customer/bills/${latest.id}/print`} className="button button-outline">View and print bill <ArrowRight size={17} /></Link></> : <EmptyState title="No bill yet" description="Your first monthly bill will appear here once it is issued." />}</section><section className="panel instructions-panel"><span className="panel-icon"><Wallet size={20} /></span><h2>How to pay</h2><p>Choose the payment option that works for you. Your balance updates when staff records your payment.</p><div className="instruction-step"><strong>01</strong><div><b>At the office</b><span>Present your bill number and pay directly at the Isabel Waters office.</span></div></div><div className="instruction-step"><strong>02</strong><div><b>Via GCash</b><span>Request the verified GCash account from staff before sending payment. Keep your transaction reference.</span></div></div><Link to="/customer/payments" className="text-link">View payment history <ArrowRight size={16} /></Link></section></div></>}</div>
}
