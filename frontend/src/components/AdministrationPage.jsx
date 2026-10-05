import { useEffect, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { getFichiersImportesPage, deleteFichierImporte } from '../api'
import UploadModal from './UploadModal'
import AdminUsersPanel from './AdminUsersPanel'

function fmtDateTime(d) {
  return d ? new Date(d).toLocaleString('fr-FR') : '—'
}
function fmtDate(d) {
  return d ? new Date(d).toLocaleDateString('fr-FR') : '—'
}

/**
 * Page Administration : regroupe ce qui était auparavant dispersé sur la
 * page Accueil (Importer un fichier / Fichiers importés / Utilisateurs)
 * afin d'alléger le tableau de bord principal. Utilise les mêmes
 * endpoints/fonctions API existants, sans aucune modification côté backend.
 */
export default function AdministrationPage() {
  const { utilisateur } = useOutletContext()
  const estAdmin = utilisateur?.role === 'admin'

  const [data, setData] = useState(null)
  const [page, setPage] = useState(1)
  const [statut, setStatut] = useState('tous')
  const [typeImport, setTypeImport] = useState('')
  const [loading, setLoading] = useState(false)
  const [suppression, setSuppression] = useState(null)
  const [showUpload, setShowUpload] = useState(false)
  const [showUsersPanel, setShowUsersPanel] = useState(false)

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
    } catch (err) {
      alert(err?.response?.data?.detail || 'Erreur lors de la suppression.')
    } finally {
      setSuppression(null)
    }
  }

  return (
    <main className="main-container">
      <div className="table-card-header" style={{ marginBottom: 20, borderBottom: 'none' }}>
        <div className="table-card-title">
          <h3 style={{ fontSize: 18 }}>Administration</h3>
          <span>Import de fichiers, historique des imports et gestion des utilisateurs</span>
        </div>
      </div>

      <div className="table-card" style={{ marginBottom: 20 }}>
        <div className="table-card-header">
          <div className="table-card-title">
            <h3>Fichiers importés</h3>
            {data && <span>{data.total} fichier(s)</span>}
          </div>
          <button className="btn btn-primary" onClick={() => setShowUpload(true)}>⬆ Importer un fichier</button>
        </div>

        <div className="table-toolbar">
          <div className="filter-field" style={{ minWidth: 160 }}>
            <select value={statut} onChange={(e) => { setStatut(e.target.value); setPage(1) }}>
              <option value="tous">Tous les statuts</option>
              <option value="succes">Succès</option>
              <option value="echec">Échec</option>
              <option value="ignore">Ignoré (doublon)</option>
            </select>
          </div>
          <div className="filter-field" style={{ minWidth: 160 }}>
            <select value={typeImport} onChange={(e) => { setTypeImport(e.target.value); setPage(1) }}>
              <option value="">Tous les types</option>
              <option value="base">Fichier de base</option>
              <option value="devise">Fichier de devises</option>
              <option value="rating">Fichier de rating pays</option>
            </select>
          </div>
        </div>

        {loading && <div className="empty-state">Chargement…</div>}

        {!loading && data && (
          <div className="table-scroll">
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

        <div className="pagination">
          <span />
          <div className="pagination-pages">
            <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>‹ Précédent</button>
            <span style={{ fontSize: 12.5, color: 'var(--bp-text-secondary)' }}>Page {data?.page} / {data?.total_pages}</span>
            <button disabled={data && page >= data.total_pages} onClick={() => setPage((p) => p + 1)}>Suivant ›</button>
          </div>
        </div>
      </div>

      {estAdmin && (
        <div className="table-card">
          <div className="table-card-header">
            <div className="table-card-title">
              <h3>Utilisateurs &amp; rôles</h3>
              <span>Gestion des comptes et des permissions</span>
            </div>
            <button className="btn btn-outline" onClick={() => setShowUsersPanel(true)}>👤 Gérer les utilisateurs</button>
          </div>
        </div>
      )}

      {showUpload && (
        <UploadModal onClose={() => setShowUpload(false)} onUploaded={charger} />
      )}
      {showUsersPanel && <AdminUsersPanel onClose={() => setShowUsersPanel(false)} />}
    </main>
  )
}