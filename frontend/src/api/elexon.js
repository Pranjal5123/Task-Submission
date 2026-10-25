import axios from 'axios'
import { defaultFrom, defaultTo } from '../utils/dateDefaults'

const BASE_URL = `${import.meta.env.VITE_API_URL || 'https://task-submission-api.onrender.com'}/api/v1`

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
 * @param {string} from - Start date YYYY-MM-DD (defaults to 30 days ago)
 * @param {string} to   - End date YYYY-MM-DD (defaults to today)
 */
export const fetchActuals = (from = defaultFrom(), to = defaultTo()) =>
  api.get('/actuals', { params: { from, to } })

/**
 * Fetch latest wind forecast snapshot (WINDFOR)
 */
export const fetchForecasts = (from = defaultFrom(), to = defaultTo()) =>
  api.get('/forecasts', { params: { from, to } })

/**
 * Fetch day-ahead selected forecasts (gate-closure aware)
 */
export const fetchDayAheadForecasts = (from = defaultFrom(), to = defaultTo()) =>
  api.get('/forecasts/day-ahead', { params: { from, to } })

/**
 * Fetch forecast accuracy metrics (MAE, RMSE, MAPE, Bias)
 */
export const fetchMetrics = (from = defaultFrom(), to = defaultTo()) =>
  api.get('/metrics', { params: { from, to } })

/**
 * Health check
 */
export const fetchHealth = () => api.get('/health')

export default api
