import { NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { getSession } from '@/lib/auth'

export async function GET() {
  const session = await getSession()
  
  if (!session || session.role !== 'student') {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  const today = new Date().toISOString().split('T')[0]
  
  const workouts = await sql`
    SELECT * FROM workouts 
    WHERE student_id = ${session.id}
    AND scheduled_date <= ${today}
    ORDER BY scheduled_date DESC
  `

  return NextResponse.json({ workouts })
}
