import { useState } from 'react'
import Sidebar from './components/Sidebar'
import OverviewPage from './pages/OverviewPage'
import ActualsPage from './pages/ActualsPage'
import ForecastsPage from './pages/ForecastsPage'
import AccuracyPage from './pages/AccuracyPage'

const PAGE_MAP = {
  overview: OverviewPage,
  actuals: ActualsPage,
  forecasts: ForecastsPage,
  accuracy: AccuracyPage,
}

export default function App() {
  const [activePage, setActivePage] = useState('overview')
  const PageComponent = PAGE_MAP[activePage] ?? OverviewPage

  return (
    <div className="app-shell hero-gradient">
      <Sidebar activePage={activePage} onNavigate={setActivePage} />
      <main className="main-content" id="main-content" role="main">
        <PageComponent key={activePage} />
      </main>
    </div>
  )
}
