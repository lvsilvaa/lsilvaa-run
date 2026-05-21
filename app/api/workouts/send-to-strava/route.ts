import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { sql } from '@/lib/db'

export async function POST(request: NextRequest) {
  const session = await getSession()
  
  if (!session || session.role !== 'coach') {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  try {
    const { workoutId } = await request.json()
    
    // Buscar treino e dados do aluno
    const workout = await sql`
      SELECT w.*, s.strava_access_token, s.name as student_name
      FROM workouts w
      JOIN students s ON w.student_id = s.id
      WHERE w.id = ${workoutId} AND w.coach_id = ${session.id}
    `
    
    if (workout.length === 0) {
      return NextResponse.json({ error: 'Treino não encontrado' }, { status: 404 })
    }
    
    const w = workout[0]
    
    if (!w.strava_access_token) {
      return NextResponse.json({ 
        error: 'Aluno não conectou Strava' 
      }, { status: 400 })
    }
    
    // Preparar dados do treino
    const stravaWorkout = {
      name: w.title,
      type: 'Run', // ou mapear w.workout_type
      start_date_local: new Date(w.scheduled_date).toISOString(),
      elapsed_time: (w.target_duration_minutes || 60) * 60,
      description: formatWorkoutDescription(w),
      distance: (w.target_distance_km || 0) * 1000, // converter para metros
      trainer: false,
      commute: false
    }
    
    // Enviar para Strava
    const stravaRes = await fetch('https://www.strava.com/api/v3/activities', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${w.strava_access_token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(stravaWorkout)
    })
    
    if (!stravaRes.ok) {
      const error = await stravaRes.json()
      throw new Error(error.message || 'Erro ao enviar para Strava')
    }
    
    const stravaActivity = await stravaRes.json()
    
    // Salvar ID da atividade Strava no treino
    await sql`
      UPDATE workouts 
      SET strava_activity_id = ${stravaActivity.id}
      WHERE id = ${workoutId}
    `
    
    return NextResponse.json({ 
      success: true,
      stravaActivityId: stravaActivity.id,
      stravaUrl: `https://www.strava.com/activities/${stravaActivity.id}`
    })
  } catch (error) {
    console.error('Send to Strava error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro ao enviar' },
      { status: 500 }
    )
  }
}

function formatWorkoutDescription(workout: any): string {
  let description = workout.description || ''
  
  // Adicionar steps se existirem
  if (workout.steps && workout.steps.length > 0) {
    description += '\n\nEstrutura do Treino:\n'
    
    workout.steps.forEach((step: any, index: number) => {
      const stepLabels: any = {
        warmup: 'Aquecimento',
        run: 'Corrida',
        recovery: 'Recuperação',
        cooldown: 'Desaquecimento',
        repeat: 'Intervalado'
      }
      
      description += `${index + 1}. ${stepLabels[step.type] || step.type}`
      
      if (step.duration_type === 'distance' && step.duration_value) {
        description += `: ${step.duration_value}km`
      } else if (step.duration_type === 'time' && step.duration_value) {
        description += `: ${step.duration_value}min`
      }
      
      if (step.target_from) {
        description += ` em ${step.target_from.toUpperCase()}`
      }
      
      description += '\n'
      
      // Adicionar steps de repetição
      if (step.type === 'repeat' && step.repeat_steps) {
        description += `   Repetir ${step.repeat_count}x:\n`
        step.repeat_steps.forEach((rs: any) => {
          description += `   - ${rs.description || rs.type}`
          if (rs.duration_value) {
            description += `: ${rs.duration_value}${rs.duration_type === 'distance' ? 'km' : 'min'}`
          }
          description += '\n'
        })
      }
    })
  }
  
  if (workout.notes) {
    description += `\n\nNotas: ${workout.notes}`
  }
  
  return description
}