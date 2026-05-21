import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { getStravaAuthUrl } from '@/lib/strava'

export async function GET(request: NextRequest) {
  const session = await getSession()
  
 if (!session || session.role !== 'student') {

if (!session) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }}

  // Check if Strava is configured
  if (!process.env.STRAVA_CLIENT_ID || !process.env.STRAVA_CLIENT_SECRET) {
    return NextResponse.json(
      { error: 'Integração Strava não configurada' },
      { status: 400 }
    )
  }

  const authUrl = getStravaAuthUrl(session.id)
  
  return NextResponse.redirect(authUrl)
}
