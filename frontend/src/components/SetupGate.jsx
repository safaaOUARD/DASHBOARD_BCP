import { useEffect, useState } from 'react'
import SetupPage from './SetupPage'

/**
 * Interroge /api/setup/status au demarrage de l'application.
 * - initialized === false -> affiche SetupPage (creation du premier admin)
 * - initialized === true  -> affiche le reste de l'application (children)
 *
 * A utiliser en enveloppant l'arbre applicatif existant, par exemple
 * dans main.jsx ou App.jsx :
 *
 *   <SetupGate>
 *     <AuthProvider>
 *       <RouterProvider router={router} />
 *     </AuthProvider>
 *   </SetupGate>
 */
export default function SetupGate({ children }) {
  const [statut, setStatut] = useState('chargement') // 'chargement' | 'setup' | 'pret' | 'erreur'

  useEffect(() => {
    verifierStatut()
  }, [])

  async function verifierStatut() {
    setStatut('chargement')
    try {
      const reponse = await fetch('/api/setup/status')
      if (!reponse.ok) throw new Error('reponse invalide')
      const data = await reponse.json()
      setStatut(data.initialized ? 'pret' : 'setup')
    } catch (err) {
      setStatut('erreur')
    }
  }

  if (statut === 'chargement') {
    return (
      <div className="setup-gate-loading">
        <p>Chargement...</p>
      </div>
    )
  }

  if (statut === 'erreur') {
    return (
      <div className="setup-gate-loading">
        <p>Impossible de contacter le serveur.</p>
        <button onClick={verifierStatut}>Réessayer</button>
      </div>
    )
  }

  if (statut === 'setup') {
    return <SetupPage onAdminCree={() => setStatut('pret')} />
  }

  return children
}