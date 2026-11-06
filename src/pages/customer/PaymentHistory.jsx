import { useOutletContext } from 'react-router-dom'
import { NoAccount } from './CustomerLayout.jsx'
import { useEffect, useState } from 'react'
import { getOwnPayments } from '../../lib/api.js'
import { dateLabel, monthLabel, peso } from '../../lib/format.js'
import { EmptyState, Loading, Notice, PageHeader } from '../../components/UI.jsx'

export default function PaymentHistory() {
  const [payments, setPayments] = useState(null)
  const { account } = useOutletContext()
  const [error, setError] = useState('')
  useEffect(() => { let active = true; getOwnPayments(account?.id).then((items) => { if (active) setPayments(items) }).catch((err) => { if (active) setError(err.message) }); return () => { active = false } }, [account?.id])
  if (!account) return <NoAccount/>
  return <div className="page-content"><PageHeader eyebrow="TRANSACTIONS" title="Payment history" description="A record of payments posted to your account." /><Notice type="error">{error}</Notice>{!payments && !error ? <Loading /> : payments && <section className="panel ledger-panel">{payments.length ? <div className="table-scroll"><table><thead><tr><th>Date</th><th>Bill no.</th><th>Billing month</th><th>Method</th><th>Reference no.</th><th>Amount</th></tr></thead><tbody>{payments.map((payment) => <tr key={payment.id}><td>{dateLabel(payment.paid_at)}</td><td><strong>{payment.bill?.bill_no || '—'}</strong></td><td>{monthLabel(payment.bill?.billing_month)}</td><td>{payment.method}</td><td>{payment.reference_no || '—'}</td><td className="money-cell">{peso(payment.amount)}</td></tr>)}</tbody></table></div> : <EmptyState title="No payments recorded" description="Payments will appear here after staff posts them to your bill." />}</section>}</div>
}
