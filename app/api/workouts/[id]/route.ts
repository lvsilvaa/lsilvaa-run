import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { getSession } from '@/lib/auth'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const session = await getSession()
  
  if (!session) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  const workout = await sql`
    SELECT * FROM workouts WHERE id = ${parseInt(id)}
  `

  if (workout.length === 0) {
    return NextResponse.json({ error: 'Treino não encontrado' }, { status: 404 })
  }

  return NextResponse.json({ workout: workout[0] })
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const session = await getSession()
  
  
  if (!session || session.role !== 'coach') {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  try {
    const data = await request.json()
    const {
      title,
      description,
      scheduled_date,
      workout_type,
      target_distance_km,
      target_duration_minutes,
      target_pace_min_km,
      notes,
      steps,
      status,
    } = data

    // Verify workout belongs to coach
    const workoutCheck = await sql`
      SELECT id FROM workouts WHERE id = ${parseInt(id)} AND coach_id = ${session.id}
    `

    if (workoutCheck.length === 0) {
      return NextResponse.json({ error: 'Treino não encontrado' }, { status: 404 })
    }

    const result = await sql`
  UPDATE workouts SET
    title = ${title},
    description = ${description || null},
    scheduled_date = ${scheduled_date},
    workout_type = ${workout_type},
    target_distance_km = ${target_distance_km || null},
    target_duration_minutes = ${target_duration_minutes || null},
    target_pace_min_km = ${target_pace_min_km || null},
    notes = ${notes || null},
    steps = ${steps ? JSON.stringify(steps) : null},
    status = ${status || 'pending'},
    updated_at = NOW()
  WHERE id = ${parseInt(id)}
  RETURNING *
`

    return NextResponse.json({ workout: result[0] })
  } catch (error) {
    console.error('Update workout error:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const session = await getSession()
  
  if (!session || session.role !== 'coach') {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  // Verify workout belongs to coach
  const workoutCheck = await sql`
    SELECT id FROM workouts WHERE id = ${parseInt(id)} AND coach_id = ${session.id}
  `

  if (workoutCheck.length === 0) {
    return NextResponse.json({ error: 'Treino não encontrado' }, { status: 404 })
  }

  await sql`DELETE FROM workouts WHERE id = ${parseInt(id)}`

  return NextResponse.json({ success: true })
}
