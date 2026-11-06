import { useState } from 'react'
import { Link } from 'react-router-dom'
import { dateLabel, peso } from '../../lib/format.js'
import TablePagination, { useTablePagination } from '../TablePagination.jsx'
export default function PaymentHistory({data,base}) {
 const [search,setSearch]=useState(''); const [method,setMethod]=useState('')
 const rows=data.payments.filter(p=>`${p.or_number} ${data.customers.find(c=>c.id===p.customer_id)?.full_name||''}`.toLowerCase().includes(search.toLowerCase())&&(!method||p.method===method))
 const pagination=useTablePagination(rows,10,[search,method])
 return <section className="panel ledger-panel"><div className="panel-heading ledger-heading"><h2>Payment history</h2><div className="table-toolbar"><label>Search receipts<input value={search} onChange={e=>setSearch(e.target.value)} placeholder="OR or customer"/></label><label>Method<select value={method} onChange={e=>setMethod(e.target.value)}><option value="">All methods</option>{['Cash','GCash','Bank Transfer'].map(m=><option key={m}>{m}</option>)}</select></label></div></div><div className="table-scroll"><table><thead><tr><th>OR number</th><th>Date</th><th>Customer</th><th>Method</th><th>Amount</th><th>Status</th><th>Receipt</th></tr></thead><tbody>{pagination.visibleRows.map(p=><tr key={p.id}><td>{p.or_number}</td><td>{dateLabel(p.paid_at)}</td><td>{data.customers.find(c=>c.id===p.customer_id)?.full_name||'Customer'}</td><td>{p.method}</td><td>{peso(p.amount)}</td><td>{p.status}</td><td><Link to={`${base}/receipts/${p.id}`}>View / Print</Link></td></tr>)}</tbody></table></div><TablePagination {...pagination} total={rows.length}/></section>
}
