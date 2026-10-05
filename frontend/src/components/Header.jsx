import { useState, useRef, useEffect } from 'react'
import { NavLink } from 'react-router-dom'
import { useDateArret } from '../context/DateArretContext'

const DASHBOARDS = [
  { path: '/', label: 'Engagements' },
  { path: '/dashboard/segmentation', label: 'Segmentation' },
  { path: '/dashboard/zone', label: 'Zone' },

  { path: '/dashboard/souverains', label: 'Souverains' },
  { path: '/dashboard/rating-pays', label: 'Rating Pays' },
  { path: '/dashboard/custom', label: 'Custom' },
  { path: '/dashboard/encours-souverains', label: 'Encours Souverains' },
]

function formatDate(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('fr-FR')
}

function formatDateTime(d) {
  if (!d) return '—'
  return new Date(d).toLocaleString('fr-FR')
}

export default function Header({ utilisateur, onOpenUpload, onLogout }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef(null)
  const { dateArret, setDateArret, datesDisponibles, derniereMiseAJour } = useDateArret()

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <header className="header">
      <div className="header-brand">
        <div className="header-logo">
          <img
            src="/logo-bp.png"
            alt="Banque Centrale Populaire"
            style={{ width: '100%', height: '100%', objectFit: 'contain', borderRadius: '50%' }}
          />
        </div>
        <div className="header-titles">
          <h1>Plateforme de Pilotage des Engagements</h1>
          <span className="header-subtitle">Banque Centrale Populaire</span>
          <span className="header-subtitle2">Surveillance Banques &amp; Filiales à l'International</span>
        </div>

        
          
        
      </div>

      <div className="header-right">
        {onOpenUpload && (
          <button className="btn btn-primary" onClick={onOpenUpload}>
            ⬆ Importer un fichier
          </button>
        )}

        <div className="header-date-field">
          <label htmlFor="header-date-arret">Date d'arrêt</label>
          <select
            id="header-date-arret"
            value={dateArret}
            onChange={(e) => setDateArret(e.target.value)}
          >
            {datesDisponibles.map((d) => (
              <option key={d} value={d}>{formatDate(d)}</option>
            ))}
          </select>
        </div>

        

        {utilisateur && (
          <div className="header-user">
            <div className="header-user-info">
              <span className="header-user-name">{utilisateur.nom}</span>
              <span className="header-user-role">
                {utilisateur.role === 'admin' ? 'Administrateur' : 'Consultant'}
              </span>
            </div>
            {onLogout && (
              <button className="btn btn-outline" style={{ padding: '6px 10px' }} onClick={onLogout}>
                Déconnexion
              </button>
            )}
          </div>
        )}
      </div>
    </header>
  )
}