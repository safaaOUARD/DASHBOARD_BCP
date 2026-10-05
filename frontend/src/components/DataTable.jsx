import { useMemo, useState } from 'react'
import EmptyState from './EmptyState'
import LoadingSkeleton from './LoadingSkeleton'

function fmtNum(n) {
  if (n === null || n === undefined) return '—'
  return new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(n)
}

function fmtDate(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('fr-FR')
}

const COLONNES = [
  { key: 'type', label: 'Type' },
  { key: 'filiale', label: 'Filiale' },
  { key: 'filiale_2', label: 'Filiale 2' },
  { key: 'devise', label: 'Devise' },
  { key: 'nom_client', label: 'Client' },
  { key: 'cle', label: 'Clé' },
  { key: 'type_engagement', label: 'Type engagement' },
  { key: 'encours', label: 'Encours', num: true },
  { key: 'intra_group', label: 'Intra groupe' },
  { key: 'segment', label: 'Segment' },
  { key: 'risque_pays', label: 'Pays risque' },
  { key: 'encours_sains', label: 'Encours sains', num: true },
  { key: 'encours_impayes', label: 'Encours impayés', num: true },
  { key: 'encours_restrectures', label: 'Encours restructurés', num: true },
  { key: 'encours_douteux', label: 'Encours douteux', num: true },
  { key: 'stock_provision', label: 'Stock provision', num: true },
  { key: 'nbr_impaye', label: 'Nbr impayé', num: true },
  { key: 'anteriorite_impaye', label: 'Antériorité impayé', num: true },
  { key: 'code_ape', label: 'Code APE' },
  { key: 'lib_ape', label: 'Lib APE' },
  { key: 'wl', label: 'WL' },
  { key: 'b1', label: 'B1' },
  { key: 'b2', label: 'B2' },
  { key: 'b3', label: 'B3' },
  { key: 'bucket', label: 'bucket', visible: true, exportable: true, sortable: true, filterable: true, width: null, align: 'left' },
  { key: 'date_maj', label: 'Date maj', date: true },
  { key: 'date_arret', label: 'Date arrêt', date: true },
  { key: 'el', label: 'EL', num: true },
  { key: 'secteur_activite', label: 'Secteur activité' },
  { key: 'el_mad', label: 'EL MAD', num: true, readOnly: true },
  { key: 'ead_mad', label: 'EAD MAD', num: true, readOnly: true },
  { key: 'el_mad_trim_prec', label: 'EL MAD T-1 Trim.', num: true, readOnly: true },
  { key: 'ead_mad_trim_prec', label: 'EAD MAD T-1 Trim.', num: true, readOnly: true },
  { key: 'el_mad_annee_prec', label: 'EL MAD T-N-1', num: true, readOnly: true },
  { key: 'ead_mad_annee_prec', label: 'EAD MAD T-N-1', num: true, readOnly: true },
  { key: 'el_mad_arret_annuel', label: 'EL MAD Arrêt annuel', num: true, readOnly: true },
  { key: 'ead_mad_arret_annuel', label: 'EAD MAD Arrêt annuel', num: true, readOnly: true },
  { key: 'perimetre_exposition', label: 'Périmétre exposition', num: true, readOnly: true },
  { key: 'perimetre_limites_pays', label: 'périmètre limites pays', readOnly: true, render: (value) => value ? 1 : 0 },
  { key: 'zone', label: 'Zone' },
]

