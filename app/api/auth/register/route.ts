import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { hashPassword } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const {
      name,
      email,
      password,
      role,
      brand_name
    } = body

    if (!name || !email || !password || !role) {
      return NextResponse.json(
        { error: 'Campos obrigatórios ausentes' },
        { status: 400 }
      )
    }

    // AQUI
    const hashedPassword = await hashPassword(password)

    if (role === 'coach') {
      await sql`
        INSERT INTO coaches (
          name,
          email,
          password_hash,
          brand_name,
          approved,
          is_admin
        )
        VALUES (
          ${name},
          ${email},
          ${hashedPassword},
          ${brand_name || null},
          false,
          false
        )
      `
    }

    if (role === 'student') {
      await sql`
        INSERT INTO students (
          name,
          email,
          password_hash
        )
        VALUES (
          ${name},
          ${email},
          ${hashedPassword}
        )
      `
    }

    return NextResponse.json({
      success: true
    })

  } catch (error) {
    console.error('Register error:', error)

    return NextResponse.json(
      { error: 'Erro ao criar conta' },
      { status: 500 }
    )
  }
}