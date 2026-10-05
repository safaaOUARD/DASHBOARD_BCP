import { useState } from 'react'
import { NavLink } from 'react-router-dom'


const NAV_ITEMS = [
  {
    path: '/', label: 'Accueil', end: true,
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 11.5 12 4l9 7.5" />
        <path d="M5.5 10v9a1 1 0 0 0 1 1H9a1 1 0 0 0 1-1v-4a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v4a1 1 0 0 0 1 1h2.5a1 1 0 0 0 1-1v-9" />
      </svg>
    ),
  },
  {
    path: '/dashboard/segmentation', label: 'Segmentation',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3.5" y="3.5" width="7" height="7" rx="1.2" />
        <rect x="13.5" y="3.5" width="7" height="7" rx="1.2" />
        <rect x="3.5" y="13.5" width="7" height="7" rx="1.2" />
        <rect x="13.5" y="13.5" width="7" height="7" rx="1.2" />
      </svg>
    ),
  },
  {
    path: '/dashboard/rating-pays', label: 'Rating Pays',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 3 4 6.5V11c0 5 3.4 8.6 8 10 4.6-1.4 8-5 8-10V6.5L12 3Z" />
        <path d="M9 12.2l2 2 4-4.4" />
      </svg>
    ),
  },
  {
    path: '/dashboard/zone', label: 'Zones',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="8.5" />
        <path d="M3.5 12h17M12 3.5c2.4 2.3 3.7 5.2 3.7 8.5s-1.3 6.2-3.7 8.5c-2.4-2.3-3.7-5.2-3.7-8.5S9.6 5.8 12 3.5Z" />
      </svg>
    ),
  },
  {
    path: '/dashboard/souverains', label: 'Souverains',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 21V10.5M20 21V10.5M4 21h16M6.5 10.5v6M11 10.5v6M13 10.5v6M17.5 10.5v6" />
        <path d="M3 10.5 12 4l9 6.5H3Z" />
      </svg>
    ),
  },
  {
    path: '/dashboard/custom', label: 'Types',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3.5" y="4.5" width="17" height="4" rx="1" />
        <rect x="3.5" y="10.5" width="17" height="4" rx="1" />
        <rect x="3.5" y="16.5" width="17" height="4" rx="1" />
      </svg>
    ),
  },
  {
    path: '/dashboard/encours-souverains', label: 'encours-souverains',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="8.5" />
        <path d="M12 7.5V12l3 2" />
      </svg>
    ),
  },
  {
    path: '/admin', label: 'Administration',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 13.5a7.6 7.6 0 0 0 0-3l2-1.5-2-3.5-2.4.6a7.6 7.6 0 0 0-2.6-1.5L14 2h-4l-.4 2.6a7.6 7.6 0 0 0-2.6 1.5l-2.4-.6-2 3.5 2 1.5a7.6 7.6 0 0 0 0 3l-2 1.5 2 3.5 2.4-.6a7.6 7.6 0 0 0 2.6 1.5L10 22h4l.4-2.6a7.6 7.6 0 0 0 2.6-1.5l2.4.6 2-3.5-2-1.5Z" />
      </svg>
    ),
  },
]

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false)

  return (
    <aside className={`sidebar${collapsed ? ' collapsed' : ''}`}>

      <nav className="sidebar-nav">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.label}
            to={item.path}
            end={item.end ?? (item.path === '/')}
            title={collapsed ? item.label : undefined}
            className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`}
          >
            <span className="icon">{item.icon}</span>
            {!collapsed && <span className="sidebar-link-label">{item.label}</span>}
          </NavLink>
        ))}
      </nav>

      <button
        type="button"
        className="sidebar-toggle"
        onClick={() => setCollapsed((v) => !v)}
        title={collapsed ? 'Développer le menu' : 'Réduire le menu'}
        aria-label={collapsed ? 'Développer le menu' : 'Réduire le menu'}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
          style={{ transform: collapsed ? 'rotate(180deg)' : 'none', transition: 'transform 200ms ease' }}>
          <path d="M14.5 5 8 12l6.5 7" />
        </svg>
        {!collapsed && <span>Réduire</span>}
      </button>
    </aside>
  )
}
