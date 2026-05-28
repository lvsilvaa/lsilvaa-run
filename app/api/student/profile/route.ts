import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { hashPassword, verifyPassword } from '@/lib/auth'

export async function PATCH(request: NextRequest) {
  try {
    const session = await getSession()

    if (!session || session.role !== 'student') {
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401 }
      )
    }

    const body = await request.json()

    const studentData = await sql`
      SELECT id, password_hash
      FROM students
      WHERE id = ${session.id}
      LIMIT 1
    `

    const student = studentData[0]

    if (!student) {
      return NextResponse.json(
        { error: 'Aluno não encontrado' },
        { status: 404 }
      )
    }

    let passwordHash = student.password_hash

    if (body.new_password) {
      if (!body.current_password) {
        return NextResponse.json(
          { error: 'Informe a senha atual' },
          { status: 400 }
        )
      }

      const validPassword = await verifyPassword(
        body.current_password,
        student.password_hash
      )

      if (!validPassword) {
        return NextResponse.json(
          { error: 'Senha atual incorreta' },
          { status: 400 }
        )
      }

      passwordHash = await hashPassword(body.new_password)
    }

    const updated = await sql`
      UPDATE students
      SET
        name = ${body.name},
        birth_date = ${body.birth_date || null},
        weight_kg = ${body.weight_kg || null},
        height_cm = ${body.height_cm || null},
        password_hash = ${passwordHash},
        updated_at = NOW()
      WHERE id = ${session.id}
      RETURNING *
    `

    return NextResponse.json({
      success: true,
      student: updated[0],
    })
  } catch (error) {
    console.error(error)

    return NextResponse.json(
      { error: 'Erro ao atualizar perfil' },
      { status: 500 }
    )
  }
}