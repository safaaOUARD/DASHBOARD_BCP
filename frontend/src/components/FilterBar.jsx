export default function FilterBar({ options, draft, onChange, onApply, onReset }) {
  const filialesForZone = draft.zone
    ? options.filiales.filter((f) => f.zone === draft.zone)
    : options.filiales

  return (
    <div className="filter-panel">
      <div className="filter-panel-header">Filtres</div>
      <div className="filter-grid">
        <div className="filter-field">
          <label>Filiale</label>
          <select
            value={draft.filiale}
            onChange={(e) => onChange({ ...draft, filiale: e.target.value })}
          >
            <option value="">Toutes</option>
            {filialesForZone.map((f) => (
              <option key={f.code} value={f.code}>
                {f.code} — {f.nom}
              </option>
            ))}
          </select>
        </div>

        <div className="filter-field">
          <label>Type</label>
          <select
            value={draft.type}
            onChange={(e) => onChange({ ...draft, type: e.target.value })}
          >
            <option value="">Tous</option>
            {options.types.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>

        <div className="filter-field">
          <label>Type engagement</label>
          <select
            value={draft.type_engagement}
            onChange={(e) => onChange({ ...draft, type_engagement: e.target.value })}
          >
            <option value="">Tous</option>
            {options.types_engagement.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>

        <div className="filter-field">
          <label>Intra groupe</label>
          <select
            value={draft.intra_group}
            onChange={(e) => onChange({ ...draft, intra_group: e.target.value })}
          >
            <option value="">Tous</option>
            <option value="1">Oui</option>
            <option value="0">Non</option>
          </select>
        </div>

        <div className="filter-field">
          <label>Segment</label>
          <select
            value={draft.segment}
            onChange={(e) => onChange({ ...draft, segment: e.target.value })}
          >
            <option value="">Toutes</option>
            {options.segments.map((s) => (
              <option key={s.code} value={s.code}>
                {s.libelle || s.code}
              </option>
            ))}
          </select>
        </div>

        <div className="filter-field">
          <label>Risque pays</label>
          <select
            value={draft.risque_pays}
            onChange={(e) => onChange({ ...draft, risque_pays: e.target.value })}
          >
            <option value="">Tous</option>
            {options.risques_pays.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </div>

        <div className="filter-field">
          <label>WL</label>
          <select
            value={draft.wl}
            onChange={(e) => onChange({ ...draft, wl: e.target.value })}
          >
            <option value="">Tous</option>
            {options.wl.map((w) => (
              <option key={w} value={w}>
                {w}
              </option>
            ))}
          </select>
        </div>

        <div className="filter-field">
          <label>Zone</label>
          <select
            value={draft.zone}
            onChange={(e) => onChange({ ...draft, zone: e.target.value, filiale: '' })}
          >
            <option value="">Toutes</option>
            {options.zones.map((z) => (
              <option key={z} value={z}>
                {z}
              </option>
            ))}
          </select>
        </div>

        <div className="filter-field filter-actions">
          <button className="btn btn-primary" onClick={onApply}>
            Appliquer
          </button>
          <button className="btn btn-outline" onClick={onReset}>
            Réinitialiser
          </button>
        </div>
      </div>
    </div>
  )
}