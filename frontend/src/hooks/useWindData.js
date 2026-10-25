import { useQuery } from '@tanstack/react-query'
import { fetchActuals, fetchForecasts, fetchMetrics, fetchDayAheadForecasts } from '../api/elexon'

/** Shared React Query config for all Elexon data hooks.
 *  - staleTime: 5 min — don't refetch on window focus / remount within 5 min
 *  - gcTime:   10 min — keep unused cache alive so navigating back is instant
 *  - retry: 1         — one retry on failure (Elexon can be slow; don't hammer it)
 */
const QUERY_OPTIONS = {
  staleTime: 5 * 60 * 1000,   // 5 minutes
  gcTime:    10 * 60 * 1000,  // 10 minutes
  retry: 1,
}

export const useActuals = (from, to) =>
  useQuery({
    queryKey: ['actuals', from, to],
    queryFn: () => fetchActuals(from, to),
    enabled: !!from && !!to,
    ...QUERY_OPTIONS,
  })

export const useForecasts = (from, to) =>
  useQuery({
    queryKey: ['forecasts', from, to],
    queryFn: () => fetchForecasts(from, to),
    enabled: !!from && !!to,
    ...QUERY_OPTIONS,
  })

export const useDayAheadForecasts = (from, to) =>
  useQuery({
    queryKey: ['forecasts-da', from, to],
    queryFn: () => fetchDayAheadForecasts(from, to),
    enabled: !!from && !!to,
    ...QUERY_OPTIONS,
  })

export const useMetrics = (from, to) =>
  useQuery({
    queryKey: ['metrics', from, to],
    queryFn: () => fetchMetrics(from, to),
    enabled: !!from && !!to,
    ...QUERY_OPTIONS,
  })
