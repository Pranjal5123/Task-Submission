import axios from 'axios'

const BASE_URL = import.meta.env.VITE_API_URL || '/api/v1'

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 90000,
  headers: { 'Content-Type': 'application/json' },
})

// Response interceptor for uniform error handling
api.interceptors.response.use(
  (res) => res.data,
  (err) => {
    const message =
      err.response?.data?.detail ||
      err.message ||
      'An unexpected error occurred'
    return Promise.reject(new Error(message))
  }
)

/**
 * Fetch actual wind generation data (FUELHH/WIND)
 * @param {string} from - Start date YYYY-MM-DD
 * @param {string} to   - End date YYYY-MM-DD
 */
export const fetchActuals = (from = '2026-01-01', to = '2026-01-31') =>
  api.get('/actuals', { params: { from, to } })

/**
 * Fetch latest wind forecast snapshot (WINDFOR)
 */
export const fetchForecasts = (from = '2026-01-01', to = '2026-01-31') =>
  api.get('/forecasts', { params: { from, to } })

/**
 * Fetch day-ahead selected forecasts (gate-closure aware)
 */
export const fetchDayAheadForecasts = (from = '2026-01-01', to = '2026-01-31') =>
  api.get('/forecasts/day-ahead', { params: { from, to } })

/**
 * Fetch forecast accuracy metrics (MAE, RMSE, MAPE, Bias)
 */
export const fetchMetrics = (from = '2026-01-01', to = '2026-01-31') =>
  api.get('/metrics', { params: { from, to } })

/**
 * Health check
 */
export const fetchHealth = () => api.get('/health')

export default api
