function fmtDate(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('fr-FR')
}

export default function FichiersImportesPanel({ fichiers, selected, onChange }) {
  const toggle = (nom) => {
    if (selected.includes(nom)) {
      onChange(selected.filter((f) => f !== nom))
    } else {
      onChange([...selected, nom])
    }
  }

  return (
    <div className="filter-panel">
      <div className="filter-panel-header">Fichiers importés</div>
      {fichiers.map((f) => (
        <label key={f.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0' }}>
          <input
            type="checkbox"
            checked={selected.includes(f.nom_fichier)}
            onChange={() => toggle(f.nom_fichier)}
          />
          <span>
            {f.nom_fichier} — {f.nb_lignes} lignes — {fmtDate(f.date_arret)}
          </span>
        </label>
      ))}
    </div>
  )
}