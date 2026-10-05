import { useEffect, useState } from 'react'
import { getHistorique } from '../api'

function fmtDateTime(d) {
  return new Date(d).toLocaleString('fr-FR')
}

export default function HistoriquePanel({ onClose }) {
  const [data, setData] = useState(null)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    setLoading(true)
    getHistorique({ page, page_size: 50 })
      .then(setData)
      .finally(() => setLoading(false))
  }, [page])

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" style={{ width: 900, maxWidth: '95vw' }} onClick={(e) => e.stopPropagation()}>
        <h2>Historique des modifications</h2>

        {loading && <p className="desc">Chargement…</p>}

        {data && (
          <div className="table-scroll" style={{ maxHeight: 500, overflowY: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Utilisateur</th>
                  <th>Ligne (id)</th>
                  <th>Colonne</th>
                  <th>Ancienne valeur</th>
                  <th>Nouvelle valeur</th>
                  <th>Motif</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((h) => (
                  <tr key={h.id}>
                    <td>{fmtDateTime(h.date_modification)}</td>
                    <td>{h.utilisateur}</td>
                    <td>{h.id_ligne}</td>
                    <td><span className="badge">{h.nom_colonne}</span></td>
                    <td>{h.ancienne_valeur ?? '—'}</td>
                    <td>{h.nouvelle_valeur ?? '—'}</td>
                    <td>{h.motif ?? '—'}</td>
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