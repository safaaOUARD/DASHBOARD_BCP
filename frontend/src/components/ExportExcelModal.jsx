import { useState } from 'react'
import { exportExcel } from '../api'
import { COLONNES_EXPORTABLES } from '../config/tableColumns'

export default function ExportExcelModal({ selectedIds, filtresActuels, onClose }) {
  const [colonnes, setColonnes] = useState(['filiale', 'nom_client', 'devise', 'encours', 'date_arret'])
  const [portee, setPortee] = useState(selectedIds.length > 0 ? 'selection' : 'tout')
  const [exporting, setExporting] = useState(false)

  const toggle = (col) => {
    setColonnes((prev) => prev.includes(col) ? prev.filter((c) => c !== col) : [...prev, col])
  }

  const toggleTout = () => {
    setColonnes((prev) => prev.length === COLONNES_EXPORTABLES.length ? [] : COLONNES_EXPORTABLES.map((c) => c.key))
  }

  const handleExport = async () => {
    setExporting(true)
    try {
      const payload = {
        colonnes,
        ...(portee === 'selection' ? { ids: selectedIds } : filtresActuels),
      }
      const blob = await exportExcel(payload)
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'export_engagements.xlsx'
      a.click()
      window.URL.revokeObjectURL(url)
      onClose()
    } catch (err) {
      alert(err?.response?.data?.detail || "Erreur lors de l'export.")
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" style={{ width: 520 }} onClick={(e) => e.stopPropagation()}>
        <h2>Exporter en Excel</h2>

        <div style={{ display: 'flex', gap: 14, marginBottom: 16 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <input
              type="radio"
              checked={portee === 'tout'}
              onChange={() => setPortee('tout')}
            />
            Toutes les lignes (selon filtres/recherche actuels)
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <input
              type="radio"
              checked={portee === 'selection'}
              disabled={selectedIds.length === 0}
              onChange={() => setPortee('selection')}
            />
            Lignes sélectionnées ({selectedIds.length})
          </label>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
          <p className="desc" style={{ margin: 0 }}>Choisissez les colonnes à inclure :</p>
          <button className="btn btn-outline" style={{ padding: '2px 8px' }} onClick={toggleTout}>
            Tout / Rien
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, maxHeight: 260, overflowY: 'auto', marginBottom: 16 }}>
          {COLONNES_EXPORTABLES.map((col) => (
            <label key={col.key} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
              <input type="checkbox" checked={colonnes.includes(col.key)} onChange={() => toggle(col.key)} />
              {col.key}
            </label>
          ))}
        </div>

        <div className="modal-actions">
          <button className="btn btn-outline" onClick={onClose} disabled={exporting}>Annuler</button>
          <button className="btn btn-primary" onClick={handleExport} disabled={exporting || colonnes.length === 0}>
            {exporting ? 'Génération…' : '📊 Exporter'}
          </button>
        </div>
      </div>
    </div>
  )
}