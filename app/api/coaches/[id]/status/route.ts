import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { getSession } from '@/lib/auth'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession()

    if (!session || session.role !== 'coach') {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const admin = await sql`
      SELECT is_admin
      FROM coaches
      WHERE id = ${session.id}
      LIMIT 1
    `

    if (!admin[0]?.is_admin) {
      return NextResponse.json(
        { error: 'Apenas admin pode alterar status de coaches' },
        { status: 403 }
      )
    }

    const { id } = await params
    const body = await request.json()

    if (Number(id) === session.id) {
      return NextResponse.json(
        { error: 'Você não pode inativar sua própria conta' },
        { status: 400 }
      )
    }

    const updated = await sql`
      UPDATE coaches
      SET is_active = ${body.is_active}, updated_at = NOW()
      WHERE id = ${Number(id)}
      RETURNING id, name, email, is_active
    `

    return NextResponse.json({
      success: true,
      coach: updated[0],
    })
  } catch (error) {
    console.error(error)

    return NextResponse.json(
      { error: 'Erro ao alterar status do coach' },
      { status: 500 }
    )
  }
}