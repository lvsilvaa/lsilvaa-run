import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { verifyPassword, setSession } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const { email, password, role } = await request.json()

    if (!email || !password || !role) {
      return NextResponse.json(
        { error: 'E-mail, senha e tipo de usuário são obrigatórios' },
        { status: 400 }
      )
    }

    let user

    if (role === 'coach') {
      const result = await sql`
        SELECT 
          id,
          name,
          email,
          password_hash,
          approved,
          is_admin,
          is_active
        FROM coaches
        WHERE email = ${email}
      `

      user = result[0]

    } else if (role === 'student') {
      const result = await sql`
        SELECT 
          id,
          name,
          email,
          password_hash
        FROM students
        WHERE email = ${email}
      `

      user = result[0]

    } else {
      return NextResponse.json(
        { error: 'Tipo de usuário inválido' },
        { status: 400 }
      )
    }

    // usuário não encontrado
    if (!user) {
      return NextResponse.json(
        { error: 'E-mail ou senha incorretos' },
        { status: 401 }
      )
    }

    // coach não aprovado
    if (role === 'coach' && !user.approved) {
      return NextResponse.json(
        { error: 'Sua conta ainda não foi aprovada' },
        { status: 403 }
      )
    }
    if (role === 'coach' && user.is_active === false) {
        return NextResponse.json(
          { error: 'Sua conta está inativa. Entre em contato com o administrador.' },
          { status: 403 }
        )
      }

    // valida senha
    const isValid = await verifyPassword(
      password,
      user.password_hash
    )

    if (!isValid) {
      return NextResponse.json(
        { error: 'E-mail ou senha incorretos' },
        { status: 401 }
      )
    }

    await setSession({
      id: user.id,
      email: user.email,
      name: user.name,
      role: role as 'coach' | 'student',
    })

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role,
      },
    })

  } catch (error) {
    console.error('Login error:', error)

    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}