function formatMontant(n) {
  if (n === null || n === undefined) return '—'
  return new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n)
}

function formatNumber(n) {
  if (n === null || n === undefined) return '—'
  return new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(n)
}

export default function KpiCards({ stats }) {
  if (!stats) return null

  const cards = [
    {
      label: 'EAD périmètre exposition',
      value: `${formatMontant(stats.ead_perimetre_exposition_mmad)} MMAD`,
      sub: 'Périmètre exposition',
    },
    {
      label: 'EAD souverains engagements & titres',
      value: `${formatMontant(stats.ead_souverains_engagements_titres_mmad)} MMAD`,
      sub: 'Segment souverains, engagements et titres',
    },
    {
      label: 'EL engagement',
      value: `${formatMontant(stats.el_engagement_mmad)} MMAD`,
      sub: "Type = ENGAGEMENT",
    },
    {
      label: 'EL titres et BDT',
      value: `${formatMontant(stats.el_titres_mmad)} MMAD`,
      sub: "Type = TITRE ET BDT",
    },
  ]

  return (
    <div className="kpi-grid">
      {cards.map((c) => (
        <div className="kpi-card" key={c.label}>
          <div className="kpi-label">{c.label}</div>
          <div className="kpi-value">{c.value}</div>
          <div className="kpi-sub">{c.sub}</div>
        </div>
      ))}
    </div>
  )
}