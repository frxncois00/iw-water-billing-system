import { useLocation } from 'react-router-dom'
import PaymentHistory from '../../components/admin/PaymentHistory.jsx'
import BillingLedger from '../../components/admin/BillingLedger.jsx'
import { getSummary, Snapshot, SummaryCards } from '../../components/admin/Overview.jsx'
import { Loading, Notice, PageHeader } from '../../components/UI.jsx'
import { useAdminData } from '../../hooks/useAdminData.js'

export default function Collection() {
  const base = useLocation().pathname.startsWith('/admin') ? '/admin' : '/cashier'
  const { data, loading, error, refresh } = useAdminData()
  return <div className="page-content"><PageHeader eyebrow="PAYMENT COLLECTION" title="Collection" description="Record cash, GCash, and other payments against open bills." /><Notice type="error">{error}</Notice>{loading && !data ? <Loading /> : data && <><SummaryCards summary={getSummary(data)} /><BillingLedger printBasePath={base} bills={data.bills} onPaymentSaved={refresh} title="Collection ledger" description="Choose Collect on any bill with an outstanding balance." /><PaymentHistory data={data} base={base}/></>}</div>
}
