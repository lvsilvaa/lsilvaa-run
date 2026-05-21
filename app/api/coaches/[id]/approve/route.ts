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
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401 }
      )
    }

    // aguarda params
    const resolvedParams = await params
    const id = Number(resolvedParams.id)

    await sql`
      UPDATE coaches
      SET approved = true
      WHERE id = ${id}
    `

    return NextResponse.json({
      success: true
    })

  } catch (error) {
    console.error(error)

    return NextResponse.json(
      { error: 'Erro ao aprovar coach' },
      { status: 500 }
    )
  }
}