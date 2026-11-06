import PrintableBill from '../../components/PrintableBill.jsx'

export function AdminBillPrint() {
  return <PrintableBill area="admin" />
}

export default function CashierBillPrint() {
  return <PrintableBill area="cashier" />
}
