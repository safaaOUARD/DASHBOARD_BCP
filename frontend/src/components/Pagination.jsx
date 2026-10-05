const PAGE_SIZES = [25, 50, 100, 200]

export default function Pagination({ page, totalPages, onChange, pageSize, onPageSizeChange }) {
  const pages = []
  const windowSize = 2
  if (totalPages > 1) {
    for (let p = 1; p <= totalPages; p++) {
      if (p === 1 || p === totalPages || Math.abs(p - page) <= windowSize) {
        pages.push(p)
      } else if (pages[pages.length - 1] !== '…') {
        pages.push('…')
      }
    }
  }

  return (
    <div className="pagination">
      {onPageSizeChange ? (
        <div className="pagination-size">
          <span>Lignes par page</span>
          <select value={pageSize} onChange={(e) => onPageSizeChange(Number(e.target.value))}>
            {PAGE_SIZES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
      ) : <span />}

      {totalPages > 1 && (
        <div className="pagination-pages">
          <button disabled={page <= 1} onClick={() => onChange(page - 1)}>
            ‹ Précédent
          </button>
          {pages.map((p, i) =>
            p === '…' ? (
              <span key={`dots-${i}`}>…</span>
            ) : (
              <button key={p} className={p === page ? 'active' : ''} onClick={() => onChange(p)}>
                {p}
              </button>
            )
          )}
          <button disabled={page >= totalPages} onClick={() => onChange(page + 1)}>
            Suivant ›
          </button>
        </div>
      )}
    </div>
  )
}
