import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { getSession } from '@/lib/auth'

export async function POST(request: NextRequest) {
  const session = await getSession()
  
  if (!session || session.role !== 'student') {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  try {
    const data = await request.json()
    const {
      workout_id,
      actual_distance_km,
      actual_duration_minutes,
      actual_pace_min_km,
      calories_burned,
      average_heart_rate,
      elevation_gain_m,
      notes,
      strava_activity_id,
    } = data

    if (!workout_id || !actual_distance_km || !actual_duration_minutes) {
      return NextResponse.json(
        { error: 'Workout ID, distância e duração são obrigatórios' },
        { status: 400 }
      )
    }

    // Verify workout belongs to student
    const workoutCheck = await sql`
      SELECT id, scheduled_date FROM workouts 
      WHERE id = ${workout_id} AND student_id = ${session.id}
    `

    if (workoutCheck.length === 0) {
      return NextResponse.json({ error: 'Treino não encontrado' }, { status: 404 })
    }

    // Check if workout is in the past or today (cannot log future workouts)
    const workoutDate = new Date(workoutCheck[0].scheduled_date)
    const today = new Date()
    today.setHours(23, 59, 59, 999)
    
    if (workoutDate > today) {
      return NextResponse.json(
        { error: 'Não é possível registrar treinos futuros' },
        { status: 400 }
      )
    }

    // Create workout log
    const logResult = await sql`
      INSERT INTO workout_logs (
        workout_id, student_id, actual_distance_km, actual_duration_minutes,
        actual_pace_min_km, calories_burned, average_heart_rate, 
        elevation_gain_m, strava_activity_id, notes
      )
      VALUES (
        ${workout_id}, ${session.id}, ${actual_distance_km}, ${actual_duration_minutes},
        ${actual_pace_min_km || null}, ${calories_burned || null}, ${average_heart_rate || null},
        ${elevation_gain_m || null}, ${strava_activity_id || null}, ${notes || null}
      )
      RETURNING *
    `

    // Update workout status to completed
    await sql`
      UPDATE workouts SET status = 'completed', updated_at = NOW()
      WHERE id = ${workout_id}
    `

    // Update student's base pace if this is faster
    const student = await sql`
      SELECT base_pace_min_km FROM students WHERE id = ${session.id}
    `
    
    if (actual_pace_min_km && (!student[0].base_pace_min_km || actual_pace_min_km < student[0].base_pace_min_km)) {
      await sql`
        UPDATE students SET base_pace_min_km = ${actual_pace_min_km}, updated_at = NOW()
        WHERE id = ${session.id}
      `
    }

    return NextResponse.json({ log: logResult[0] })
  } catch (error) {
    console.error('Log workout error:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
