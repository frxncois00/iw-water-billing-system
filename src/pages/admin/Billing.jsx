import BillForm from '../../components/admin/BillForm.jsx'
import BillingLedger from '../../components/admin/BillingLedger.jsx'
import { Loading, Notice, PageHeader } from '../../components/UI.jsx'
import { useAdminData } from '../../hooks/useAdminData.js'

export default function Billing() {
  const { data, loading, error, refresh } = useAdminData()
  return <div className="page-content"><PageHeader eyebrow="BILLING" title="Water billing" description="Create monthly bills, review the ledger, and export statements as PDF." /><Notice type="error">{error}</Notice>{loading && !data ? <Loading /> : data && <><BillForm customers={data.customers} bills={data.bills} onSaved={refresh} printBasePath="/cashier" /><BillingLedger bills={data.bills} onPaymentSaved={refresh} printBasePath="/cashier" /></>}</div>
}
