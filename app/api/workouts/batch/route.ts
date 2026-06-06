import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { getSession } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const session = await getSession()

    if (!session || session.role !== 'coach') {
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401 }
      )
    }

    const body = await request.json()

    for (const workout of body.workouts) {
      await sql`
        INSERT INTO workouts (
          coach_id,
          student_id,
          title,
          workout_type,
          scheduled_date,
          target_distance_km,
          target_duration_minutes,
          target_pace_min_km,
          description,
          notes,
          steps,
          status
          
        )
        VALUES (
          ${session.id},
          ${body.student_id},
          ${workout.title},
          ${workout.workout_type},
          ${workout.scheduled_date},
          ${workout.target_distance_km},
          ${workout.target_duration_minutes},
          ${workout.target_pace_min_km},
          ${workout.description},
          ${workout.notes},
          ${workout.steps ? JSON.stringify(workout.steps) : null},
          'pending'
        )
      `
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error(error)

    return NextResponse.json(
      { error: 'Erro ao criar planejamento' },
      { status: 500 }
    )
  }
}