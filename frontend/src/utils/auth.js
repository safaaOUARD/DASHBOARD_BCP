const TOKEN_KEY = 'dashboard_bcp_token'
const USER_KEY = 'dashboard_bcp_user'

export function saveSession(token, utilisateur) {
  localStorage.setItem(TOKEN_KEY, token)
  localStorage.setItem(USER_KEY, JSON.stringify(utilisateur))
}

export function getToken() {
  return localStorage.getItem(TOKEN_KEY)
}

export function getUser() {
  const raw = localStorage.getItem(USER_KEY)
  return raw ? JSON.parse(raw) : null
}

export function logout() {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(USER_KEY)
}