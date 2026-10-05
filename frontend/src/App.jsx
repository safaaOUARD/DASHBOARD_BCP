import { useEffect, useState, useCallback } from 'react'
import { useOutletContext } from 'react-router-dom'
import KpiCards from './components/KpiCards'
import SearchBar from './components/SearchBar'
import FilterBar from './components/FilterBar'
import DataTable from './components/DataTable'
import Pagination from './components/Pagination'
import { updateEngagement } from './api'
import FichiersImportesPanel from './components/FichiersImportesPanel'
import { getDashboardStats, getFilterOptions, getEngagements, getFichiersImportes } from './api'
import ExportExcelModal from './components/ExportExcelModal'
import { createEngagement, deleteEngagement } from './api'
import { logout as logoutSession } from './utils/auth'

import { useDateArret } from './context/DateArretContext'


const EMPTY_FILTERS = { filiale: '', zone: '', date_arret: '', segment: '', devise: '', perimetre_exposition: '' }


export default function App() {
  const [stats, setStats] = useState(null)
  const [options, setOptions] = useState(null)
  const [q, setQ] = useState('')
  const [debouncedQ, setDebouncedQ] = useState('')
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [draftFilters, setDraftFilters] = useState(EMPTY_FILTERS)
  const [appliedFilters, setAppliedFilters] = useState(EMPTY_FILTERS)
  const [page, setPage] = useState(1)
  const [tableData, setTableData] = useState(null)
  const [fichiersDisponibles, setFichiersDisponibles] = useState([])
  const [fichiersSelectionnes, setFichiersSelectionnes] = useState([])
  const [loading, setLoading] = useState(false)
  const [editMode, setEditMode] = useState(false)
  const [pendingChanges, setPendingChanges] = useState({}) 
  const [saving, setSaving] = useState(false)
  const [showExportModal, setShowExportModal] = useState(false)
  const [selectedIds, setSelectedIds] = useState([])
  const { utilisateur, setUtilisateur } = useOutletContext()
  const [draftRows, setDraftRows] = useState([]) 
  const [currentPage, setCurrentPage] = useState("engagements");
  const [pageSize, setPageSize] = useState(50)
  const { dateArret, setDatesDisponibles, setDerniereMiseAJour } = useDateArret()
  useEffect(() => {
    getFichiersImportes().then(setFichiersDisponibles).catch(() => { })
  }, [])
  useEffect(() => {
    getFilterOptions(dateArret ? { date_arret: dateArret } : undefined)
      .then(setOptions)
      .catch(() => { })
  }, [dateArret])

  // Charge les KPI, et les recharge à chaque changement de la Date
  // d'arrêt globale (Header/DateArretContext), pour rester synchronisé
  // avec les autres dashboards de l'application.
  useEffect(() => {
    getDashboardStats(dateArret ? { date_arret: dateArret } : undefined)
      .then(setStats)
      .catch(() => { })
  }, [dateArret])

  // Alimente le sélecteur global de Date d'arrêt (Header) à partir des
  // données déjà récupérées ici, sans dupliquer d'appels API ni modifier
  // la logique de filtrage existante.
  useEffect(() => {
    if (options?.dates_arret) setDatesDisponibles(options.dates_arret)
  }, [options, setDatesDisponibles])

  useEffect(() => {
    if (stats?.dernier_import) setDerniereMiseAJour(stats.dernier_import)
  }, [stats, setDerniereMiseAJour])

  // Quand la Date d'arrêt globale change dans le Header, elle est
  // répercutée sur les filtres appliqués (même clé que le filtre
  // "date_arret" déjà utilisé par le backend).
  useEffect(() => {
    if (dateArret !== undefined) {
      setAppliedFilters((prev) => prev.date_arret === dateArret ? prev : { ...prev, date_arret: dateArret })
      setDraftFilters((prev) => prev.date_arret === dateArret ? prev : { ...prev, date_arret: dateArret })
      setPage(1)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateArret])

  // Debounce la recherche texte / nom de fichier
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(q), 400)
    return () => clearTimeout(t)
  }, [q])

  const toggleSelect = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id)
        ? prev.filter((x) => x !== id)
        : [...prev, id]
    )
  }
  const handleLogout = () => {
    logoutSession()
    setUtilisateur(null)
  }
  const fetchData = useCallback(() => {
    setLoading(true)
    const isFilename = debouncedQ.trim().length > 0 && /\.xlsb/i.test(debouncedQ)
    const params = {
      page,
      page_size: pageSize,
      ...appliedFilters,
      ...(fichiersSelectionnes.length > 0 ? { fichiers: fichiersSelectionnes.join(',') } : {}),
      ...(debouncedQ
        ? isFilename
          ? { fichier: debouncedQ }
          : { q: debouncedQ }
        : {}),
    }
    Object.keys(params).forEach((k) => params[k] === '' && delete params[k])
    if (params.perimetre_exposition !== undefined) {
      params.perimetre_exposition = Number(params.perimetre_exposition)
    }
    getEngagements(params)
      .then(setTableData)
      .finally(() => setLoading(false))
  }, [page, pageSize, appliedFilters, debouncedQ, fichiersSelectionnes])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleApplyFilters = () => {
    setAppliedFilters(draftFilters)
    setPage(1)
  }

  const handleResetFilters = () => {
    setDraftFilters(EMPTY_FILTERS)
    setAppliedFilters(EMPTY_FILTERS)
    setPage(1)
  }

  const handleCellChange = (rowId, colonne, valeur) => {
    setPendingChanges((prev) => ({
      ...prev,
      [rowId]: { ...prev[rowId], [colonne]: valeur },
    }))
  }

  const handleAnnuler = () => {
    setPendingChanges({})
    setDraftRows([])
    setEditMode(false)
  }
  const handleEnregistrer = async () => {
    setSaving(true)
    try {
      for (const [rowId, valeurs] of Object.entries(pendingChanges)) {
        await updateEngagement(rowId, valeurs)
      }
      for (const draft of draftRows) {
        if (Object.keys(draft.valeurs).length > 0) {
          await createEngagement(draft.valeurs)
        }
      }
      setPendingChanges({})
      setDraftRows([])
      setEditMode(false)
      fetchData()
      alert('Modifications enregistrées avec succès.')
    } catch (err) {
      alert(err?.response?.data?.detail || "Erreur lors de l'enregistrement.")
    } finally {
      setSaving(false)
    }
  }
  const handleAddDraftRow = () => {
    setDraftRows((prev) => [...prev, { tempId: `new-${Date.now()}`, valeurs: {} }])
  }

  const handleDraftChange = (tempId, colonne, valeur) => {
    setDraftRows((prev) => prev.map((d) => d.tempId === tempId ? { ...d, valeurs: { ...d.valeurs, [colonne]: valeur } } : d))
  }

  const handleRemoveDraftRow = (tempId) => {
    setDraftRows((prev) => prev.filter((d) => d.tempId !== tempId))
  }

  const handleDeleteRow = async (id) => {
    if (!window.confirm('Supprimer définitivement cette ligne ? Cette action est tracée dans l\'historique.')) return
    try {
      await deleteEngagement(id)
      fetchData()
    } catch (err) {
      alert(err?.response?.data?.detail || 'Erreur lors de la suppression.')
    }
  }
  const getFiltresActuels = () => {
    const isFilename = debouncedQ.trim().length > 0 && /\.xlsb/i.test(debouncedQ)
    const filtres = {
      ...appliedFilters,
      ...(fichiersSelectionnes.length > 0 ? { fichiers: fichiersSelectionnes.join(',') } : {}),
      ...(debouncedQ ? (isFilename ? { fichier: debouncedQ } : { q: debouncedQ }) : {}),
    }
    // Retire toutes les valeurs vides - le backend attend soit une vraie
    // valeur, soit l'absence totale du champ (pas une chaine vide "").
    Object.keys(filtres).forEach((k) => (filtres[k] === '' || filtres[k] == null) && delete filtres[k])
    if (filtres.perimetre_exposition !== undefined) {
      filtres.perimetre_exposition = Number(filtres.perimetre_exposition)
    }
    return filtres
  }
  const nbCellulesModifiees = Object.values(pendingChanges).reduce(
    (total, cols) => total + Object.keys(cols).length, 0
  )
  return (
  


    <div className="app-page">
      <main className="main-container">
        <KpiCards stats={stats} />

        <SearchBar
          q={q}
          onChangeQ={(v) => {
            setQ(v)
            setPage(1)
          }}
          onToggleFilters={() => setFiltersOpen((v) => !v)}
          filtersOpen={filtersOpen}
        />
        <div className="edit-toolbar">
          {utilisateur.peut_modifier && (
            !editMode ? (
              <button className="btn btn-outline" onClick={() => setEditMode(true)}>✏ Mode édition</button>

            ) : (
              <>
                <button className="btn btn-primary" onClick={handleEnregistrer} disabled={saving || (nbCellulesModifiees === 0 && draftRows.length === 0)}>
                  {saving ? 'Enregistrement…' : '💾 Enregistrer'}
                </button>
                <button className="btn btn-outline" onClick={handleAnnuler} disabled={saving}>Annuler</button>
                {nbCellulesModifiees > 0 && <span className="badge-count">{nbCellulesModifiees} cellule(s) modifiée(s)</span>}
              </>
            )
          )}

          {utilisateur.peut_exporter && (
            <button className="btn btn-outline" onClick={() => setShowExportModal(true)}>
              Exporter{selectedIds.length > 0 ? ` (${selectedIds.length})` : ''}
            </button>
          )}

          
        </div>
        {filtersOpen && options && (
          <FilterBar
            options={options}
            draft={draftFilters}
            onChange={setDraftFilters}
            onApply={handleApplyFilters}
            onReset={handleResetFilters}
          />
        )}
        {filtersOpen && fichiersDisponibles.length > 0 && (
          <FichiersImportesPanel
            fichiers={fichiersDisponibles}
            selected={fichiersSelectionnes}
            onChange={(v) => {
              setFichiersSelectionnes(v)
              setPage(1)
            }}
          />
        )}
        <DataTable
          loading={loading}
          data={tableData}
          editMode={editMode}
          pendingChanges={pendingChanges}
          onCellChange={handleCellChange}
          selectable={utilisateur.peut_exporter}
          selectedIds={selectedIds}
          onToggleSelect={toggleSelect}
          draftRows={draftRows}
          onAddDraftRow={handleAddDraftRow}
          onDraftChange={handleDraftChange}
          onRemoveDraftRow={handleRemoveDraftRow}
          onDeleteRow={handleDeleteRow}
        />

        {tableData && (
          <Pagination
            page={tableData.page}
            totalPages={tableData.total_pages}
            onChange={setPage}
            pageSize={pageSize}
            onPageSizeChange={(size) => { setPageSize(size); setPage(1) }}
          />
        )}
      </main>

      {
        showExportModal && (
          <ExportExcelModal
            selectedIds={selectedIds}
            filtresActuels={getFiltresActuels()}
            onClose={() => { setShowExportModal(false); setSelectedIds([]) }}
          />
        )
      }

      

    </div>
  )
}