import { useEffect, useState } from 'react'
import { Link, useOutletContext } from 'react-router-dom'
import { getOwnBills } from '../../lib/api.js'
import { peso } from '../../lib/format.js'
import { Loading, Notice } from '../../components/UI.jsx'
import { NoAccount } from './CustomerLayout.jsx'

export default function Pay() {
  const { account } = useOutletContext()
  const [balance,setBalance] = useState(null)
  const [error,setError] = useState('')
  useEffect(()=>{
    let live = true
    if (account) getOwnBills(account.id).then(rows=>{
      if(live) setBalance(rows.reduce((total,bill)=>total+Number(bill.balance),0))
    }).catch(err=>{if(live)setError(err.message)})
    return ()=>{live=false}
  },[account])
  if (!account) return <NoAccount/>
  const channel = import.meta.env.VITE_BILLER_PAYMENT_URL
  return <section className="service-form"><h1>Pay your bill</h1><Notice type="error">{error}</Notice>
    {balance === null && !error && <Loading/>}{balance !== null && <><dl className="reference"><dt>Contract account number</dt><dd>{account.can || 'Pending assignment'}</dd>
    <dt>Outstanding balance</dt><dd>{peso(balance)}</dd></dl>
    {balance <= 0 ? <Notice type="success">This account is paid up.</Notice> : channel?.startsWith('https://') && account.can ?
      <><p>Use this CAN at the payment provider. Your balance updates when Isabel Waters posts the confirmed payment.</p>
      <a className="button" href={channel} target="_blank" rel="noopener noreferrer">Continue to payment provider</a></> :
      <Notice>Online checkout is unavailable. You can pay at the Isabel Waters office.</Notice>}
    <p><Link to="/customer/payments">View posted payments</Link></p></>}
  </section>
}
