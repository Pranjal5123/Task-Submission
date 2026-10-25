/**
 * Accuracy Analysis page — MAE, RMSE, MAPE, Bias with charts.
 * The most technically rich page for the interviewer demo.
 */
import { useState } from 'react'
import {
  ResponsiveContainer,
  ComposedChart,
  BarChart,
  Bar,
  Line,
  Scatter,
  ScatterChart,
  XAxis,
  YAxis,
  ZAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  Legend,
} from 'recharts'
import { format, parseISO } from 'date-fns'
import { useMetrics } from '../hooks/useWindData'
import ChartTooltip from '../components/ChartTooltip'
import DateRangePicker from '../components/DateRangePicker'
import KpiCard from '../components/KpiCard'

export default function AccuracyPage() {
  const [from, setFrom] = useState('2026-01-01')
  const [to, setTo] = useState('2026-01-31')

  const { data, isLoading, error } = useMetrics(from, to)

  const metrics = data
  const pairs = data?.pairs ?? []
  const daily = data?.dailyMetrics ?? []

  // Scatter data: actual vs forecast
  const scatterData = pairs.map((p) => ({
    x: p.actual,
    y: p.forecast,
    error: p.error,
  }))

  // Perfect forecast reference line max
  const maxGen = pairs.length
    ? Math.max(...pairs.map((p) => Math.max(p.actual, p.forecast)))
    : 20000

  return (
    <div className="page-enter">
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 700 }}>📊 Forecast Accuracy Analysis</h1>
            <p style={{ fontSize: 13, color: 'var(--clr-text-muted)', marginTop: 2 }}>
              Day-ahead wind forecast vs actual · MAE · RMSE · MAPE · Bias
            </p>
          </div>
          <DateRangePicker from={from} to={to} onApply={(f, t) => { setFrom(f); setTo(t) }} />
        </div>
      </div>

      <div className="page-body">
        <div className="info-banner">
          📐 <strong>Methodology:</strong> For each delivery period, the best available forecast
          published before gate closure (D-1 11:00 UTC) is paired with the actual generation.
          Positive bias indicates systematic over-forecasting (trader would under-procure thermal);
          negative bias means under-forecasting (trader over-procures). All errors expressed in MW.
        </div>

        {/* Summary KPIs */}
        <div className="kpi-grid">
          <KpiCard
            label="MAE"
            value={metrics?.mae}
            unit="MW"
            sub="Mean Absolute Error"
            accentColor="linear-gradient(90deg,#3b82f6,#2dd4bf)"
          />
          <KpiCard
            label="RMSE"
            value={metrics?.rmse}
            unit="MW"
            sub="Root Mean Squared Error"
            accentColor="linear-gradient(90deg,#a78bfa,#3b82f6)"
          />
          <KpiCard
            label="MAPE"
            value={metrics?.mape != null ? `${metrics.mape.toFixed(1)}` : null}
            unit="%"
            sub="Mean Abs. % Error"
            accentColor="linear-gradient(90deg,#f59e0b,#f43f5e)"
          />
          <KpiCard
            label="Bias"
            value={metrics?.bias}
            unit="MW"
            sub={metrics?.bias > 0 ? '▲ Over-forecast' : metrics?.bias < 0 ? '▼ Under-forecast' : 'Neutral'}
            accentColor={
              metrics?.bias > 0
                ? 'linear-gradient(90deg,#f59e0b,#f43f5e)'
                : 'linear-gradient(90deg,#22d3a0,#3b82f6)'
            }
          />
        </div>
        <div className="kpi-grid" style={{ gridTemplateColumns: '1fr', maxWidth: 260, marginBottom: 28 }}>
          <KpiCard
            label="Matched Pairs"
            value={metrics?.nPairs}
            unit=""
            sub="Actual + Forecast aligned periods"
            accentColor="linear-gradient(90deg,#3b82f6,#a78bfa)"
          />
        </div>

        {error && <div className="error-container">⚠️ {error.message}</div>}

        {isLoading ? (
          <div className="loading-container"><div className="spinner" /><span>Computing accuracy metrics…</span></div>
        ) : (
          <>
            {/* Error time series */}
            <div className="chart-wrapper">
              <div className="chart-header">
                <div>
                  <div className="chart-title">Forecast Error Over Time</div>
                  <div className="chart-subtitle">
                    Error = Forecast − Actual (MW) · Positive = over-forecast
                  </div>
                </div>
                <div className="chart-legend">
                  <span className="legend-item">
                    <span className="legend-line" style={{ background: '#f59e0b' }} />
                    Error
                  </span>
                  <span className="legend-item">
                    <span className="legend-line" style={{ background: '#3b82f6' }} />
                    Abs Error
                  </span>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={320}>
                <ComposedChart data={pairs} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(99,160,255,0.08)" />
                  <XAxis
                    dataKey="startTime"
                    tickFormatter={(t) => { try { return format(parseISO(t), 'dd MMM') } catch { return t } }}
                    tick={{ fill: '#7a90b0', fontSize: 11 }}
                    tickLine={false}
                    interval={Math.floor(pairs.length / 10)}
                    stroke="rgba(99,160,255,0.1)"
                  />
                  <YAxis
                    tick={{ fill: '#7a90b0', fontSize: 11 }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v) => `${v.toLocaleString()}`}
                    width={60}
                  />
                  <Tooltip
                    content={({ active, payload, label }) => {
                      if (!active || !payload?.length) return null
                      return (
                        <div className="custom-tooltip">
                          <div className="tooltip-label">
                            {(() => { try { return format(parseISO(label), 'dd MMM HH:mm') } catch { return label } })()}
                          </div>
                          {payload.map((e, i) => (
                            <div className="tooltip-row" key={i}>
                              <span className="tooltip-key">
                                <span className="tooltip-dot" style={{ background: e.color }} />
                                {e.name}
                              </span>
                              <span className="tooltip-val">{Number(e.value).toLocaleString()} MW</span>
                            </div>
                          ))}
                        </div>
                      )
                    }}
                    cursor={{ stroke: 'rgba(245,158,11,0.15)' }}
                  />
                  <ReferenceLine y={0} stroke="rgba(244,63,94,0.5)" strokeDasharray="4 2" />
                  <Bar dataKey="error" name="Error" fill="rgba(245,158,11,0.25)" stroke="#f59e0b" strokeWidth={0} barSize={2} />
                  <Line type="monotone" dataKey="absoluteError" name="Abs Error" stroke="#3b82f6" strokeWidth={1.5} dot={false} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>

            {/* Daily metrics chart + scatter chart */}
            <div className="grid-2">
              {/* Daily MAE/RMSE bar chart */}
              <div className="chart-wrapper">
                <div className="chart-header">
                  <div>
                    <div className="chart-title">Daily Error Metrics</div>
                    <div className="chart-subtitle">MAE and RMSE per day (MW)</div>
                  </div>
                </div>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={daily} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(99,160,255,0.08)" />
                    <XAxis
                      dataKey="date"
                      tickFormatter={(d) => { try { return format(parseISO(d), 'dd') } catch { return d } }}
                      tick={{ fill: '#7a90b0', fontSize: 11 }}
                      tickLine={false}
                      stroke="rgba(99,160,255,0.1)"
                    />
                    <YAxis
                      tick={{ fill: '#7a90b0', fontSize: 11 }}
                      tickLine={false}
                      axisLine={false}
                      width={50}
                    />
                    <Tooltip
                      content={({ active, payload, label }) => {
                        if (!active || !payload?.length) return null
                        return (
                          <div className="custom-tooltip">
                            <div className="tooltip-label">{label}</div>
                            {payload.map((e, i) => (
                              <div className="tooltip-row" key={i}>
                                <span className="tooltip-key">
                                  <span className="tooltip-dot" style={{ background: e.fill }} />
                                  {e.name}
                                </span>
                                <span className="tooltip-val">{Number(e.value).toLocaleString()} MW</span>
                              </div>
                            ))}
                          </div>
                        )
                      }}
                    />
                    <Bar dataKey="mae" name="MAE" fill="#3b82f6" fillOpacity={0.8} radius={[3,3,0,0]} />
                    <Bar dataKey="rmse" name="RMSE" fill="#a78bfa" fillOpacity={0.8} radius={[3,3,0,0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Scatter: Actual vs Forecast */}
              <div className="chart-wrapper">
                <div className="chart-header">
                  <div>
                    <div className="chart-title">Actual vs Forecast Scatter</div>
                    <div className="chart-subtitle">Points on the diagonal = perfect forecast</div>
                  </div>
                </div>
                <ResponsiveContainer width="100%" height={280}>
                  <ScatterChart margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(99,160,255,0.08)" />
                    <XAxis
                      type="number"
                      dataKey="x"
                      name="Actual"
                      tick={{ fill: '#7a90b0', fontSize: 10 }}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                      label={{ value: 'Actual (MW)', position: 'insideBottom', offset: -2, fill: '#7a90b0', fontSize: 11 }}
                    />
                    <YAxis
                      type="number"
                      dataKey="y"
                      name="Forecast"
                      tick={{ fill: '#7a90b0', fontSize: 10 }}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                      width={45}
                      label={{ value: 'Forecast (MW)', angle: -90, position: 'insideLeft', fill: '#7a90b0', fontSize: 11 }}
                    />
                    <ZAxis range={[15, 15]} />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (!active || !payload?.length) return null
                        const d = payload[0]?.payload
                        return (
                          <div className="custom-tooltip">
                            <div className="tooltip-row">
                              <span className="tooltip-key">Actual</span>
                              <span className="tooltip-val">{d?.x?.toLocaleString()} MW</span>
                            </div>
                            <div className="tooltip-row">
                              <span className="tooltip-key">Forecast</span>
                              <span className="tooltip-val">{d?.y?.toLocaleString()} MW</span>
                            </div>
                            <div className="tooltip-row">
                              <span className="tooltip-key">Error</span>
                              <span className="tooltip-val" style={{ color: d?.error > 0 ? '#f59e0b' : '#22d3a0' }}>
                                {d?.error > 0 ? '+' : ''}{d?.error?.toLocaleString()} MW
                              </span>
                            </div>
                          </div>
                        )
                      }}
                    />
                    <Scatter
                      data={scatterData.slice(0, 500)}
                      fill="rgba(59,130,246,0.5)"
                      fillOpacity={0.6}
                    />
                    {/* Perfect forecast diagonal */}
                    <ReferenceLine
                      segment={[{ x: 0, y: 0 }, { x: maxGen, y: maxGen }]}
                      stroke="rgba(34,211,160,0.4)"
                      strokeDasharray="5 3"
                      label={{ value: 'Perfect', position: 'insideTopLeft', fill: '#22d3a0', fontSize: 10 }}
                    />
                  </ScatterChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Daily bias chart */}
            <div className="chart-wrapper">
              <div className="chart-header">
                <div>
                  <div className="chart-title">Daily Forecast Bias</div>
                  <div className="chart-subtitle">
                    Positive = over-forecast · Negative = under-forecast · MW
                  </div>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={daily} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(99,160,255,0.08)" />
                  <XAxis
                    dataKey="date"
                    tickFormatter={(d) => { try { return format(parseISO(d), 'dd') } catch { return d } }}
                    tick={{ fill: '#7a90b0', fontSize: 11 }}
                    tickLine={false}
                    stroke="rgba(99,160,255,0.1)"
                  />
                  <YAxis
                    tick={{ fill: '#7a90b0', fontSize: 11 }}
                    tickLine={false}
                    axisLine={false}
                    width={60}
                  />
                  <Tooltip
                    content={({ active, payload, label }) => {
                      if (!active || !payload?.length) return null
                      return (
                        <div className="custom-tooltip">
                          <div className="tooltip-label">{label}</div>
                          {payload.map((e, i) => (
                            <div className="tooltip-row" key={i}>
                              <span className="tooltip-key">
                                <span className="tooltip-dot" style={{ background: e.fill || e.stroke }} />
                                {e.name}
                              </span>
                              <span className="tooltip-val">{Number(e.value).toLocaleString()} MW</span>
                            </div>
                          ))}
                        </div>
                      )
                    }}
                  />
                  <ReferenceLine y={0} stroke="rgba(99,160,255,0.3)" />
                  <Bar
                    dataKey="bias"
                    name="Bias"
                    radius={[3,3,0,0]}
                    fill="#f59e0b"
                    label={false}
                    // Color positive vs negative
                    shape={(props) => {
                      const { x, y, width, height, value } = props
                      const color = value >= 0 ? '#f59e0b' : '#22d3a0'
                      return <rect x={x} y={y} width={width} height={height} fill={color} fillOpacity={0.8} rx={3} />
                    }}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Detailed error table */}
            <div className="card" style={{ marginTop: 20 }}>
              <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 16 }}>
                Period-Level Error Detail
                <span style={{ fontSize: 12, fontWeight: 400, color: 'var(--clr-text-muted)', marginLeft: 10 }}>
                  First 100 matched pairs
                </span>
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Start Time</th>
                      <th>Actual (MW)</th>
                      <th>Forecast (MW)</th>
                      <th>Error (MW)</th>
                      <th>Abs Error (MW)</th>
                      <th>MAPE (%)</th>
                      <th>Lead (hrs)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pairs.slice(0, 100).map((p, i) => (
                      <tr key={i}>
                        <td>{formatDt(p.startTime)}</td>
                        <td style={{ color: 'var(--clr-accent-light)', fontWeight: 600 }}>
                          {p.actual.toLocaleString()}
                        </td>
                        <td style={{ color: 'var(--clr-purple)', fontWeight: 600 }}>
                          {p.forecast.toLocaleString()}
                        </td>
                        <td>
                          <span style={{
                            color: p.error > 0 ? '#f59e0b' : p.error < 0 ? '#22d3a0' : 'var(--clr-text-muted)',
                            fontWeight: 600,
                          }}>
                            {p.error > 0 ? '+' : ''}{p.error.toLocaleString()}
                          </span>
                        </td>
                        <td>{p.absoluteError.toLocaleString()}</td>
                        <td>
                          {p.percentageError != null
                            ? <span className={`badge ${p.percentageError < 5 ? 'badge-green' : p.percentageError < 15 ? 'badge-amber' : 'badge-red'}`}>
                                {p.percentageError.toFixed(1)}%
                              </span>
                            : '—'}
                        </td>
                        <td>
                          <span className="badge badge-blue">{p.leadHours} hrs</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function formatDt(dt) {
  try { return format(parseISO(dt), 'dd MMM HH:mm') } catch { return dt }
}
