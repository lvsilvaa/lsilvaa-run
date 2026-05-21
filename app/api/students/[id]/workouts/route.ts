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

  const workouts = await sql`
    SELECT * FROM workouts 
    WHERE student_id = ${parseInt(id)} 
    ORDER BY scheduled_date DESC
  `

  return NextResponse.json({ workouts })
}
