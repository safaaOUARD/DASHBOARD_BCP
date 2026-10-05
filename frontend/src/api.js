import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
})
import { getToken, logout } from './utils/auth'

api.interceptors.request.use((config) => {
  const token = getToken()
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  (r) => r,
  (err) => {
    if (err?.response?.status === 401) {
      logout()
      window.location.reload()
    }
    return Promise.reject(err)
  }
)
export const getDashboardStats = (params) => api.get('/dashboard/stats', { params }).then((r) => r.data)

export const getFilterOptions = (params) => api.get('/filters', { params }).then((r) => r.data)

export const getEngagements = (params) =>
  api.get('/engagements', { params }).then((r) => r.data)

// Historique des imports (table journal_import), alimente par app/services/etl.py
export const getImports = () => api.get('/import/statut').then((r) => r.data)
//
export const getDernierImport = () => 
  api.get('/import/statut', { params: { limit: 1 } }).then((r) => r.data[0])
//Pour  la liste des fichiers enregistrer
export const getFichiersImportes = () => api.get('/fichiers').then((r) => r.data)
// Depot d'un fichier : POST /api/import (voir app/routers/import_router.py).
// Le traitement (lecture xlsb, hash, insertion) tourne en arriere-plan ;
// la reponse HTTP ne confirme que le lancement, pas le resultat final.
export const uploadFile = (file, onProgress) => {
  const formData = new FormData()
  formData.append('file', file)
  return api
    .post('/import', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: (evt) => {
        if (onProgress && evt.total) {
          onProgress(Math.round((evt.loaded * 100) / evt.total))
        }
      },
    })
    .then((r) => r.data)
}
//devise export 
export const uploadDeviseFile = (file, onProgress) => {
  const formData = new FormData()
  formData.append('file', file)
  return api
    .post('/import/devise', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: (evt) => {
        if (onProgress && evt.total) {
          onProgress(Math.round((evt.loaded * 100) / evt.total))
        }
      },
    })
    .then((r) => r.data)
}
//rating pays export
export const uploadRatingFile = (file, onProgress) => {
  const formData = new FormData()
  formData.append('file', file)
  return api
    .post('/import/rating', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: (evt) => {
        if (onProgress && evt.total) {
          onProgress(Math.round((evt.loaded * 100) / evt.total))
        }
      },
    })
    .then((r) => r.data)
}

// Etat d'un import precis (id, statut, etape, progression, message
// d'erreur...), utilise par UploadModal.jsx en polling pour suivre la
// barre de progression pendant que l'ETL tourne en arriere-plan.
// Correspond a GET /api/import/statut?import_id=... (import_router.py).
export const getImportById = (importId) =>
  api.get('/import/statut', { params: { import_id: importId } }).then((r) => r.data)
//part for modification
export const updateEngagement = (id, valeurs, motif) =>
  api.patch(`/engagements/${id}`, {motif, valeurs }).then((r) => r.data)

export const getHistorique = (params) =>
  api.get('/historique', { params }).then((r) => r.data)
// 
export default api
//
export const login = (email, mot_de_passe) =>
  api.post('/auth/login', { email, mot_de_passe }).then((r) => r.data)

export const listUsers = () => api.get('/utilisateurs').then((r) => r.data)

export const createUser = (payload) => api.post('/utilisateurs', payload).then((r) => r.data)

export const updateUser = (id, payload) => api.patch(`/utilisateurs/${id}`, payload).then((r) => r.data)

export const exportExcel = (payload) =>
  api.post('/export/excel', payload, { responseType: 'blob' }).then((r) => r.data)
export const createEngagement = (valeurs, motif) =>
  api.post('/engagements', { valeurs, motif }).then((r) => r.data)

export const deleteEngagement = (id, motif) =>
  api.delete(`/engagements/${id}`, { params: { motif } }).then((r) => r.data)

export const getFichiersImportesPage = (params) =>
  api.get('/fichiers', { params }).then((r) => r.data)

export const deleteFichierImporte = (id) =>
  api.delete(`/fichiers/${id}`).then((r) => r.data)

export const assistantChat = (payload) => api.post('/assistant/chat', payload).then((r) => r.data)
export const assistantAnalyze = (payload) => api.post('/assistant/analyze', payload).then((r) => r.data)
export const assistantCompare = (payload) => api.post('/assistant/compare', payload).then((r) => r.data)
export const downloadAssistantReport = (format, payload) =>
  api.post(`/assistant/report/${format}`, payload, { responseType: 'blob' }).then((r) => r.data)
