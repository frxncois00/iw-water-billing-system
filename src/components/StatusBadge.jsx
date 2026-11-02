import { billStatus } from '../lib/format.js'

export default function StatusBadge({ status, bill }) {
  const value = bill ? billStatus(bill) : status || 'Unknown'
  return <span className={`status-badge status-${value.toLowerCase()}`}>{value}</span>
}
