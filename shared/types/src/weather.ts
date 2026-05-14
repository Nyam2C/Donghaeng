// @trip/types — Weather forecast 도메인
// D33 — Phase 4e SCENARIO 02.5 (날짜+일자별 날씨)
// 친구 톤 voice "날씨 같이 봐드릴게요" 약속 — TRIP START 의 도시 선택 후 진입.
//
// D12: 시그니처 freeze — 신규 endpoint /api/weather/forecast 의 응답 shape.
// (기존 /api/weather 의 WeatherResponse 는 weather.ts route 에 그대로 둠 — 무변경)

export type WeatherCondition = 'sunny' | 'cloudy' | 'rainy' | 'snowy'

export interface DayForecast {
  date: string // YYYY-MM-DD
  tempC: number // 정수 (Math.round)
  condition: WeatherCondition
  rainProb: number // 0-100 정수 (Math.round(pop * 100))
}

export interface ForecastResponse {
  city: string
  days: DayForecast[] // 1-5
}

export interface FetchForecastInput {
  city: string
  startDate: string // YYYY-MM-DD
  endDate: string // YYYY-MM-DD
}
