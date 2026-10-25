/**
 * Forecasts page — latest WINDFOR snapshot + day-ahead selected forecasts.
 */
import { useState } from 'react'
import { defaultFrom, defaultTo } from '../utils/dateDefaults'
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts'
import { format, parseISO } from 'date-fns'
import { useDayAheadForecasts, useForecasts } from '../hooks/useWindData'
import ChartTooltip from '../components/ChartTooltip'
import DateRangePicker from '../components/DateRangePicker'
import KpiCard from '../components/KpiCard'

export default function ForecastsPage() {
  const [from, setFrom] = useState(defaultFrom)
  const [to, setTo] = useState(defaultTo)

  const latestQ = useForecasts(from, to)
  const daQ = useDayAheadForecasts(from, to)

  const loading = latestQ.isLoading || daQ.isLoading
  const error = latestQ.error || daQ.error

  const daRecords = daQ.data?.data ?? []
  const latestRecords = latestQ.data?.data ?? []

  const avgLead = daRecords.length
    ? (daRecords.reduce((s, r) => s + (r.leadHours ?? 0), 0) / daRecords.length).toFixed(1)
    : null

  const avgForecast = daRecords.length
    ? (daRecords.reduce((s, r) => s + r.generation, 0) / daRecords.length).toFixed(0)
    : null

  return (
    <div className="page-enter">
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 700 }}>📡 Wind Generation Forecasts</h1>
            <p style={{ fontSize: 13, color: 'var(--clr-text-muted)', marginTop: 2 }}>
              Elexon BMRS WINDFOR — Day-ahead gate-closure aware selection
            </p>
          </div>
          <DateRangePicker from={from} to={to} onApply={(f, t) => { setFrom(f); setTo(t) }} />
        </div>
      </div>

      <div className="page-body">
        {/* <div className="info-banner">
          📌 <strong>Day-ahead selection logic:</strong> For each delivery half-hour, the forecast shown
          is the most recent vintage published before gate closure (D-1 11:00 UTC) — exactly what a
          trader would use when placing bids in the UK day-ahead electricity market.
        </div> */}

        {/* KPIs */}
        <div className="kpi-grid">
          <KpiCard
            label="Latest Forecast Published"
            value={latestQ.data?.publishTime ? format(parseISO(latestQ.data.publishTime), 'dd MMM HH:mm') : '—'}
            unit=""
            sub="Most recent WINDFOR vintage"
            accentColor="linear-gradient(90deg,#a78bfa,#3b82f6)"
          />
          <KpiCard
            label="Day-Ahead Periods Matched"
            value={daQ.data?.count ?? '—'}
            unit=""
            sub="Gate-closure aware"
            accentColor="linear-gradient(90deg,#3b82f6,#2dd4bf)"
          />
          <KpiCard
            label="Avg Lead Time"
            value={avgLead}
            unit="hrs"
            sub="Forecast to delivery"
            accentColor="linear-gradient(90deg,#22d3a0,#3b82f6)"
          />
          <KpiCard
            label="Avg Forecast Generation"
            value={avgForecast}
            unit="MW"
            sub={`${fmtRange(from, to)} average`}
            accentColor="linear-gradient(90deg,#f59e0b,#f43f5e)"
          />
        </div>

        {error && <div className="error-container">⚠️ {error.message}</div>}

        {loading ? (
          <div className="loading-container"><div className="spinner" /><span>Loading forecasts…</span></div>
        ) : (
          <div className="grid-2">
            {/* Day-ahead forecast chart */}
            <div className="chart-wrapper">
              <div className="chart-header">
                <div>
                  <div className="chart-title">Day-Ahead Selected Forecasts</div>
                  <div className="chart-subtitle">Best available before gate closure (D-1 11:00 UTC)</div>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={daRecords} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                  <defs>
                    <linearGradient id="daForecastGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#a78bfa" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#a78bfa" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(99,160,255,0.08)" />
                  <XAxis
                    dataKey="startTime"
                    tickFormatter={(t) => { try { return format(parseISO(t), 'dd MMM') } catch { return t } }}
                    tick={{ fill: '#7a90b0', fontSize: 11 }}
                    tickLine={false}
                    interval={Math.floor(daRecords.length / 6)}
                    stroke="rgba(99,160,255,0.1)"
                  />
                  <YAxis
                    tick={{ fill: '#7a90b0', fontSize: 11 }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v) => `${(v / 1000).toFixed(1)}k`}
                    width={45}
                  />
                  <Tooltip content={<ChartTooltip unit="MW" />} cursor={{ stroke: 'rgba(167,139,250,0.2)' }} />
                  <Area
                    type="monotone"
                    dataKey="generation"
                    stroke="#a78bfa"
                    strokeWidth={2}
                    fill="url(#daForecastGrad)"
                    name="DA Forecast"
                    dot={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Latest snapshot chart */}
            <div className="chart-wrapper">
              <div className="chart-header">
                <div>
                  <div className="chart-title">Latest Forecast Snapshot</div>
                  <div className="chart-subtitle">
                    Published: {latestQ.data?.publishTime
                      ? format(parseISO(latestQ.data.publishTime), 'dd MMM yyyy HH:mm')
                      : '—'}
                  </div>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={latestRecords} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                  <defs>
                    <linearGradient id="latestForecastGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#2dd4bf" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#2dd4bf" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(99,160,255,0.08)" />
                  <XAxis
                    dataKey="startTime"
                    tickFormatter={(t) => { try { return format(parseISO(t), 'dd MMM HH:mm') } catch { return t } }}
                    tick={{ fill: '#7a90b0', fontSize: 11 }}
                    tickLine={false}
                    interval={Math.floor(latestRecords.length / 6)}
                    stroke="rgba(99,160,255,0.1)"
                  />
                  <YAxis
                    tick={{ fill: '#7a90b0', fontSize: 11 }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v) => `${(v / 1000).toFixed(1)}k`}
                    width={45}
                  />
                  <Tooltip content={<ChartTooltip unit="MW" />} cursor={{ stroke: 'rgba(45,212,191,0.2)' }} />
                  <Area
                    type="monotone"
                    dataKey="generation"
                    stroke="#2dd4bf"
                    strokeWidth={2}
                    fill="url(#latestForecastGrad)"
                    name="Latest Forecast"
                    dot={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Lead time table */}
        {!loading && daRecords.length > 0 && (
          <div className="card" style={{ marginTop: 20 }}>
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 16 }}>
              Day-Ahead Forecast Detail Table
              <span style={{ fontSize: 12, fontWeight: 400, color: 'var(--clr-text-muted)', marginLeft: 10 }}>
                Showing last 48 periods
              </span>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Delivery Start</th>
                    <th>Forecast (MW)</th>
                    <th>Published At</th>
                    <th>Lead Time (hrs)</th>
                  </tr>
                </thead>
                <tbody>
                  {daRecords.slice(0, 48).map((r, i) => (
                    <tr key={i}>
                      <td>{formatDt(r.startTime)}</td>
                      <td style={{ color: 'var(--clr-purple)', fontWeight: 600 }}>
                        {r.generation.toLocaleString()}
                      </td>
                      <td style={{ color: 'var(--clr-text-muted)' }}>{formatDt(r.publishTime)}</td>
                      <td>
                        <span className="badge badge-blue">{r.leadHours} hrs</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function formatDt(dt) {
  try { return format(parseISO(dt), 'dd MMM yyyy HH:mm') } catch { return dt }
}

function fmtRange(from, to) {
  try {
    const f = parseISO(from)
    const t = parseISO(to)
    return `${format(f, 'MMM yyyy')} – ${format(t, 'MMM yyyy')}`
  } catch {
    return `${from} to ${to}`
  }
}
