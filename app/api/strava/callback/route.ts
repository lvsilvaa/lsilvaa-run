import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { exchangeStravaCode } from '@/lib/strava'
import { getSession } from '@/lib/auth'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const code = searchParams.get('code')
  const state = searchParams.get('state') // student_id
  const error = searchParams.get('error')
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin

  

  // 1. Verificar erro antes de qualquer coisa
  if (error) {
    return NextResponse.redirect(`${baseUrl}/student?strava_error=denied`)
  }

  // 2. Validar presença de code e state
  if (!code || !state) {
    return NextResponse.redirect(`${baseUrl}/student?strava_error=invalid`)
  }

  // 3. Verificar sessão e validar que o state bate com o usuário logado
  const session = await getSession()
  if (!session || session.id.toString() !== state) {
    return NextResponse.redirect(`${baseUrl}/student?strava_error=invalid`)
  }

  try {
    const studentId = parseInt(state)

    // Trocar code pelos tokens
    const tokenData = await exchangeStravaCode(code)

    // Salvar tokens no banco
    await sql`
      UPDATE students SET
        strava_athlete_id       = ${tokenData.athlete.id.toString()},
        strava_access_token     = ${tokenData.access_token},
        strava_refresh_token    = ${tokenData.refresh_token},
        strava_token_expires_at = ${new Date(tokenData.expires_at * 1000).toISOString()},
        updated_at              = NOW()
      WHERE id = ${studentId}
    `

    return NextResponse.redirect(`${baseUrl}/student?strava=connected`)
  } catch (err) {
    console.error('Strava callback error:', err)
    return NextResponse.redirect(`${baseUrl}/student?strava_error=failed`)
  }
}