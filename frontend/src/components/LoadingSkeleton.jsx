export default function LoadingSkeleton({ rows = 8 }) {
  return (
    <div className="loading-skeleton">
      {Array.from({ length: rows }).map((_, i) => (
        <div className="skeleton-row" key={i} style={{ width: `${100 - (i % 3) * 8}%` }} />
      ))}
    </div>
  )
}
