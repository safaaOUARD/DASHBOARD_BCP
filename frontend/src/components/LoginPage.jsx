import { useState } from 'react'
import { login } from '../api'
import { saveSession } from '../utils/auth'

export default function LoginPage({ onLoggedIn }) {
  const [email, setEmail] = useState('')
  const [motDePasse, setMotDePasse] = useState('')
  const [erreur, setErreur] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    setErreur(null)
    try {
      const res = await login(email, motDePasse)
      saveSession(res.token, res.utilisateur)
      onLoggedIn(res.utilisateur)
    } catch (err) {
      setErreur(err?.response?.data?.detail || 'Erreur de connexion.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bp-cream)' }}>
      <form onSubmit={handleSubmit} className="modal-box" style={{ width: 360 }}>
        <h2 style={{ marginBottom: 20 }}>Dashboard BCP — Connexion</h2>
        {erreur && <div className="status-msg status-error">{erreur}</div>}
        <div className="filter-field" style={{ marginBottom: 14 }}>
          <label>Email</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </div>
        <div className="filter-field" style={{ marginBottom: 20 }}>
          <label>Mot de passe</label>
          <input type="password" value={motDePasse} onChange={(e) => setMotDePasse(e.target.value)} required />
        </div>
        <button className="btn btn-primary" style={{ width: '100%' }} disabled={submitting}>
          {submitting ? 'Connexion…' : 'Se connecter'}
        </button>
      </form>
    </div>
  )
}