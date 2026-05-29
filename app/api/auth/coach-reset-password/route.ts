import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { hashPassword } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    if (body.action === 'verify') {
      const coach = await sql`
        SELECT id
        FROM coaches
        WHERE email = ${body.email}
        AND cpf = ${body.cpf}
        AND birth_date = ${body.birth_date}
        LIMIT 1
      `

      if (coach.length === 0) {
        return NextResponse.json(
          { error: 'Dados não conferem' },
          { status: 400 }
        )
      }

      return NextResponse.json({ success: true })
    }

    if (body.action === 'reset') {
      const passwordHash = await hashPassword(body.new_password)

      const updated = await sql`
        UPDATE coaches
        SET password_hash = ${passwordHash}
        WHERE email = ${body.email}
        AND cpf = ${body.cpf}
        AND birth_date = ${body.birth_date}
        RETURNING id
      `

      if (updated.length === 0) {
        return NextResponse.json(
          { error: 'Dados não conferem' },
          { status: 400 }
        )
      }

      return NextResponse.json({ success: true })
    }

    return NextResponse.json(
      { error: 'Ação inválida' },
      { status: 400 }
    )
  } catch (error) {
    console.error(error)

    return NextResponse.json(
      { error: 'Erro ao redefinir senha' },
      { status: 500 }
    )
  }
}