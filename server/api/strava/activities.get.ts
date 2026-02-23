interface StravaActivity {
  id: number
  name: string
  type: string
  sport_type: string
  start_date_local: string
  distance: number
  moving_time: number
  elapsed_time: number
  total_elevation_gain: number
  average_speed: number
  max_speed: number
  average_heartrate?: number
  max_heartrate?: number
  map: {
    summary_polyline: string
  }
}

export default defineCachedEventHandler(async (event) => {
  const { page = '1' } = getQuery(event)
  const pageNum = Math.max(1, parseInt(String(page), 10))

  const activities = await stravaFetch<StravaActivity[]>('/athlete/activities', {
    per_page: 20,
    page: pageNum
  })

  return activities.map((a) => ({
    id: a.id,
    name: a.name,
    sport_type: a.sport_type || a.type,
    start_date_local: a.start_date_local,
    distance: a.distance,
    moving_time: a.moving_time,
    elapsed_time: a.elapsed_time,
    total_elevation_gain: a.total_elevation_gain,
    average_speed: a.average_speed,
    max_speed: a.max_speed,
    average_heartrate: a.average_heartrate ?? null,
    max_heartrate: a.max_heartrate ?? null,
    summary_polyline: a.map?.summary_polyline ?? ''
  }))
}, {
  maxAge: 60 * 10,
  name: 'strava-activities',
  getKey: (event) => {
    const { page = '1' } = getQuery(event)
    return `strava-activities-p${page}`
  }
})
