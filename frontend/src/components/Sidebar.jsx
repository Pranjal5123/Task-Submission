/**
 * Sidebar navigation component.
 */
import { Wind, BarChart2, TrendingUp, Info } from 'lucide-react'

const NAV_ITEMS = [
  {
    id: 'overview',
    label: 'Overview',
    icon: Wind,
    section: 'MAIN',
    description: 'Latest forecast & actuals',
  },
  {
    id: 'actuals',
    label: 'Actual Generation',
    icon: BarChart2,
    section: 'DATA',
    description: 'FUELHH half-hourly wind',
  },
  {
    id: 'forecasts',
    label: 'Forecasts',
    icon: TrendingUp,
    section: 'DATA',
    description: 'WINDFOR day-ahead',
  },
  {
    id: 'accuracy',
    label: 'Accuracy Analysis',
    icon: BarChart2,
    section: 'ANALYSIS',
    description: 'MAE, RMSE, MAPE, Bias',
  },
]

export default function Sidebar({ activePage, onNavigate }) {
  const sections = [...new Set(NAV_ITEMS.map((i) => i.section))]

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <div className="logo-mark">
          <div className="logo-icon">🌬️</div>
          <div>
            <div className="logo-text">WindIQ</div>
            <div className="logo-sub">POWER INTELLIGENCE</div>
          </div>
        </div>
      </div>

      <nav className="sidebar-nav">
        {sections.map((section) => (
          <div key={section}>
            <div className="nav-section-label">{section}</div>
            {NAV_ITEMS.filter((i) => i.section === section).map((item) => {
              const Icon = item.icon
              return (
                <button
                  key={item.id}
                  id={`nav-${item.id}`}
                  className={`nav-item ${activePage === item.id ? 'active' : ''}`}
                  onClick={() => onNavigate(item.id)}
                  aria-label={item.label}
                  title={item.description}
                >
                  <Icon className="nav-icon" size={16} />
                  {item.label}
                </button>
              )
            })}
          </div>
        ))}
      </nav>

      <div className="sidebar-footer">
        <div className="data-source-badge">
          <span className="status-dot" />
          Elexon BMRS Live Data
        </div>
        <div style={{ fontSize: 10, color: 'var(--clr-text-faint)', marginTop: 6 }}>
          FUELHH · WINDFOR · 
        </div>
      </div>
    </aside>
  )
}
