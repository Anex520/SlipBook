import { Link } from '../lib/route'

const icon = (children) => (
  <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {children}
  </svg>
)

const TABS = [
  { key: 'home', to: '/', label: 'Sales', icon: icon(<><path d="M5 4h11a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3V4z" /><path d="M8.5 9h7M8.5 13h7" /></>) },
  { key: 'new', to: '/new', label: 'New invoice', icon: icon(<path d="M12 5v14M5 12h14" />), accent: true },
  { key: 'items', to: '/items', label: 'Price list', icon: icon(<><path d="M3 12V4h8l9 9-8 8-9-9z" /><circle cx="7.5" cy="8.5" r="1" /></>) },
  { key: 'settings', to: '/settings', label: 'Settings', icon: icon(<><path d="M4 7h10M18 7h2M4 17h2M10 17h10" /><circle cx="16" cy="7" r="2" /><circle cx="8" cy="17" r="2" /></>) },
]

export default function TabBar({ active }) {
  return (
    <nav className="tabbar" aria-label="Main">
      {TABS.map((t) => (
        <Link
          key={t.key}
          to={t.to}
          aria-current={active === t.key ? 'page' : undefined}
          className={t.accent ? 'tab tab-accent' : 'tab'}
        >
          {t.icon}
          <span>{t.label}</span>
        </Link>
      ))}
    </nav>
  )
}
