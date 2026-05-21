'use server'

import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { getSession } from '@/lib/auth'

export async function POST(req: NextRequest) {
  try {
    const session = await getSession()
    if (!session || session.role !== 'coach') {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }
    
    const userId = session.id

    const body = await req.json()
    const { studentId, workouts } = body

    if (!studentId || !workouts || !Array.isArray(workouts)) {
      return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 })
    }

    // Verificar se o aluno pertence ao coach
    const studentCheck = await sql`
      SELECT id FROM students WHERE id = ${studentId} AND coach_id = ${userId}
    `
    if (studentCheck.length === 0) {
      return NextResponse.json({ error: 'Aluno não encontrado' }, { status: 404 })
    }

    // Inserir todos os treinos em batch
    const createdWorkouts = []
    for (const workout of workouts) {
      const result = await sql`
        INSERT INTO workouts (
          student_id,
          coach_id,
          title,
          description,
          scheduled_date,
          workout_type,
          target_distance_km,
          target_duration_minutes,
          target_pace_min_km,
          notes,
          status
        ) VALUES (
          ${studentId},
          ${userId},
          ${workout.title},
          ${workout.description || null},
          ${workout.scheduled_date},
          ${workout.workout_type},
          ${workout.target_distance_km || null},
          ${workout.target_duration_minutes || null},
          ${workout.target_pace_min_km || null},
          ${workout.notes || null},
          'pending'
        )
        RETURNING *
      `
      createdWorkouts.push(result[0])
    }

    return NextResponse.json({ 
      success: true, 
      message: `${createdWorkouts.length} treinos criados com sucesso`,
      workouts: createdWorkouts 
    })
  } catch (error) {
    console.error('Erro ao criar plano de treinos:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
