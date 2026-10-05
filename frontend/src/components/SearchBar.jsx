export default function SearchBar({ q, onChangeQ, onToggleFilters, filtersOpen }) {
  return (
    <div className="toolbar">
      <div className="search-box">
        <span className="search-icon">🔍</span>
        <input
          type="text"
          placeholder="Rechercher un client, une clé, ou un nom de fichier importé…"
          value={q}
          onChange={(e) => onChangeQ(e.target.value)}
        />
      </div>
      <button className="btn btn-outline" onClick={onToggleFilters}>
        ⚙ Filtres {filtersOpen ? '▲' : '▼'}
      </button>
    </div>
  )
}
