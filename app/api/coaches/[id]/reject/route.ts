import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { getSession } from '@/lib/auth'

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession()

    if (!session || session.role !== 'coach') {
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401 }
      )
    }

    // aguarda os params
    const params = await context.params
    const id = Number(params.id)

    // impede remover a si mesmo
    if (id === session.id) {
      return NextResponse.json(
        { error: 'Você não pode remover sua própria conta' },
        { status: 400 }
      )
    }

    await sql`
      DELETE FROM coaches
      WHERE id = ${id}
      AND approved = false
    `

    return NextResponse.json({
      success: true
    })

  } catch (error) {
    console.error(error)

    return NextResponse.json(
      { error: 'Erro ao rejeitar coach' },
      { status: 500 }
    )
  }
}