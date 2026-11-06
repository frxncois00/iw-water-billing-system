import { Plus } from 'lucide-react'
import BillForm from '../../components/admin/BillForm.jsx'
import BillingLedger from '../../components/admin/BillingLedger.jsx'
import { getSummary, SummaryCards } from '../../components/admin/Overview.jsx'
import { Loading, Notice, PageHeader } from '../../components/UI.jsx'
import { useAdminData } from '../../hooks/useAdminData.js'
import { dateLabel, todayISO } from '../../lib/format.js'

export default function Dashboard() {
  const { data, loading, error, refresh } = useAdminData()
  const actions = <div className="dashboard-tools"><span className="date-chip">{dateLabel(todayISO())}</span><button className="button" onClick={() => document.querySelector('.bill-form-panel')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}><Plus size={17} /> New bill</button></div>
  return <div className="page-content collection-dashboard"><PageHeader title="Staff dashboard" description="Service applications, billing activity, and today’s collections at a glance." action={actions} /><Notice type="error">{error}</Notice>{loading && !data ? <Loading /> : data && <><SummaryCards summary={getSummary(data)} /><div className="dashboard-columns"><BillForm customers={data.customers} bills={data.bills} onSaved={refresh} externalBreakdown /></div><BillingLedger bills={data.bills} onPaymentSaved={refresh} /></>}</div>
}
