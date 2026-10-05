// Placeholder en attendant un vrai systeme de login.
// A REMPLACER des qu'une authentification existe : ce champ n'est pas
// securise, n'importe qui peut le modifier depuis son navigateur.
export function getUtilisateurCourant() {
  let nom = localStorage.getItem('dashboard_bcp_utilisateur')
  if (!nom) {
    nom = window.prompt('Votre nom (pour la traçabilité des modifications) :') || 'Utilisateur inconnu'
    localStorage.setItem('dashboard_bcp_utilisateur', nom)
  }
  return nom
}

export function changerUtilisateurCourant() {
  const nom = window.prompt('Changer de nom :')
  if (nom) localStorage.setItem('dashboard_bcp_utilisateur', nom)
  return nom
}