import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, Printer } from 'lucide-react'
import { supabase } from '../../lib/supabaseClient.js'
import { dateLabel, peso } from '../../lib/format.js'
import { Loading, Notice } from '../../components/UI.jsx'

export default function Receipt() {
  const { id } = useParams()
  const [receipt, setReceipt] = useState(null)
  const [error, setError] = useState('')
  useEffect(() => {
    let active = true
    const load = async () => {
      const { data: payment, error: paymentError } = await supabase.from('payments').select('*').eq('id', id).single()
      if (paymentError) throw paymentError
      const [customerResult, profileResult, cashierResult, allocationResult, billsResult] = await Promise.all([
        supabase.from('customers').select('id,meter_no').eq('id', payment.customer_id).single(),
        supabase.from('profiles').select('full_name').eq('id', payment.customer_id).single(),
        supabase.from('profiles').select('full_name').eq('id', payment.collected_by).single(),
        supabase.from('payment_allocations').select('*').eq('payment_id', id),
        supabase.from('bills').select('id,bill_no,balance').eq('customer_id', payment.customer_id),
      ])
      for (const result of [customerResult, profileResult, cashierResult, allocationResult, billsResult]) if (result.error) throw result.error
      const bills = new Map(billsResult.data.map((bill) => [bill.id, bill]))
      return { payment, customer: customerResult.data, name: profileResult.data.full_name, cashier: cashierResult.data.full_name, allocations: allocationResult.data.map((allocation) => ({ ...allocation, bill: bills.get(allocation.bill_id) })), balance: payment.balance_after ?? billsResult.data.reduce((sum, bill) => sum + Number(bill.balance), 0) }
    }
    load().then((data) => { if (active) setReceipt(data) }).catch((err) => { if (active) setError(err.message) })
    return () => { active = false }
  }, [id])
  return <div className="page-content print-page"><div className="print-toolbar"><Link to="/cashier/collection" className="button button-ghost"><ArrowLeft size={17} /> Back to collection</Link><button className="button" disabled={!receipt} onClick={() => window.print()}><Printer size={17} /> Print receipt</button></div><Notice type="error">{error}</Notice>{!receipt && !error && <Loading label="Loading receipt…" />}{receipt && <article className="print-sheet"><header className="print-header"><div className="print-brand"><strong>ISABEL WATERS</strong><small>Billing & Collection</small></div><div><span>OFFICIAL RECEIPT</span><strong>{receipt.payment.or_number}</strong></div></header><div className="print-title"><div><p className="eyebrow">PAYMENT RECEIVED</p><h1>{peso(receipt.payment.amount)}</h1></div></div><div className="print-info"><div><span>RECEIVED FROM</span><strong>{receipt.name}</strong><p>Meter no. {receipt.customer.meter_no}</p></div><div><span>RECEIPT DETAILS</span><p>{dateLabel(receipt.payment.paid_at)} · {new Date(receipt.payment.paid_at).toLocaleTimeString('en-PH', { timeZone: 'Asia/Manila' })}</p><p>{receipt.payment.method}{receipt.payment.reference_no && ` · ${receipt.payment.reference_no}`}</p><p>Cashier: {receipt.cashier}</p></div></div><div className="print-table"><div className="print-table-row header"><span>Bill</span><span>Applied</span><span></span></div>{receipt.allocations.map((allocation) => <div className="print-table-row" key={allocation.bill_id}><strong>{allocation.bill?.bill_no}</strong><span>{peso(allocation.amount)}</span><span></span></div>)}</div><div className="print-totals"><div><span>Amount received</span><strong>{peso(receipt.payment.amount)}</strong></div>{receipt.payment.method === 'Cash' && <><div><span>Cash tendered</span><strong>{peso(receipt.payment.tendered)}</strong></div><div><span>Change</span><strong>{peso(receipt.payment.change_amount)}</strong></div></>}<div className="grand-total"><span>Remaining account balance</span><strong>{peso(receipt.balance)}</strong></div></div></article>}</div>
}
