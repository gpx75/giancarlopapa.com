interface ActivitySummary {
  distance: number
  moving_time: number
  total_elevation_gain: number
  sport_type: string
}

export default defineCachedEventHandler(async () => {
  let page = 1
  let count = 0
  let distance = 0
  let movingTime = 0
  let elevationGain = 0

  while (true) {
    const batch = await stravaFetch<ActivitySummary[]>('/athlete/activities', {
      per_page: 200,
      page
    })

    if (!batch.length) break

    for (const a of batch) {
      count++
      distance += a.distance
      movingTime += a.moving_time
      elevationGain += a.total_elevation_gain
    }

    if (batch.length < 200) break

    page++
  }

  return { count, distance, movingTime, elevationGain }
}, {
  maxAge: 60 * 60 * 6,
  name: 'strava-totals',
  getKey: () => 'strava-totals'
})
