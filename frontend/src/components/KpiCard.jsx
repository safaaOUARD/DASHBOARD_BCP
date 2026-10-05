export default function KpiCard({ icon, label, value, sub }) {
  return (
    <div className="kpi-card">
      <div className="kpi-card-top">
        <div className="kpi-label">{label}</div>
        {icon && <div className="kpi-icon">{icon}</div>}
      </div>
      <div className="kpi-value">{value}</div>
      {sub && <div className="kpi-sub">{sub}</div>}
    </div>
  )
}
