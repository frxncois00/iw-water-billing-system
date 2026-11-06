import { PageHeader } from '../../components/UI.jsx'

const modules = {
  adjustments: {
    eyebrow: 'BILL CONTROL', title: 'Adjustments & corrections',
    description: 'Review and authorize changes to issued bills without losing the original transaction history.',
    items: ['Usage and meter-reading corrections', 'Charge, discount, and penalty adjustments', 'Required reason and approval trail'],
  },
  delinquent: {
    eyebrow: 'ACCOUNT CONTROL', title: 'Delinquent accounts',
    description: 'Monitor overdue balances and manage collection, disconnection, and reconnection follow-up.',
    items: ['Overdue account aging', 'Disconnection candidates and notices', 'Payment arrangements and reconnection status'],
  },
  rates: {
    eyebrow: 'BILLING CONFIGURATION', title: 'Rates & charges',
    description: 'Maintain approved cubic-meter rates and other charges with effective dates and history.',
    items: ['Single approved cubic-meter rate', 'Effective date and calculation preview', 'Required change reason and rate history'],
  },
  usersAudit: {
    eyebrow: 'ACCESS & ACCOUNTABILITY', title: 'Users and audit logs',
    description: 'Control staff access and review important actions performed throughout the system.',
    items: ['Administrator and Cashier / Staff accounts', 'Roles, status, and access control', 'Billing, payment, customer, and settings activity logs'],
  },
  settings: {
    eyebrow: 'SYSTEM CONFIGURATION', title: 'Settings',
    description: 'Manage the utility details and defaults used across billing, receipts, reports, and offline processing.',
    items: ['Utility and office information', 'Billing, receipt, and PDF defaults', 'Payment methods, numbering, backup, and export options'],
  },
}

export default function AdminModule({ module }) {
  const content = modules[module]
  return <div className="page-content admin-module-page">
    <PageHeader eyebrow={content.eyebrow} title={content.title} description={content.description} />
    <section className="panel module-purpose-panel">
      <h2>What this module is for</h2>
      <div className="module-purpose-list">{content.items.map((item, index) => <div key={item}><span>{index + 1}</span><p>{item}</p></div>)}</div>
      <p className="module-status-note">Module workspace ready for the next implementation phase.</p>
    </section>
  </div>
}
