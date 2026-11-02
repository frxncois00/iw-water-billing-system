import BillForm from '../../components/admin/BillForm.jsx'
import BillingLedger from '../../components/admin/BillingLedger.jsx'
import { getSummary, Snapshot, SummaryCards } from '../../components/admin/Overview.jsx'
import { Loading, Notice, PageHeader } from '../../components/UI.jsx'
import { useAdminData } from '../../hooks/useAdminData.js'

export default function Dashboard() {
  const { data, loading, error, refresh } = useAdminData()
  return <div className="page-content"><PageHeader eyebrow="OVERVIEW" title="Collection Dashboard" description="A clear view of billing activity and today’s collections." /><Notice type="error">{error}</Notice>{loading && !data ? <Loading /> : data && <><SummaryCards summary={getSummary(data)} /><div className="dashboard-columns"><BillForm customers={data.customers} bills={data.bills} onSaved={refresh} /><Snapshot summary={getSummary(data)} /></div><BillingLedger bills={data.bills} onPaymentSaved={refresh} /></>}</div>
}
