import { useQuery } from '@tanstack/react-query'
import { fetchActuals, fetchForecasts, fetchMetrics, fetchDayAheadForecasts } from '../api/elexon'

export const useActuals = (from, to) =>
  useQuery({
    queryKey: ['actuals', from, to],
    queryFn: () => fetchActuals(from, to),
    enabled: !!from && !!to,
  })

export const useForecasts = (from, to) =>
  useQuery({
    queryKey: ['forecasts', from, to],
    queryFn: () => fetchForecasts(from, to),
    enabled: !!from && !!to,
  })

export const useDayAheadForecasts = (from, to) =>
  useQuery({
    queryKey: ['forecasts-da', from, to],
    queryFn: () => fetchDayAheadForecasts(from, to),
    enabled: !!from && !!to,
  })

export const useMetrics = (from, to) =>
  useQuery({
    queryKey: ['metrics', from, to],
    queryFn: () => fetchMetrics(from, to),
    enabled: !!from && !!to,
  })
