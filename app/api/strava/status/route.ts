import { NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { getSession } from '@/lib/auth'

export async function GET() {
  const session = await getSession()
  
  if (!session || session.role !== 'student') {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  const studentData = await sql`
    SELECT strava_athlete_id FROM students WHERE id = ${session.id}
  `

  return NextResponse.json({ 
    connected: !!studentData[0]?.strava_athlete_id 
  })
}

export async function DELETE() {
  const session = await getSession()
  
  if (!session || session.role !== 'student') {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  await sql`
    UPDATE students SET
      strava_athlete_id = NULL,
      strava_access_token = NULL,
      strava_refresh_token = NULL,
      strava_token_expires_at = NULL,
      updated_at = NOW()
    WHERE id = ${session.id}
  `

  return NextResponse.json({ success: true })
}
