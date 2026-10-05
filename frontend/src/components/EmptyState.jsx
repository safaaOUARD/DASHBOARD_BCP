export default function EmptyState({ title = 'Aucun résultat', description = "Essayez d'ajuster votre recherche ou vos filtres." }) {
  return (
    <div className="empty-state">
      <h3>{title}</h3>
      <p>{description}</p>
    </div>
  )
}
