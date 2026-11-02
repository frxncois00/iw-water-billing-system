import BillingLedger from '../../components/admin/BillingLedger.jsx'
import { getSummary, Snapshot, SummaryCards } from '../../components/admin/Overview.jsx'
import { Loading, Notice, PageHeader } from '../../components/UI.jsx'
import { useAdminData } from '../../hooks/useAdminData.js'

export default function Collection() {
  const { data, loading, error, refresh } = useAdminData()
  return <div className="page-content"><PageHeader eyebrow="PAYMENT COLLECTION" title="Collection" description="Record cash, GCash, and other payments against open bills." /><Notice type="error">{error}</Notice>{loading && !data ? <Loading /> : data && <><SummaryCards summary={getSummary(data)} /><div className="collection-snapshot"><Snapshot summary={getSummary(data)} /></div><BillingLedger bills={data.bills} onPaymentSaved={refresh} title="Collection ledger" description="Choose Collect on any bill with an outstanding balance." /></>}</div>
}
