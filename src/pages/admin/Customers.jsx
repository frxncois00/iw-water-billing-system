import { useState } from 'react'
import { Search } from 'lucide-react'
import { useAdminData } from '../../hooks/useAdminData.js'
import { EmptyState, Loading, Notice, PageHeader } from '../../components/UI.jsx'
import StatusBadge from '../../components/StatusBadge.jsx'

export default function Customers() {
  const { data, loading, error } = useAdminData()
  const [search, setSearch] = useState('')
  const rows = (data?.customers || []).filter((customer) => `${customer.full_name} ${customer.meter_no}`.toLowerCase().includes(search.toLowerCase()))
  return <div className="page-content"><PageHeader eyebrow="CUSTOMER LOOKUP" title="Customers" description="Search existing customers by name or meter number." /><Notice type="error">{error}</Notice>{loading && !data ? <Loading /> : <section className="panel customers-panel"><div className="customer-toolbar"><label className="search-field"><Search size={17} /><span className="sr-only">Search customers</span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Name or meter number" /></label></div>{rows.length ? <div className="table-scroll"><table><thead><tr><th>Customer</th><th>Meter no.</th><th>Address</th><th>Contact</th><th>Status</th></tr></thead><tbody>{rows.map((customer) => <tr key={customer.id}><td><strong>{customer.full_name}</strong></td><td>{customer.meter_no}</td><td>{customer.address}</td><td>{customer.contact_no || '—'}</td><td><StatusBadge status={customer.status} /></td></tr>)}</tbody></table></div> : <EmptyState title="No matching customers" description="Try a different name or meter number." />}</section>}</div>
}
