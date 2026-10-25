/**
 * Actuals page — FUELHH wind generation chart + data table.
 */
import { useState } from 'react'
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
import { useActuals } from '../hooks/useWindData'
import ChartTooltip from '../components/ChartTooltip'
import DateRangePicker from '../components/DateRangePicker'
import KpiCard from '../components/KpiCard'

export default function ActualsPage() {
  const [from, setFrom] = useState('2026-01-01')
  const [to, setTo] = useState('2026-01-31')

  const { data, isLoading, error } = useActuals(from, to)
  const records = data?.data ?? []

  const generations = records.map((r) => r.generation)
  const maxGen = Math.max(...generations)
  const minGen = Math.min(...generations)
  const avgGen = generations.reduce((s, v) => s + v, 0) / (generations.length || 1)

  return (
    <div className="page-enter">
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 700 }}>⚡ Actual Wind Generation</h1>
            <p style={{ fontSize: 13, color: 'var(--clr-text-muted)', marginTop: 2 }}>
              Elexon BMRS FUELHH — WIND fuel type · 30-min resolution
            </p>
          </div>
          <DateRangePicker from={from} to={to} onApply={(f, t) => { setFrom(f); setTo(t) }} />
        </div>
      </div>

      <div className="page-body">
        {/* KPIs */}
        <div className="kpi-grid">
          <KpiCard label="Total Periods" value={data?.count ?? '—'} unit="" sub="30-min half-hours" accentColor="linear-gradient(90deg,#3b82f6,#2dd4bf)" />
          <KpiCard label="Peak Generation" value={generations.length ? maxGen.toFixed(0) : null} unit="MW" sub="Highest single period" accentColor="linear-gradient(90deg,#22d3a0,#3b82f6)" />
          <KpiCard label="Avg Generation" value={generations.length ? avgGen.toFixed(0) : null} unit="MW" sub="Period average" accentColor="linear-gradient(90deg,#a78bfa,#3b82f6)" />
          <KpiCard label="Min Generation" value={generations.length ? minGen.toFixed(0) : null} unit="MW" sub="Lowest single period" accentColor="linear-gradient(90deg,#f59e0b,#f43f5e)" />
        </div>

        {error && <div className="error-container">⚠️ {error.message}</div>}

        {isLoading ? (
          <div className="loading-container"><div className="spinner" /><span>Loading actuals…</span></div>
        ) : (
          <>
            {/* Area Chart */}
            <div className="chart-wrapper">
              <div className="chart-header">
                <div>
                  <div className="chart-title">Wind Generation — Half-hourly Actuals</div>
                  <div className="chart-subtitle">{from} to {to} · {records.length} periods</div>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={340}>
                <AreaChart data={records} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                  <defs>
                    <linearGradient id="actualGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(99,160,255,0.08)" />
                  <XAxis
                    dataKey="startTime"
                    tickFormatter={(t) => { try { return format(parseISO(t), 'dd MMM') } catch { return t } }}
                    tick={{ fill: '#7a90b0', fontSize: 11 }}
                    tickLine={false}
                    interval={Math.floor(records.length / 8)}
                    stroke="rgba(99,160,255,0.1)"
                  />
                  <YAxis
                    tick={{ fill: '#7a90b0', fontSize: 11 }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v) => `${(v / 1000).toFixed(1)}k`}
                    width={45}
                  />
                  <Tooltip content={<ChartTooltip unit="MW" />} cursor={{ stroke: 'rgba(99,160,255,0.2)' }} />
                  <Area
                    type="monotone"
                    dataKey="generation"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    fill="url(#actualGrad)"
                    name="Actual Generation"
                    dot={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Data table */}
            <div className="card">
              <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 16, color: 'var(--clr-text)' }}>
                Raw Data Table
                <span style={{ fontSize: 12, fontWeight: 400, color: 'var(--clr-text-muted)', marginLeft: 10 }}>
                  Showing last 48 periods
                </span>
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Start Time</th>
                      <th>Settlement Date</th>
                      <th>Period</th>
                      <th>Generation (MW)</th>
                      <th>Publish Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {records.slice(-48).reverse().map((r, i) => (
                      <tr key={i}>
                        <td>{formatDt(r.startTime)}</td>
                        <td>{r.settlementDate}</td>
                        <td>SP {r.settlementPeriod}</td>
                        <td style={{ color: 'var(--clr-accent-light)', fontWeight: 600 }}>
                          {r.generation.toLocaleString()}
                        </td>
                        <td style={{ color: 'var(--clr-text-muted)' }}>{formatDt(r.publishTime)}</td>
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
  try { return format(parseISO(dt), 'dd MMM yyyy HH:mm') } catch { return dt }
}
