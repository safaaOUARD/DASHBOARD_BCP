import { createContext, useContext, useState, useCallback, useEffect } from 'react'


const DateArretContext = createContext({
  dateArret: '',
  setDateArret: () => {},
  datesDisponibles: [],
  setDatesDisponibles: () => {},
  derniereMiseAJour: null,
  setDerniereMiseAJour: () => {},
})

export function DateArretProvider({ children }) {
  const [dateArret, setDateArret] = useState('')
  const [datesDisponibles, setDatesDisponibles] = useState([])
  const [derniereMiseAJour, setDerniereMiseAJour] = useState(null)

  // Auto-selectionne la date la plus recente des qu'elle est connue, si
  // aucune date n'a encore ete choisie explicitement. Necessaire depuis
  // que le backend ne retombe plus sur MAX(date_arret) : sans ca,
  // dateArret resterait '' indefiniment et tous les dashboards/filtres
  // recevraient date_arret vide en permanence.
  // datesDisponibles est deja trie du plus recent au plus ancien
  // (ORDER BY date_arret DESC cote backend), donc le premier element
  // est la date la plus recente.
  useEffect(() => {
    if (!dateArret && datesDisponibles.length > 0) {
      setDateArret(datesDisponibles[0])
    }
  }, [dateArret, datesDisponibles])

  const value = {
    dateArret,
    setDateArret: useCallback((v) => setDateArret(v), []),
    datesDisponibles,
    setDatesDisponibles: useCallback((v) => setDatesDisponibles(v), []),
    derniereMiseAJour,
    setDerniereMiseAJour: useCallback((v) => setDerniereMiseAJour(v), []),
  }

  return (
    <DateArretContext.Provider value={value}>
      {children}
    </DateArretContext.Provider>
  )
}

export function useDateArret() {
  return useContext(DateArretContext)
}