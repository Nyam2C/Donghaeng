import type { FetchForecastInput, ForecastResponse } from '@trip/types'

import { apiFetch } from './api-client'

/**
 * Weather forecast service — D33 (Phase 4e SCENARIO 02.5).
 *
 * TRIP START 의 도시 chip 선택 후 SCENARIO 02.5 진입 시 호출.
 * USE_MOCKS=true 면 services/__mocks__/api/weather-forecast.json fixture 응답.
 * USE_MOCKS=false 면 server GET /api/weather/forecast?city=&startDate=&endDate=.
 *
 * 시그니처 freeze (D12): @trip/types 의 FetchForecastInput → ForecastResponse 그대로.
 */
export async function fetchForecast(input: FetchForecastInput): Promise<ForecastResponse> {
  const { city, startDate, endDate } = input
  const params = `city=${encodeURIComponent(city)}&startDate=${startDate}&endDate=${endDate}`
  return apiFetch<ForecastResponse>(`/api/weather/forecast?${params}`)
}
