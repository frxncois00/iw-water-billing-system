import { useEffect, useState } from 'react'
import { Link, Navigate, useOutletContext } from 'react-router-dom'
import { getOwnBills } from '../../lib/api.js'
import { dateLabel, monthLabel, peso } from '../../lib/format.js'
import { Loading, Notice } from '../../components/UI.jsx'

export default function CustomerDashboard() {
  const { account } = useOutletContext()
  const [bills,setBills] = useState(null)
  const [error,setError] = useState('')
  useEffect(() => {
    let live = true
    if (account) getOwnBills(account.id).then(data=>{if(live)setBills(data)}).catch(err=>{if(live)setError(err.message)})
    return () => { live=false }
  }, [account])
  if (!account) return <Navigate to="/customer/accounts" replace/>
  if (error) return <Notice type="error">{error}</Notice>
  if (!bills) return <Loading/>
  const balance = bills.reduce((sum,b)=>sum + Number(b.balance),0)
  const latest = bills[0]
  const nextDue = bills.filter(b=>Number(b.balance)>0).sort((a,b)=>a.due_date.localeCompare(b.due_date))[0]
  return <><h1>Billing overview</h1><section className="balance-panel"><div><p>Outstanding balance</p><h2>{peso(balance)}</h2>{nextDue && <p>Earliest unpaid bill due {dateLabel(nextDue.due_date)}</p>}</div>
    {balance > 0 && <Link className="button" to="/customer/pay">Pay bill</Link>}</section>
    <section className="service-form"><h2>Latest invoice</h2>{latest ? <div className="account-line"><div><strong>{monthLabel(latest.billing_month)}</strong><p>{latest.bill_no} · {Number(latest.water_used)} m³</p></div><Link to={'/customer/bills/'+latest.id+'/print'}>View invoice</Link></div> : <p>No invoices issued yet.</p>}</section></>
}
