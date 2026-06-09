import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { refreshStravaToken, convertStravaActivity, StravaActivity } from '@/lib/strava'

const STRAVA_VERIFY_TOKEN = process.env.STRAVA_WEBHOOK_VERIFY_TOKEN ?? 'lsilvaa_run_webhook'

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams
  const mode      = params.get('hub.mode')
  const token     = params.get('hub.verify_token')
  const challenge = params.get('hub.challenge')

  if (mode === 'subscribe' && token === STRAVA_VERIFY_TOKEN) {
    console.log('✅ Strava webhook verificado com sucesso')
    return NextResponse.json({ 'hub.challenge': challenge })
  }

  return NextResponse.json({ error: 'Token de verificação inválido' }, { status: 403 })
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    console.log('📩 [1] Evento recebido:', JSON.stringify(body))

    const { object_type, aspect_type, object_id, owner_id } = body

    if (object_type !== 'activity' || aspect_type !== 'create') {
      console.log('⏭️ [2] Ignorado — não é criação de atividade:', object_type, aspect_type)
      return NextResponse.json({ status: 'ignored' })
    }

    console.log('🔍 [3] Buscando aluno com strava_athlete_id:', owner_id.toString())

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

    console.log('🔍 [4] Resultado da busca:', JSON.stringify(result))

    if (!result || result.length === 0) {
      console.log('⚠️ [5] Nenhum aluno encontrado para athlete_id:', owner_id)
      return NextResponse.json({ status: 'student_not_found' })
    }

    const student = result[0]
    console.log('✅ [6] Aluno encontrado, id:', student.id)

    // Verificar e renovar token se necessário
    let accessToken = student.strava_access_token
    const expiresAt = new Date(student.strava_token_expires_at).getTime()
    const now = Date.now()

    console.log('🕐 [7] Token expira em:', new Date(expiresAt).toISOString(), '| Agora:', new Date(now).toISOString())

    if (now >= expiresAt - 60_000) {
      console.log('🔄 [8] Renovando token...')
      try {
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
        console.log('✅ [9] Token renovado com sucesso')
      } catch (refreshErr) {
        console.error('❌ [9] Erro ao renovar token:', refreshErr)
        return NextResponse.json({ status: 'token_refresh_failed' }, { status: 200 })
      }
    }

    // Buscar detalhes da atividade
    console.log('🌐 [10] Buscando atividade no Strava, id:', object_id)
    const activityRes = await fetch(
      `https://www.strava.com/api/v3/activities/${object_id}`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    )

    console.log('🌐 [11] Status da resposta Strava:', activityRes.status)

    if (!activityRes.ok) {
      const errText = await activityRes.text()
      console.error('❌ [12] Erro ao buscar atividade:', errText)
      return NextResponse.json({ status: 'activity_fetch_failed' }, { status: 200 })
    }

    const activity: StravaActivity = await activityRes.json()
    console.log('✅ [13] Atividade recebida:', activity.name, '| Tipo:', activity.type, '| Distância:', activity.distance)

    // Verificar tipo
    const tiposDeCorreida = ['Run', 'VirtualRun', 'TrailRun']
    if (!tiposDeCorreida.includes(activity.type)) {
      console.log('⏭️ [14] Ignorado — tipo não é corrida:', activity.type)
      return NextResponse.json({ status: 'not_a_run' })
    }

    // Verificar duplicata
    const existing = await sql`
      SELECT id FROM workout_logs
      WHERE student_id = ${student.id}
        AND strava_activity_id = ${object_id.toString()}
      LIMIT 1
    `
    console.log('🔍 [15] Atividade já existe?', existing?.length > 0)

    if (existing && existing.length > 0) {
      console.log('⏭️ [16] Atividade já importada:', object_id)
      return NextResponse.json({ status: 'already_imported' })
    }

    // Converter e salvar
    const converted = convertStravaActivity(activity)
    console.log('💾 [17] Salvando no banco:', JSON.stringify(converted))

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

    console.log('✅ [18] Atividade salva com sucesso:', activity.name, '| Aluno:', student.id)
    return NextResponse.json({ status: 'ok' })

  } catch (error) {
    console.error('❌ [CATCH] Erro geral no webhook:', error)
    return NextResponse.json({ status: 'error' }, { status: 200 })
  }
}