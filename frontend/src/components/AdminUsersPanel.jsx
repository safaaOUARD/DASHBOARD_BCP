import { useEffect, useState } from 'react'
import { listUsers, createUser, updateUser } from '../api'

const VIDE = { nom: '', email: '', mot_de_passe: '', role: 'consultant', peut_importer: false, peut_modifier: false, peut_exporter: false }

export default function AdminUsersPanel({ onClose }) {
  const [users, setUsers] = useState([])
  const [nouveau, setNouveau] = useState(VIDE)
  const [erreur, setErreur] = useState(null)

  const charger = () => listUsers().then(setUsers).catch(() => {})

  useEffect(() => { charger() }, [])

  const handleCreer = async (e) => {
    e.preventDefault()
    setErreur(null)
    try {
      await createUser(nouveau)
      setNouveau(VIDE)
      charger()
    } catch (err) {
      setErreur(err?.response?.data?.detail || 'Erreur lors de la creation.')
    }
  }

  const togglePermission = async (user, champ) => {
    await updateUser(user.id, { [champ]: !user[champ] })
    charger()
  }

  const toggleActif = async (user) => {
    await updateUser(user.id, { actif: !user.actif })
    charger()
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" style={{ width: 950, maxWidth: '96vw' }} onClick={(e) => e.stopPropagation()}>
        <h2>Gestion des utilisateurs</h2>

        <form onSubmit={handleCreer} className="filter-grid" style={{ marginBottom: 20 }}>
          <div className="filter-field">
            <label>Nom</label>
            <input value={nouveau.nom} onChange={(e) => setNouveau({ ...nouveau, nom: e.target.value })} required />
          </div>
          <div className="filter-field">
            <label>Email</label>
            <input type="email" value={nouveau.email} onChange={(e) => setNouveau({ ...nouveau, email: e.target.value })} required />
          </div>
          <div className="filter-field">
            <label>Mot de passe</label>
            <input type="password" value={nouveau.mot_de_passe} onChange={(e) => setNouveau({ ...nouveau, mot_de_passe: e.target.value })} required />
          </div>
          <div className="filter-field">
            <label>Rôle</label>
            <select value={nouveau.role} onChange={(e) => setNouveau({ ...nouveau, role: e.target.value })}>
              <option value="consultant">Consultant</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <div className="filter-field">
            <label>Permissions</label>
            <div style={{ display: 'flex', gap: 10, paddingTop: 6 }}>
              <label><input type="checkbox" checked={nouveau.peut_importer} onChange={(e) => setNouveau({ ...nouveau, peut_importer: e.target.checked })} /> Importer</label>
              <label><input type="checkbox" checked={nouveau.peut_modifier} onChange={(e) => setNouveau({ ...nouveau, peut_modifier: e.target.checked })} /> Modifier (ajouter / modifier / supprimer)</label>
              <label><input type="checkbox" checked={nouveau.peut_exporter} onChange={(e) => setNouveau({ ...nouveau, peut_exporter: e.target.checked })} /> Exporter</label>
            </div>
          </div>
          <div className="filter-field filter-actions">
            <button className="btn btn-primary" type="submit">+ Créer le compte</button>
          </div>
        </form>

        {erreur && <div className="status-msg status-error">{erreur}</div>}

        <table className="data-table">
          <thead>
            <tr>
              <th>Nom</th><th>Email</th><th>Rôle</th><th>Importer</th><th>Modifier</th><th>Exporter</th><th>Actif</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td>{u.nom}</td>
                <td>{u.email}</td>
                <td><span className="badge">{u.role}</span></td>
                <td><input type="checkbox" checked={u.peut_importer} disabled={u.role === 'admin'} onChange={() => togglePermission(u, 'peut_importer')} /></td>
                <td><input type="checkbox" checked={u.peut_modifier} disabled={u.role === 'admin'} onChange={() => togglePermission(u, 'peut_modifier')} /></td>
                <td><input type="checkbox" checked={u.peut_exporter} disabled={u.role === 'admin'} onChange={() => togglePermission(u, 'peut_exporter')} /></td>
                <td>
                  <button className="btn btn-outline" onClick={() => toggleActif(u)}>
                    {u.actif ? 'Désactiver' : 'Activer'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="modal-actions" style={{ marginTop: 16 }}>
          <button className="btn btn-primary" onClick={onClose}>Fermer</button>
        </div>
      </div>
    </div>
  )
}