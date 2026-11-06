import BillForm from '../../components/admin/BillForm.jsx'
import BillingLedger from '../../components/admin/BillingLedger.jsx'
import { Loading, Notice, PageHeader } from '../../components/UI.jsx'
import { useAdminData } from '../../hooks/useAdminData.js'

export default function AdminBilling() {
  const { data, loading, error, refresh } = useAdminData()
  return <div className="page-content">
    <PageHeader eyebrow="BILLING REPORTS" title="Billing & exports" description="Review staff-created bills and export monthly statements as PDF." />
    <Notice type="error">{error}</Notice>
    {loading && !data ? <Loading /> : data && <><div className="dashboard-columns"><BillForm customers={data.customers} bills={data.bills} onSaved={refresh} printBasePath="/admin" externalBreakdown /></div><BillingLedger bills={data.bills} title="Monthly billing statements" description="Search issued bills, review balances, and export statements." printBasePath="/admin" canCollect={false} /></>}
  </div>
}
