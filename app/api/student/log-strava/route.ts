import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { getSession } from '@/lib/auth'

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session || session.role !== 'student') {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  const body = await req.json()

  // Data da atividade (apenas a parte da data, sem hora)
  const activityDate = body.start_date
    ? new Date(body.start_date).toISOString().split('T')[0]
    : new Date().toISOString().split('T')[0]

  // Buscar treino agendado para o dia da atividade
  const todayWorkout = await sql`
    SELECT id FROM workouts
    WHERE student_id = ${session.id}
      AND scheduled_date = ${activityDate}
      AND status = 'pending'
    LIMIT 1
  `

  const workoutId = todayWorkout.length > 0 ? todayWorkout[0].id : null

  // Salvar o log vinculando ao treino do dia (se existir)
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
      ${workoutId},
      ${body.distance_km},
      ${body.duration_minutes},
      ${body.pace_min_km},
      ${body.calories},
      ${body.elevation_gain_m},
      ${body.strava_id},
      ${body.start_date},
      ${body.name}
    )
  `

  // Se tinha treino no dia, marcar como concluído
  if (workoutId) {
    await sql`
      UPDATE workouts
      SET status = 'completed', updated_at = NOW()
      WHERE id = ${workoutId}
    `
  }

  return NextResponse.json({ success: true, workout_completed: !!workoutId })
}