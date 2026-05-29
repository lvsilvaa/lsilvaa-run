import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { hashPassword } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const passwordHash = await hashPassword(body.password)

    const existing = await sql`
      SELECT id FROM coaches
      WHERE email = ${body.email} OR cpf = ${body.cpf}
      LIMIT 1
    `

    if (existing.length > 0) {
      return NextResponse.json(
        { error: 'E-mail ou CPF já cadastrado' },
        { status: 400 }
      )
    }

    await sql`
      INSERT INTO coaches (
        name,
        email,
        password_hash,
        phone,
        city,
        state,
        cpf,
        birth_date,
        approved,
        is_admin,
        created_at
      )
      VALUES (
        ${body.name},
        ${body.email},
        ${passwordHash},
        ${body.phone},
        ${body.city},
        ${body.state},
        ${body.cpf},
        ${body.birth_date},
        false,
        false,
        NOW()
      )
    `

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error(error)

    return NextResponse.json(
      { error: 'Erro ao solicitar cadastro' },
      { status: 500 }
    )
  }
}