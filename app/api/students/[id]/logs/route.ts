import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { getSession } from '@/lib/auth'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const session = await getSession()
  
  if (!session || session.role !== 'coach') {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  const logs = await sql`
    SELECT wl.*, w.title as workout_title, w.workout_type
    FROM workout_logs wl
    LEFT JOIN workouts w ON wl.workout_id = w.id
    WHERE wl.student_id = ${parseInt(id)}
    ORDER BY wl.completed_at DESC
  `

  return NextResponse.json({ logs })
}
