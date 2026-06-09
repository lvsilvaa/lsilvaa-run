import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { refreshStravaToken, convertStravaActivity, StravaActivity } from '@/lib/strava'

const STRAVA_VERIFY_TOKEN = process.env.STRAVA_WEBHOOK_VERIFY_TOKEN ?? 'lsilvaa_run_webhook'

// ─────────────────────────────────────────
// GET — Verificação do webhook pelo Strava
// Strava chama essa rota uma vez para confirmar que o endpoint existe
// ─────────────────────────────────────────
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams

  const mode      = params.get('hub.mode')
  const token     = params.get('hub.verify_token')
  const challenge = params.get('hub.challenge')

  if (mode === 'subscribe' && token === STRAVA_VERIFY_TOKEN) {
    console.log('✅ Strava webhook verificado com sucesso')
    return NextResponse.json({ 'hub.challenge': challenge })
  }

  return NextResponse.json(
    { error: 'Token de verificação inválido' },
    { status: 403 }
  )
}

// ─────────────────────────────────────────
// POST — Recebe eventos do Strava em tempo real
// Chamado sempre que o aluno cria/atualiza/deleta uma atividade
// ─────────────────────────────────────────
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    console.log('📩 Evento Strava recebido:', JSON.stringify(body))

    const {
      object_type,  // "activity" ou "athlete"
      aspect_type,  // "create", "update", "delete"
      object_id,    // ID da atividade no Strava
      owner_id,     // ID do atleta no Strava
    } = body

    // Só processa criação de atividades
    if (object_type !== 'activity' || aspect_type !== 'create') {
      return NextResponse.json({ status: 'ignored' })
    }

    // Buscar aluno pelo strava_athlete_id
    const result = await sql`
      SELECT 
        id,
        strava_access_token,
        strava_refresh_token,
        strava_token_expires_at
      FROM students
      WHERE strava_athlete_id = ${owner_id.toString()}
      LIMIT 1
    `

    if (!result.rows || result.rows.length === 0) {
      console.log('⚠️ Nenhum aluno encontrado para o atleta Strava:', owner_id)
      return NextResponse.json({ status: 'student_not_found' })
    }

    const student = result.rows[0]

    // Verificar se o token está expirado e renovar se necessário
    let accessToken = student.strava_access_token
    const expiresAt = new Date(student.strava_token_expires_at).getTime()
    const now = Date.now()

    if (now >= expiresAt - 60_000) {
      console.log('🔄 Renovando token do aluno', student.id)

      const newTokens = await refreshStravaToken(student.strava_refresh_token)

      await sql`
        UPDATE students SET
          strava_access_token     = ${newTokens.access_token},
          strava_refresh_token    = ${newTokens.refresh_token},
          strava_token_expires_at = ${new Date(newTokens.expires_at * 1000).toISOString()},
          updated_at              = NOW()
        WHERE id = ${student.id}
      `

      accessToken = newTokens.access_token
    }

    // Buscar detalhes da atividade no Strava
    const activityRes = await fetch(
      `https://www.strava.com/api/v3/activities/${object_id}`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    )

    if (!activityRes.ok) {
      console.error('❌ Erro ao buscar atividade no Strava:', object_id)
      return NextResponse.json({ status: 'activity_fetch_failed' }, { status: 200 })
    }

    const activity: StravaActivity = await activityRes.json()

    // Só importa corridas (Run, VirtualRun, TrailRun)
    const tiposDeCorreida = ['Run', 'VirtualRun', 'TrailRun']
    if (!tiposDeCorreida.includes(activity.type)) {
      console.log('⏭️ Atividade ignorada (não é corrida):', activity.type)
      return NextResponse.json({ status: 'not_a_run' })
    }

    // Verificar se essa atividade já foi importada
    const existing = await sql`
      SELECT id FROM workout_logs
      WHERE student_id = ${student.id}
        AND strava_activity_id = ${object_id.toString()}
      LIMIT 1
    `

    if (existing.rows && existing.rows.length > 0) {
      console.log('⏭️ Atividade já importada:', object_id)
      return NextResponse.json({ status: 'already_imported' })
    }

    // Converter e salvar no banco
    const converted = convertStravaActivity(activity)

    await sql`
      INSERT INTO workout_logs (
        student_id,
        workout_id,
        completed_at,
        actual_distance_km,
        actual_duration_minutes,
        actual_pace_min_km,
        calories_burned,
        elevation_gain_m,
        average_heart_rate,
        max_heart_rate,
        strava_activity_id,
        notes
      ) VALUES (
        ${student.id},
        NULL,
        ${activity.start_date},
        ${converted.distance_km},
        ${converted.duration_minutes},
        ${converted.pace_min_km},
        ${converted.calories},
        ${converted.elevation_gain_m},
        ${converted.average_heart_rate},
        ${converted.max_heart_rate},
        ${converted.strava_activity_id},
        ${'Importado automaticamente do Strava: ' + activity.name}
      )
    `

    console.log('✅ Atividade importada automaticamente:', activity.name, 'para aluno', student.id)

    return NextResponse.json({ status: 'ok' })

  } catch (error) {
    console.error('❌ Erro no webhook Strava:', error)
    // Sempre retorna 200 para o Strava não retentar
    return NextResponse.json({ status: 'error' }, { status: 200 })
  }
}