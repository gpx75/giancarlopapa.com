interface StravaTotals {
  count: number
  distance: number
  moving_time: number
  elapsed_time: number
  elevation_gain: number
}

interface StravaStats {
  all_run_totals: StravaTotals
  ytd_run_totals: StravaTotals
  recent_run_totals: StravaTotals
  all_ride_totals: StravaTotals
  ytd_ride_totals: StravaTotals
  all_swim_totals: StravaTotals
  ytd_swim_totals: StravaTotals
}

const ATHLETE_ID = 124413550

export default defineCachedEventHandler(async () => {
  const s = await stravaFetch<StravaStats>(`/athletes/${ATHLETE_ID}/stats`)

  // Combined totals across all sport types (run + ride + swim)
  const combined = {
    count: s.all_run_totals.count + s.all_ride_totals.count + s.all_swim_totals.count,
    distance: s.all_run_totals.distance + s.all_ride_totals.distance + s.all_swim_totals.distance,
    movingTime: s.all_run_totals.moving_time + s.all_ride_totals.moving_time + s.all_swim_totals.moving_time,
    elevationGain: s.all_run_totals.elevation_gain + s.all_ride_totals.elevation_gain + s.all_swim_totals.elevation_gain
  }

  return {
    combined,
    allTime: {
      count: s.all_run_totals.count,
      distance: s.all_run_totals.distance,
      movingTime: s.all_run_totals.moving_time,
      elevationGain: s.all_run_totals.elevation_gain
    },
    ytd: {
      count: s.ytd_run_totals.count,
      distance: s.ytd_run_totals.distance,
      movingTime: s.ytd_run_totals.moving_time,
      elevationGain: s.ytd_run_totals.elevation_gain
    }
  }
}, {
  maxAge: 60 * 15,
  name: 'strava-stats',
  getKey: () => 'strava-stats'
})
