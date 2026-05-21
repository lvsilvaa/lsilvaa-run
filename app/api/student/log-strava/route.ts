import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { getSession } from '@/lib/auth'

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session || session.role !== 'student') {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  const body = await req.json()

  await sql`
    INSERT INTO workout_logs (
      student_id,
      workout_id,
      actual_distance_km,
      actual_duration_minutes,
      actual_pace_min_km,
      calories_burned,
      elevation_gain_m,
      strava_activity_id,
      completed_at,
      notes
    ) VALUES (
      ${session.id},
      NULL,
      ${body.distance_km},
      ${body.duration_minutes},
      ${body.pace_min_km},
      ${body.calories},
      ${body.elevation_gain_m},
      ${body.strava_id},
      ${body.start_date},
      ${'Importado do Strava: ' + body.name}
    )
  `

  return NextResponse.json({ success: true })
}