export default function DataTable({
  loading, data, editMode, pendingChanges, onCellChange,
  selectable, selectedIds, onToggleSelect,
  draftRows, onAddDraftRow, onDraftChange, onRemoveDraftRow,
  onDeleteRow,
}) {
  const [hiddenCols, setHiddenCols] = useState([])
  const [columnMenuOpen, setColumnMenuOpen] = useState(false)
  const [sort, setSort] = useState({ key: null, dir: 1 })

  const colonnesVisibles = useMemo(
    () => COLONNES.filter((c) => !hiddenCols.includes(c.key)),
    [hiddenCols]
  )

  const toggleColonne = (key) => {
    setHiddenCols((prev) => prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key])
  }

  const resetColonnes = () => setHiddenCols([])

  const handleSort = (key) => {
    setSort((prev) => prev.key === key ? { key, dir: prev.dir * -1 } : { key, dir: 1 })
  }

  const items = useMemo(() => {
    if (!data?.items) return []
    if (!sort.key) return data.items
    const copy = [...data.items]
    copy.sort((a, b) => {
      const va = a[sort.key]
      const vb = b[sort.key]
      if (va === vb) return 0
      if (va === null || va === undefined) return 1
      if (vb === null || vb === undefined) return -1
      return va > vb ? sort.dir : -sort.dir
    })
    return copy
  }, [data, sort])

  if (loading) {
    return (
      <div className="table-card">
        <div className="table-card-header">
          <div className="table-card-title">
            <h3>Données des engagements</h3>
          </div>
        </div>
        <LoadingSkeleton rows={10} />
      </div>
    )
  }

  if (!data || data.items.length === 0) {
    if (!editMode) {
      return (
        <div className="table-card">
          <div className="table-card-header">
            <div className="table-card-title">
              <h3>Données des engagements</h3>
            </div>
          </div>
          <EmptyState />
        </div>
      )
    }
  }

  return (
    <div className="table-card">
      <div className="table-card-header">
        <div className="table-card-title">
          <h3>Données des engagements</h3>
          {data && (
            <span>
              {data.total.toLocaleString('fr-FR')} ligne(s) · {colonnesVisibles.length} / {COLONNES.length} colonne(s)
            </span>
          )}
        </div>
        <div className="column-manager">
          <button className="btn btn-outline" onClick={() => setColumnMenuOpen((v) => !v)}>
            ⚏ Colonnes
          </button>
          {columnMenuOpen && (
            <div className="column-manager-dropdown">
              {COLONNES.map((c) => (
                <label className="column-manager-item" key={c.key}>
                  <input
                    type="checkbox"
                    checked={!hiddenCols.includes(c.key)}
                    onChange={() => toggleColonne(c.key)}
                  />
                  {c.label}
                </label>
              ))}
            </div>
          )}
        </div>
        <button className="btn btn-outline" onClick={resetColonnes}>↺ Réinitialiser</button>
      </div>

      {data && (
        <div className="table-meta">
          <span>
            {data.default_view ? (
              <>Aperçu par défaut (dernier arrêté) — <strong>{data.total}</strong> dossier(s).</>
            ) : (
              <><strong>{data.total.toLocaleString('fr-FR')}</strong> résultat(s) trouvé(s)</>
            )}
          </span>
          <span>Page {data.page} / {data.total_pages}</span>
        </div>
      )}

      {editMode && (
        <div style={{ padding: '10px 20px', borderBottom: '1px solid var(--bp-border)' }}>
          <button className="btn btn-outline" onClick={onAddDraftRow}>+ Ajouter une ligne</button>
        </div>
      )}

      <div className="table-scroll">
        <table className="data-table">
          <thead>
            <tr>
              {selectable && <th style={{ width: 32 }}></th>}
              {editMode && <th style={{ width: 32 }}></th>}
              {colonnesVisibles.map((c) => (
                <th key={c.key} className={c.num ? 'num' : ''} onClick={() => handleSort(c.key)}>
                  {c.label}
                  {sort.key === c.key && (
                    <span className="sort-caret">{sort.dir === 1 ? '▲' : '▼'}</span>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {editMode && draftRows.map((draft) => (
              <tr key={draft.tempId} style={{ background: 'var(--bp-primary-light)' }}>
                {selectable && <td></td>}
                <td>
                  <button className="btn btn-outline" style={{ padding: '2px 8px' }} onClick={() => onRemoveDraftRow(draft.tempId)}>✕</button>
                </td>
                {colonnesVisibles.map((c) => (
                  <td key={c.key}>
                    {!c.readOnly && (
                      <input
                        className="cell-input"
                        value={draft.valeurs[c.key] ?? ''}
                        onChange={(e) => onDraftChange(draft.tempId, c.key, e.target.value)}
                      />
                    )}
                  </td>
                ))}
              </tr>
            ))}

            {items.map((row) => (
              <tr key={row.id}>
                {selectable && (
                  <td>
                    <input type="checkbox" checked={selectedIds.includes(row.id)} onChange={() => onToggleSelect(row.id)} />
                  </td>
                )}
                {editMode && (
                  <td>
                    <button
                      className="btn btn-outline"
                      style={{ padding: '2px 8px', color: 'var(--bp-danger)' }}
                      onClick={() => onDeleteRow(row.id)}
                      title="Supprimer cette ligne"
                    >
                      🗑
                    </button>
                  </td>
                )}
                {colonnesVisibles.map((c) => {
                  const valeurModifiee = pendingChanges?.[row.id]?.[c.key]
                  const aUneModif = valeurModifiee !== undefined
                  const valeurAffichee = aUneModif ? valeurModifiee : row[c.key]

                  if (editMode && !c.readOnly) {
                    return (
                      <td key={c.key} className={aUneModif ? 'cell-modifiee' : ''}>
                        <input
                          className="cell-input"
                          value={valeurAffichee ?? ''}
                          onChange={(e) => onCellChange(row.id, c.key, e.target.value)}
                        />
                      </td>
                    )
                  }

                  let contenu
                  if (c.render) contenu = c.render(row[c.key])
                  else if (c.date) contenu = fmtDate(row[c.key])
                  else if (c.num) contenu = fmtNum(row[c.key])
                  else if (c.key === 'intra_group') contenu = row[c.key] ? 'Oui' : 'Non'
                  else contenu = row[c.key] ?? '—'

                  return <td key={c.key} className={c.num ? 'num' : ''}>{contenu}</td>
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}