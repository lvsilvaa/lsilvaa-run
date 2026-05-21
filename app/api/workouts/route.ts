import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { getSession } from '@/lib/auth'

export async function POST(request: NextRequest) {
  const session = await getSession()
  
  if (!session || session.role !== 'coach') {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  try {
    const data = await request.json()
    const {
      student_id,
      title,
      description,
      scheduled_date,
      workout_type,
      target_distance_km,
      target_duration_minutes,
      target_pace_min_km,
      notes,
      steps,
    } = data

    if (!student_id || !title || !scheduled_date || !workout_type) {
      return NextResponse.json(
        { error: 'Campos obrigatórios: student_id, title, scheduled_date, workout_type' },
        { status: 400 }
      )
    }

    // Verify student belongs to coach
    const studentCheck = await sql`
      SELECT id FROM students WHERE id = ${student_id} AND coach_id = ${session.id}
    `

    if (studentCheck.length === 0) {
      return NextResponse.json({ error: 'Aluno não encontrado' }, { status: 404 })
    }

    const result = await sql`
  INSERT INTO workouts (
    student_id, coach_id, title, description, scheduled_date,
    workout_type, target_distance_km, target_duration_minutes,
    target_pace_min_km, notes, steps
  )
  VALUES (
    ${student_id}, ${session.id}, ${title}, ${description || null}, ${scheduled_date},
    ${workout_type}, ${target_distance_km || null}, ${target_duration_minutes || null},
    ${target_pace_min_km || null}, ${notes || null}, ${steps ? JSON.stringify(steps) : null}
  )
  RETURNING *
`

    return NextResponse.json({ workout: result[0] })
  } catch (error) {
    console.error('Create workout error:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
