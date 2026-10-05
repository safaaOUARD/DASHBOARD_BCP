import { useRef, useState, useEffect, useCallback } from 'react'
import { uploadFile, uploadDeviseFile, uploadRatingFile, getImportById } from '../api'

const INTERVALLE_POLLING_MS = 1500

export default function UploadModal({ onClose, onUploaded }) {
  const [file, setFile] = useState(null)
  const [typeFichier, setTypeFichier] = useState('base') 
  const [dragActive, setDragActive] = useState(false)

 
  const [phase, setPhase] = useState('idle')
  const [uploadProgress, setUploadProgress] = useState(0)
  const [etapeEtl, setEtapeEtl] = useState(null)
  const [progressionEtl, setProgressionEtl] = useState(0)

  const [status, setStatus] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const inputRef = useRef(null)
  const pollingRef = useRef(null)

  const EXTENSIONS_PAR_TYPE = {
    base: ['.xlsx', '.xlsb', '.xls'],
    devise: ['.xlsx', '.xlsb', '.xls'],
    rating: ['.xlsx', '.xlsb', '.csv'],
  }
  const extensionsAcceptees = EXTENSIONS_PAR_TYPE[typeFichier]

  const arreterPolling = useCallback(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current)
      pollingRef.current = null
    }
  }, [])

  
  useEffect(() => {
    return () => arreterPolling()
  }, [arreterPolling])

  const handleFiles = (files) => {
    if (files && files.length > 0) {
      const f = files[0]
      const nom = f.name.toLowerCase()
      const extensionValide = extensionsAcceptees.some((ext) => nom.endsWith(ext))

      if (!extensionValide) {
        setStatus({
          type: 'error',
          message: `Formats acceptés pour ce type d'import : ${extensionsAcceptees.join(', ')}.`,
        })
        setFile(null)
        return
      }
      setFile(f)
      setStatus(null)
    }
  }

  const suivreProgression = (importId) => {
    setPhase('traitement')
    arreterPolling()

    pollingRef.current = setInterval(async () => {
      try {
        const etat = await getImportById(importId)
        if (!etat) return

        setEtapeEtl(etat.etape)
        setProgressionEtl(etat.progression ?? 0)

        if (etat.statut === 'succes') {
          arreterPolling()
          setPhase('termine')
          setSubmitting(false)
          setStatus({
            type: 'success',
            message: `Import terminé : ${etat.nb_lignes ?? '—'} ligne(s).`,
          })
          onUploaded?.()
        } else if (etat.statut === 'echec') {
          arreterPolling()
          setPhase('termine')
          setSubmitting(false)
          setStatus({
            type: 'error',
            message: etat.message_erreur || "L'import a échoué.",
          })
        }
       
      } catch (err) {
        arreterPolling()
        setPhase('termine')
        setSubmitting(false)
        setStatus({
          type: 'error',
          message: "Impossible de suivre la progression de l'import.",
        })
      }
    }, INTERVALLE_POLLING_MS)
  }

  const handleSubmit = async () => {
    if (!file) return
    setSubmitting(true)
    setStatus(null)
    setUploadProgress(0)
    setEtapeEtl(null)
    setProgressionEtl(0)
    setPhase('envoi')

    try {
      let reponse
      if (typeFichier === 'devise') {
        reponse = await uploadDeviseFile(file, setUploadProgress)
      } else if (typeFichier === 'rating') {
        reponse = await uploadRatingFile(file, setUploadProgress)
      } else {
        reponse = await uploadFile(file, setUploadProgress)
      }

      
      if (reponse.statut === 'ignore' || !reponse.import_id) {
        setPhase('termine')
        setSubmitting(false)
        setStatus({
          type: reponse.statut === 'ignore' ? 'error' : 'success',
          message: reponse.message,
        })
        return
      }

      suivreProgression(reponse.import_id)
    } catch (err) {
      setPhase('termine')
      setSubmitting(false)
      setStatus({
        type: 'error',
        message: err?.response?.data?.detail || "Une erreur est survenue lors de l'envoi du fichier.",
      })
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={(e) => e.stopPropagation()}>
        <h2>Importer un fichier</h2>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 14 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <input
              type="radio"
              checked={typeFichier === 'base'}
              disabled={submitting}
              onChange={() => { setTypeFichier('base'); setFile(null); setStatus(null) }}
            />
            Fichier de base
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <input
              type="radio"
              checked={typeFichier === 'devise'}
              disabled={submitting}
              onChange={() => { setTypeFichier('devise'); setFile(null); setStatus(null) }}
            />
            Fichier de devises
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <input
              type="radio"
              checked={typeFichier === 'rating'}
              disabled={submitting}
              onChange={() => { setTypeFichier('rating'); setFile(null); setStatus(null) }}
            />
            Fichier rating pays
          </label>
        </div>

        <p className="desc">
          {typeFichier === 'devise' ? (
            <>Déposez le fichier de taux de change (<strong>.xlsx</strong> ou <strong>.xlsb</strong>), ex : devisemars26.xlsx </>
          ) : typeFichier === 'rating' ? (
            <>Déposez le fichier de rating pays (<strong>.xlsx</strong>, <strong>.xlsb</strong> ou <strong>.csv</strong>), avec les colonnes <strong>Pays</strong>, <strong>Note retenue</strong> et <strong>date</strong>, ex : rating_pays_mars26.xlsx </>
          ) : (
            <>Déposez le fichier mensuel au format <strong>.xlsb</strong>ou <strong>.xlsx</strong>  ex : Base_mars_2026.xlsb </>
          )}{' '}
          Le format réel du fichier est détecté automatiquement, peu importe son extension.
        </p>

        {status && (
          <div className={`status-msg ${status.type === 'success' ? 'status-success' : 'status-error'}`}>
            {status.message}
          </div>
        )}

        {!submitting && (
          <div
            className={`dropzone ${dragActive ? 'drag-active' : ''}`}
            onDragOver={(e) => { e.preventDefault(); setDragActive(true) }}
            onDragLeave={() => setDragActive(false)}
            onDrop={(e) => {
              e.preventDefault()
              setDragActive(false)
              handleFiles(e.dataTransfer.files)
            }}
            onClick={() => inputRef.current?.click()}
          >
            <input
              ref={inputRef}
              type="file"
              accept={extensionsAcceptees.join(',')}
              hidden
              onChange={(e) => handleFiles(e.target.files)}
            />
            Glissez-déposez un fichier ici, ou <strong>cliquez pour parcourir</strong>
          </div>
        )}

        {file && !submitting && (
          <div className="file-chip">
            <span>📄 {file.name} · {(file.size / 1024 / 1024).toFixed(2)} Mo</span>
            <button className="btn btn-outline" onClick={() => setFile(null)}>✕</button>
          </div>
        )}

        {phase === 'envoi' && (
          <div className="progress-section">
            <div className="progress-label">Envoi du fichier… {uploadProgress}%</div>
            <div className="progress-bar">
              <div className="progress-bar-fill" style={{ width: `${uploadProgress}%` }} />
            </div>
          </div>
        )}

        {phase === 'traitement' && (
          <div className="progress-section">
            <div className="progress-label">
              {etapeEtl || 'Traitement en cours…'} — {progressionEtl}%
            </div>
            <div className="progress-bar">
              <div className="progress-bar-fill" style={{ width: `${progressionEtl}%` }} />
            </div>
          </div>
        )}

        <div className="modal-actions">
          <button className="btn btn-outline" onClick={onClose} disabled={submitting}>Fermer</button>
          <button className="btn btn-primary" onClick={handleSubmit} disabled={!file || submitting}>
            {submitting ? <span className="spinner" /> : '⬆'} Envoyer
          </button>
        </div>
      </div>
    </div>
  )
}