const STRAVA_CLIENT_ID = process.env.STRAVA_CLIENT_ID!
const STRAVA_CLIENT_SECRET = process.env.STRAVA_CLIENT_SECRET!
const STRAVA_REDIRECT_URI = process.env.STRAVA_REDIRECT_URI 
  ?? `${process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '')}/api/strava/callback`

  export type StravaActivity = {
  id: number
  name: string
  distance: number // meters
  moving_time: number // seconds
  elapsed_time: number // seconds
  total_elevation_gain: number // meters
  type: string
  start_date: string
  average_speed: number // m/s
  max_speed: number // m/s
  average_heartrate?: number
  max_heartrate?: number
  calories?: number
}

export function getStravaAuthUrl(studentId: number): string {
  const params = new URLSearchParams({
    client_id: STRAVA_CLIENT_ID,
    redirect_uri: STRAVA_REDIRECT_URI,
    response_type: 'code',
    scope: 'read,activity:read_all',
    state: studentId.toString(),
  })
  return `https://www.strava.com/oauth/authorize?${params.toString()}`
}


export async function exchangeStravaCode(code: string): Promise<{
  access_token: string
  refresh_token: string
  expires_at: number
  athlete: { id: number }
}> {
  const response = await fetch('https://www.strava.com/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: STRAVA_CLIENT_ID,
      client_secret: STRAVA_CLIENT_SECRET,
      code,
      grant_type: 'authorization_code',
    }),
  })
  
  if (!response.ok) {
    throw new Error('Failed to exchange Strava code')
  }
  
  return response.json()
}
export const STRAVA_SCOPES = [
  'read',
  'activity:read',
  'activity:write', // ← ADICIONAR esta permissão
  'activity:read_all'
]

export async function refreshStravaToken(refreshToken: string): Promise<{
  access_token: string
  refresh_token: string
  expires_at: number
}> {
  const response = await fetch('https://www.strava.com/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: STRAVA_CLIENT_ID,
      client_secret: STRAVA_CLIENT_SECRET,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  })
  
  if (!response.ok) {
    throw new Error('Failed to refresh Strava token')
  }
  
  return response.json()
}

export async function getStravaActivities(
  accessToken: string,
  after?: number,
  before?: number
): Promise<StravaActivity[]> {
  const params = new URLSearchParams()
  if (after) params.set('after', after.toString())
  if (before) params.set('before', before.toString())
  params.set('per_page', '30')
  
  const response = await fetch(
    `https://www.strava.com/api/v3/athlete/activities?${params.toString()}`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  )
  
  if (!response.ok) {
    throw new Error('Failed to fetch Strava activities')
  }
  
  return response.json()
}



export function convertStravaActivity(activity: StravaActivity) {
  const distanceKm = activity.distance / 1000
  const durationMinutes = activity.moving_time / 60
  const paceMinKm = distanceKm > 0 ? durationMinutes / distanceKm : 0
  
  return {
    distance_km: Math.round(distanceKm * 100) / 100,
    duration_minutes: Math.round(durationMinutes),
    pace_min_km: Math.round(paceMinKm * 100) / 100,
    calories: activity.calories || Math.round(distanceKm * 60),
    elevation_gain_m: Math.round(activity.total_elevation_gain),
    average_heart_rate: activity.average_heartrate ? Math.round(activity.average_heartrate) : null,
    max_heart_rate: activity.max_heartrate ? Math.round(activity.max_heartrate) : null,
    strava_activity_id: activity.id.toString(),
  }
}
