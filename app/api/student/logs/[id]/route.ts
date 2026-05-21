import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { getSession } from '@/lib/auth'

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession()
  if (!session || session.role !== 'student') {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  const { id } = await params

  // Garante que o log pertence ao aluno logado
  const result = await sql`
    DELETE FROM workout_logs
    WHERE id = ${id} AND student_id = ${session.id}
    RETURNING id
  `

  if (result.length === 0) {
    return NextResponse.json({ error: 'Log não encontrado' }, { status: 404 })
  }

  return NextResponse.json({ success: true })
}