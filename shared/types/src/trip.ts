// @trip/types — Trip + GPS

export interface Trip {
  city: string
  startDate: string
  endDate: string
  vibeTags: string[]
}

export interface GpsCoord {
  lat: number
  lng: number
  accuracy?: number
}
