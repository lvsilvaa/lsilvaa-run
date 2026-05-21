import { NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { getSession } from '@/lib/auth'

export async function GET() {
  const session = await getSession()
  
  if (!session || session.role !== 'student') {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  const logs = await sql`
    SELECT wl.*, w.title as workout_title
    FROM workout_logs wl
    LEFT JOIN workouts w ON wl.workout_id = w.id
    WHERE wl.student_id = ${session.id}
    ORDER BY wl.completed_at DESC
    LIMIT 20
  `

  return NextResponse.json({ logs })
}