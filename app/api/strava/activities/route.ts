import { NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { getSession } from '@/lib/auth'

async function refreshStravaToken(refreshToken: string) {
  const response = await fetch('https://www.strava.com/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id:     process.env.STRAVA_CLIENT_ID,
      client_secret: process.env.STRAVA_CLIENT_SECRET,
      grant_type:    'refresh_token',
      refresh_token: refreshToken,
    }),
  })
  if (!response.ok) throw new Error('Erro ao atualizar token do Strava')
  return response.json()
}

export async function GET() {
  try {
    const session = await getSession()
    if (!session || session.role !== 'student') {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const students = await sql`SELECT * FROM students WHERE id = ${session.id}`
    const student = students[0]

    if (!student?.strava_access_token) {
      return NextResponse.json({ activities: [] })
    }

    let accessToken = student.strava_access_token

    const expired =
      !student.strava_token_expires_at ||
      new Date(student.strava_token_expires_at) <= new Date()

    if (expired) {
      try {
        const refreshed = await refreshStravaToken(student.strava_refresh_token)
        accessToken = refreshed.access_token
        await sql`
          UPDATE students SET
            strava_access_token     = ${refreshed.access_token},
            strava_refresh_token    = ${refreshed.refresh_token},
            strava_token_expires_at = ${new Date(refreshed.expires_at * 1000).toISOString()}
          WHERE id = ${student.id}
        `
      } catch (err) {
        console.error('Erro refresh token:', err)
        return NextResponse.json({ error: 'Sessão Strava expirada' }, { status: 401 })
      }
    }

    const response = await fetch(
      'https://www.strava.com/api/v3/athlete/activities?per_page=20',
      { headers: { Authorization: `Bearer ${accessToken}` } }
    )

    const data = await response.json()

    if (!response.ok) {
      console.error('Strava API error:', data)
      return NextResponse.json({ error: 'Erro ao buscar atividades' }, { status: 500 })
    }

    if (!Array.isArray(data)) {
      console.error('Strava retornou formato inesperado:', data)
      return NextResponse.json({ activities: [] })
    }

    const activities = data
      .filter((a: any) => a.type === 'Run' || a.sport_type === 'Run')
      .map((activity: any) => {
        const distanceKm     = activity.distance / 1000
        const durationMinutes = Math.round(activity.moving_time / 60)
        const paceMinKm      = distanceKm > 0 ? (activity.moving_time / 60) / distanceKm : 0

        return {
          id:               activity.id.toString(),
          name:             activity.name,
          start_date:       activity.start_date,
          distance_km:      parseFloat(distanceKm.toFixed(2)),
          duration_minutes: durationMinutes,
          pace_min_km:      Math.round(paceMinKm * 100) / 100,
          calories:         activity.calories || Math.round(distanceKm * 60),
          elevation_gain_m: Math.round(activity.total_elevation_gain || 0),
        }
      })

    return NextResponse.json({ activities })

  } catch (err) {
    console.error('Erro inesperado em /api/strava/activities:', err)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}