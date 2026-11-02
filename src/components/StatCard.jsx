export default function StatCard({ label, value, icon: Icon, tone = 'blue', detail }) {
  return <div className="stat-card"><div className="stat-top"><span>{label}</span><span className={`stat-icon tone-${tone}`}>{Icon && <Icon size={19} strokeWidth={1.9} />}</span></div><strong>{value}</strong>{detail && <small>{detail}</small>}</div>
}
