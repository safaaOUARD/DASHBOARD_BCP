import { useState } from 'react'
import './SetupPage.css'

const EMAIL_REGEX = /^[^@\s]+@[^@\s]+\.[^@\s]+$/

function validerFormulaire({ nom, email, motDePasse, confirmation }) {
  const erreurs = {}

  if (!nom.trim()) {
    erreurs.nom = 'Le nom est requis.'
  }

  if (!email.trim()) {
    erreurs.email = "L'email est requis."
  } else if (!EMAIL_REGEX.test(email.trim())) {
    erreurs.email = 'Adresse email invalide.'
  }

  if (motDePasse.length < 8) {
    erreurs.motDePasse = 'Le mot de passe doit contenir au moins 8 caractères.'
  }

  if (confirmation !== motDePasse) {
    erreurs.confirmation = 'Les mots de passe ne correspondent pas.'
  }

  return erreurs
}

export default function SetupPage({ onAdminCree }) {
  const [nom, setNom] = useState('')
  const [email, setEmail] = useState('')
  const [motDePasse, setMotDePasse] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [erreurs, setErreurs] = useState({})
  const [erreurServeur, setErreurServeur] = useState(null)
  const [envoiEnCours, setEnvoiEnCours] = useState(false)

  async function gererEnvoi(e) {
    e.preventDefault()
    setErreurServeur(null)

    const erreursValidation = validerFormulaire({ nom, email, motDePasse, confirmation })
    setErreurs(erreursValidation)
    if (Object.keys(erreursValidation).length > 0) return

    setEnvoiEnCours(true)
    try {
      const reponse = await fetch('/api/setup/create-admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nom: nom.trim(),
          email: email.trim(),
          mot_de_passe: motDePasse,
          confirmation_mot_de_passe: confirmation,
        }),
      })

      const data = await reponse.json()

      if (reponse.status === 409) {
        // Un admin a été créé entre-temps (ex : deux onglets ouverts
        // sur la page de setup).
        setErreurServeur('La configuration initiale a déjà été effectuée. Rechargement...')
        setTimeout(() => window.location.reload(), 1500)
        return
      }

      if (!reponse.ok) {
        setErreurServeur(data.detail || "Erreur lors de la création de l'administrateur.")
        return
      }

      // Connexion automatique : on stocke le token comme le fait la
      // page de connexion habituelle.
      // ADAPTER ICI si vous avez un AuthContext / une fonction de
      // login centralisée plutôt qu'un accès direct à localStorage.
      localStorage.setItem('token', data.token)
      localStorage.setItem('utilisateur', JSON.stringify(data.utilisateur))

      onAdminCree?.()
    } catch (err) {
      setErreurServeur('Impossible de contacter le serveur.')
    } finally {
      setEnvoiEnCours(false)
    }
  }

  return (
    <div className="setup-page">
      <div className="setup-card">
        <h1 className="setup-title">Configuration initiale</h1>
        <p className="setup-subtitle">
          Aucun utilisateur n'existe encore. Créez le compte administrateur
          pour démarrer.
        </p>

        <form onSubmit={gererEnvoi} noValidate>
          <div className="setup-field">
            <label htmlFor="nom">Nom</label>
            <input
              id="nom"
              type="text"
              value={nom}
              onChange={(e) => setNom(e.target.value)}
              disabled={envoiEnCours}
            />
            {erreurs.nom && <span className="setup-erreur-champ">{erreurs.nom}</span>}
          </div>

          <div className="setup-field">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={envoiEnCours}
            />
            {erreurs.email && <span className="setup-erreur-champ">{erreurs.email}</span>}
          </div>

          <div className="setup-field">
            <label htmlFor="motDePasse">Mot de passe</label>
            <input
              id="motDePasse"
              type="password"
              value={motDePasse}
              onChange={(e) => setMotDePasse(e.target.value)}
              disabled={envoiEnCours}
            />
            {erreurs.motDePasse && (
              <span className="setup-erreur-champ">{erreurs.motDePasse}</span>
            )}
          </div>

          <div className="setup-field">
            <label htmlFor="confirmation">Confirmation du mot de passe</label>
            <input
              id="confirmation"
              type="password"
              value={confirmation}
              onChange={(e) => setConfirmation(e.target.value)}
              disabled={envoiEnCours}
            />
            {erreurs.confirmation && (
              <span className="setup-erreur-champ">{erreurs.confirmation}</span>
            )}
          </div>

          {erreurServeur && <div className="setup-erreur-serveur">{erreurServeur}</div>}

          <button type="submit" className="setup-bouton" disabled={envoiEnCours}>
            {envoiEnCours ? 'Création en cours...' : "Créer l'administrateur"}
          </button>
        </form>
      </div>
    </div>
  )
}