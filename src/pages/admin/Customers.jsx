import { useMemo, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Search } from 'lucide-react'
import { useAdminData } from '../../hooks/useAdminData.js'
import { EmptyState, Loading, Notice, PageHeader } from '../../components/UI.jsx'
import StatusBadge from '../../components/StatusBadge.jsx'
import TablePagination, { useTablePagination } from '../../components/TablePagination.jsx'

export default function Customers() {
  const { data, loading, error } = useAdminData()
  const navigate = useNavigate()
  const location = useLocation()
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('all')
  const rows = useMemo(() => (data?.customers || []).filter((customer) => `${customer.full_name} ${customer.can || ''} ${customer.meter_no}`.toLowerCase().includes(search.toLowerCase()) && (status === 'all' || customer.status === status)), [data, search, status])
  const pagination = useTablePagination(rows, 10, [search, status])
  const openCustomer = (customer) => navigate(customer.id)

  return <div className="page-content"><PageHeader action={location.pathname.startsWith('/admin') ? <Link className="button" to="/admin/customers/new">Add Existing Customer</Link> : null} eyebrow="CUSTOMER LOOKUP" title="Customers & service accounts" description="Search customers whose application and service connection have already been completed." /><Notice type="error">{error}</Notice>{loading && !data ? <Loading /> : <section className="panel customers-panel"><div className="customer-toolbar table-toolbar"><label className="search-field"><Search size={17} /><span className="sr-only">Search customers</span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Name, CAN, or meter number" /></label><label className="table-filter"><span className="sr-only">Filter account status</span><select value={status} onChange={(event) => setStatus(event.target.value)}><option value="all">All statuses</option><option value="active">Active</option><option value="inactive">Inactive</option><option value="pending">Pending</option></select></label></div>{rows.length ? <><div className="table-scroll"><table><thead><tr><th>Customer</th><th>CAN</th><th>Meter no.</th><th>Address</th><th>Contact</th><th>Status</th></tr></thead><tbody>{pagination.visibleRows.map((customer) => <tr className="clickable-row" key={customer.id} tabIndex="0" onClick={() => openCustomer(customer)} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') openCustomer(customer) }}><td><strong>{customer.full_name}</strong></td><td>{customer.can || '—'}</td><td>{customer.meter_no}</td><td>{customer.address}</td><td>{customer.contact_no || '—'}</td><td><StatusBadge status={customer.status} /></td></tr>)}</tbody></table></div><TablePagination {...pagination} total={rows.length} /></> : <EmptyState title="No matching customers" description="Try a different search or account status." />}</section>}</div>
}
