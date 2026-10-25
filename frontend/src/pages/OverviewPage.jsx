/**
 * Overview page — the "executive dashboard":
 *  - KPI summary (latest forecast vs actuals for today / most recent day)
 *  - Combined actuals + latest forecast chart for the full month
 *  - Net procurement gap (actual demand proxy - wind generation)
 */
import { useState } from 'react'
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
} from 'recharts'
import { format, parseISO } from 'date-fns'
import { TrendingDown, TrendingUp, Zap, Wind } from 'lucide-react'
import { useActuals, useDayAheadForecasts } from '../hooks/useWindData'
import KpiCard from '../components/KpiCard'
import ChartTooltip from '../components/ChartTooltip'
import DateRangePicker from '../components/DateRangePicker'

const TOTAL_DEMAND_MW = 35000 // approximate UK winter peak demand proxy

export default function OverviewPage() {
  const [from, setFrom] = useState('2026-01-01')
  const [to, setTo] = useState('2026-01-31')

  const actualsQ = useActuals(from, to)
  const forecastsQ = useDayAheadForecasts(from, to)

  const loading = actualsQ.isLoading || forecastsQ.isLoading
  const error = actualsQ.error || forecastsQ.error

  // Build merged chart dataset
  const chartData = buildChartData(actualsQ.data?.data, forecastsQ.data?.data)

  // KPIs
  const latestActual = actualsQ.data?.data?.at(-1)
  const latestForecast = forecastsQ.data?.data?.at(-1)
  const avgActual = average(actualsQ.data?.data?.map((d) => d.generation))
  const avgForecast = average(forecastsQ.data?.data?.map((d) => d.generation))
  const avgGap = avgActual != null ? TOTAL_DEMAND_MW - avgActual : null

  return (
    <div className="page-enter">
      {/* Header */}
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 700 }}>🌬️ Wind Generation Overview</h1>
            <p style={{ fontSize: 13, color: 'var(--clr-text-muted)', marginTop: 2 }}>
              UK National Wind — Day-ahead Forecast vs Actual Generation · January 2026
            </p>
          </div>
          <DateRangePicker
            from={from}
            to={to}
            onApply={(f, t) => { setFrom(f); setTo(t) }}
          />
        </div>
      </div>

      <div className="page-body">
        {/* Info Banner */}
        <div className="info-banner">
          <Zap size={16} style={{ flexShrink: 0, marginTop: 1 }} />
          <span>
            <strong>Day-ahead procurement context:</strong> For each delivery half-hour in January 2026,
            the chart shows the wind generation forecast available before gate closure (D-1 11:00 UTC)
            alongside the actual generation recorded by Elexon BMRS. The gap between total demand and
            wind generation indicates the thermal/import procurement volume required.
          </span>
        </div>

        {/* KPI Cards */}
        <div className="kpi-grid">
          <KpiCard
            label="Avg Actual Wind Generation"
            value={avgActual?.toFixed(0)}
            unit="MW"
            sub={`Based on ${actualsQ.data?.count ?? '—'} half-hour periods`}
            accentColor="linear-gradient(90deg,#3b82f6,#2dd4bf)"
          />
          <KpiCard
            label="Avg Day-Ahead Forecast"
            value={avgForecast?.toFixed(0)}
            unit="MW"
            sub={`${forecastsQ.data?.count ?? '—'} forecast periods matched`}
            accentColor="linear-gradient(90deg,#a78bfa,#3b82f6)"
          />
          <KpiCard
            label="Avg Procurement Gap"
            value={avgGap?.toFixed(0)}
            unit="MW"
            sub="≈ Demand − Actual Wind"
            accentColor="linear-gradient(90deg,#f59e0b,#f43f5e)"
          />
          <KpiCard
            label="Latest Actual"
            value={latestActual?.generation?.toFixed(0)}
            unit="MW"
            sub={latestActual ? format(parseISO(latestActual.startTime), 'dd MMM HH:mm') : ''}
            accentColor="linear-gradient(90deg,#22d3a0,#3b82f6)"
          />
        </div>

        {/* Main chart */}
        {error && (
          <div className="error-container">
            ⚠️ Failed to load data: {error.message}. Please ensure the backend is running.
          </div>
        )}

        {loading ? (
          <div className="loading-container">
            <div className="spinner" />
            <span>Fetching Elexon BMRS data…</span>
          </div>
        ) : (
          <>
            <div className="chart-wrapper">
              <div className="chart-header">
                <div>
                  <div className="chart-title">Actual vs Day-Ahead Forecast Wind Generation</div>
                  <div className="chart-subtitle">
                    30-minute resolution · {from} to {to} · MW
                  </div>
                </div>
                <div className="chart-legend">
                  <span className="legend-item">
                    <span className="legend-line" style={{ background: '#3b82f6' }} />
                    Actual
                  </span>
                  <span className="legend-item">
                    <span className="legend-line" style={{ background: '#a78bfa', borderTop: '2px dashed #a78bfa', height: 0 }} />
                    Forecast
                  </span>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={380}>
                <LineChart data={chartData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(99,160,255,0.08)" />
                  <XAxis
                    dataKey="time"
                    tickFormatter={(t) => {
                      try { return format(parseISO(t), 'dd MMM') }
                      catch { return t }
                    }}
                    tick={{ fill: '#7a90b0', fontSize: 11 }}
                    tickLine={false}
                    interval={Math.floor(chartData.length / 10)}
                    stroke="rgba(99,160,255,0.1)"
                  />
                  <YAxis
                    tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                    tick={{ fill: '#7a90b0', fontSize: 11 }}
                    tickLine={false}
                    axisLine={false}
                    width={45}
                    label={{ value: 'MW', angle: -90, position: 'insideLeft', fill: '#7a90b0', fontSize: 11 }}
                  />
                  <Tooltip
                    content={<ChartTooltip unit="MW" />}
                    cursor={{ stroke: 'rgba(99,160,255,0.2)', strokeWidth: 1 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="actual"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    dot={false}
                    name="Actual"
                    connectNulls={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="forecast"
                    stroke="#a78bfa"
                    strokeWidth={2}
                    strokeDasharray="6 3"
                    dot={false}
                    name="Forecast"
                    connectNulls={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Procurement gap chart */}
            <div className="chart-wrapper">
              <div className="chart-header">
                <div>
                  <div className="chart-title">Estimated Thermal Procurement Gap</div>
                  <div className="chart-subtitle">
                    Total Demand Proxy ({TOTAL_DEMAND_MW.toLocaleString()} MW) − Actual Wind · MW
                  </div>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={250}>
                <LineChart
                  data={chartData.filter(d => d.actual != null).map(d => ({
                    ...d,
                    gap: d.actual != null ? TOTAL_DEMAND_MW - d.actual : null,
                  }))}
                  margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(99,160,255,0.08)" />
                  <XAxis
                    dataKey="time"
                    tickFormatter={(t) => {
                      try { return format(parseISO(t), 'dd MMM') }
                      catch { return t }
                    }}
                    tick={{ fill: '#7a90b0', fontSize: 11 }}
                    tickLine={false}
                    interval={Math.floor(chartData.length / 10)}
                    stroke="rgba(99,160,255,0.1)"
                  />
                  <YAxis
                    tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                    tick={{ fill: '#7a90b0', fontSize: 11 }}
                    tickLine={false}
                    axisLine={false}
                    width={45}
                  />
                  <Tooltip
                    content={<ChartTooltip unit="MW" />}
                    cursor={{ stroke: 'rgba(245,158,11,0.2)', strokeWidth: 1 }}
                  />
                  <ReferenceLine
                    y={0}
                    stroke="rgba(244,63,94,0.4)"
                    strokeDasharray="3 3"
                  />
                  <Line
                    type="monotone"
                    dataKey="gap"
                    stroke="#f59e0b"
                    strokeWidth={2}
                    dot={false}
                    name="Procurement Gap"
                    connectNulls={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

// ---- Helpers ----

function buildChartData(actuals = [], forecasts = []) {
  const map = {}
  for (const a of actuals) {
    map[a.startTime] = { time: a.startTime, actual: a.generation }
  }
  for (const f of forecasts) {
    if (map[f.startTime]) {
      map[f.startTime].forecast = f.generation
    } else {
      map[f.startTime] = { time: f.startTime, forecast: f.generation }
    }
  }
  return Object.values(map).sort((a, b) => a.time.localeCompare(b.time))
}

function average(arr) {
  if (!arr?.length) return null
  return arr.reduce((s, v) => s + v, 0) / arr.length
}
