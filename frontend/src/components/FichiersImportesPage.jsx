import { useEffect, useState } from 'react'
import { getFichiersImportesPage, deleteFichierImporte } from '../api'

function fmtDateTime(d) {
  return d ? new Date(d).toLocaleString('fr-FR') : '—'
}
function fmtDate(d) {
  return d ? new Date(d).toLocaleDateString('fr-FR') : '—'
}

export default function FichiersImportesPage({ estAdmin, onClose, onFichierSupprime }) {
  const [data, setData] = useState(null)
  const [page, setPage] = useState(1)
  const [statut, setStatut] = useState('tous')
  const [typeImport, setTypeImport] = useState('')
  const [loading, setLoading] = useState(false)
  const [suppression, setSuppression] = useState(null)

  const charger = () => {
    setLoading(true)
    getFichiersImportesPage({
      page, page_size: 20, statut,
      ...(typeImport ? { type_import: typeImport } : {}),
    })
      .then(setData)
      .finally(() => setLoading(false))
  }

  useEffect(() => { charger() }, [page, statut, typeImport])

  const handleSupprimer = async (fichier) => {
    const confirmation = window.confirm(
      `Supprimer définitivement "${fichier.nom_fichier}" ?\n\n` +
      (fichier.type_import === 'devise'
        ? "Les taux de change de cet import seront retirés, et ead_mad/el_mad seront réinitialisés pour les lignes concernées."
        : `Toutes les lignes fact_engagement liées à cet import (${fichier.nb_lignes ?? '?'} lignes) seront supprimées.`) +
      "\n\nCette action est irréversible."
    )
    if (!confirmation) return

    setSuppression(fichier.id)
    try {
      const res = await deleteFichierImporte(fichier.id)
      alert(`Import supprimé. ${res.nb_lignes_supprimees} ligne(s) retirée(s).`)
      charger()
      onFichierSupprime?.()
    } catch (err) {
      alert(err?.response?.data?.detail || 'Erreur lors de la suppression.')
    } finally {
      setSuppression(null)
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" style={{ width: 950, maxWidth: '96vw' }} onClick={(e) => e.stopPropagation()}>
        <h2>Fichiers importés</h2>

        <div className="filter-grid" style={{ marginBottom: 16 }}>
          <div className="filter-field">
            <label>Statut</label>
            <select value={statut} onChange={(e) => { setStatut(e.target.value); setPage(1) }}>
              <option value="tous">Tous</option>
              <option value="succes">Succès</option>
              <option value="echec">Échec</option>
              <option value="ignore">Ignoré (doublon)</option>
            </select>
          </div>
          <div className="filter-field">
            <label>Type</label>
            <select value={typeImport} onChange={(e) => { setTypeImport(e.target.value); setPage(1) }}>
              <option value="">Tous</option>
              <option value="base">Fichier de base</option>
              <option value="devise">Fichier de devises</option>
            </select>
          </div>
        </div>

        {loading && <p className="desc">Chargement…</p>}

        {data && (
          <div className="table-scroll" style={{ maxHeight: 480, overflowY: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Nom fichier</th>
                  <th>Type</th>
                  <th>Date import</th>
                  <th>Date arrêt</th>
                  <th className="num">Nb lignes</th>
                  <th>Statut</th>
                  {estAdmin && <th>Action</th>}
                </tr>
              </thead>
              <tbody>
                {data.items.map((f) => (
                  <tr key={f.id}>
                    <td>{f.nom_fichier}</td>
                    <td><span className="badge">{f.type_import}</span></td>
                    <td>{fmtDateTime(f.date_import)}</td>
                    <td>{fmtDate(f.date_arret)}</td>
                    <td className="num">{f.nb_lignes ?? '—'}</td>
                    <td>
                      <span className={f.statut === 'succes' ? 'badge' : 'badge badge-douteux'}>
                        {f.statut}
                      </span>
                    </td>
                    {estAdmin && (
                      <td>
                        <button
                          className="btn btn-outline"
                          style={{ padding: '2px 8px', color: 'var(--bp-danger)' }}
                          disabled={suppression === f.id}
                          onClick={() => handleSupprimer(f)}
                        >
                          {suppression === f.id ? '…' : '🗑 Supprimer'}
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="modal-actions" style={{ marginTop: 16 }}>
          <button className="btn btn-outline" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>‹ Précédent</button>
          <span style={{ alignSelf: 'center', fontSize: 13 }}>Page {data?.page} / {data?.total_pages}</span>
          <button className="btn btn-outline" disabled={data && page >= data.total_pages} onClick={() => setPage((p) => p + 1)}>Suivant ›</button>
          <button className="btn btn-primary" onClick={onClose}>Fermer</button>
        </div>
      </div>
    </div>
  )
}