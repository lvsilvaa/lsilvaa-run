import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { sql } from '@/lib/db'

export async function POST(request: NextRequest) {
  const session = await getSession()
  
  if (!session || session.role !== 'student') {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  try {
    const { token } = await request.json()
    
    if (!token) {
      return NextResponse.json({ error: 'Token não fornecido' }, { status: 400 })
    }

    // Salvar token no banco de dados
    await sql`
      UPDATE students 
      SET fcm_token = ${token}, fcm_token_updated_at = NOW()
      WHERE id = ${session.id}
    `

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Save FCM token error:', error)
    return NextResponse.json(
      { error: 'Erro ao salvar token' },
      { status: 500 }
    )
  }
}