import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'

type Params = {
  params: Promise<{
    id: string
  }>
}

// =======================
// GET ONE STUDENT
// =======================

export async function GET(
  req: Request,
  { params }: Params
) {
  try {
    const { id } = await params

    const student = await sql`
      SELECT *
      FROM students
      WHERE id = ${Number(id)}
      LIMIT 1
    `

    return NextResponse.json(
      student[0],
      {
        headers: {
          'Cache-Control':
            'no-store, no-cache, must-revalidate',
        },
      }
    )
  } catch (error) {
    console.error(error)

    return NextResponse.json(
      { error: 'Erro ao buscar aluno' },
      { status: 500 }
    )
  }
}

// =======================
// UPDATE STUDENT
// =======================

export async function PUT(
  req: Request,
  { params }: Params
) {
  try {
    const { id } = await params

    const body = await req.json()

    const student = await sql`
      UPDATE students
      SET
        name = ${body.name},
        email = ${body.email},
        birth_date = ${body.birth_date || null},
        weight_kg = ${body.weight_kg || null},
        height_cm = ${body.height_cm || null},
        base_pace_min_km = ${body.base_pace_min_km || null},
        test_3km_time = ${body.test_3km_time || null},
        test_3km_pace_min_km = ${body.test_3km_pace_min_km || null},

        z1_min = ${body.z1_min || null},
        z1_max = ${body.z1_max || null},
        z2_min = ${body.z2_min || null},
        z2_max = ${body.z2_max || null},
        z3_min = ${body.z3_min || null},
        z3_max = ${body.z3_max || null},
        z4_min = ${body.z4_min || null},
        z4_max = ${body.z4_max || null},
        z5_min = ${body.z5_min || null},
        z5_max = ${body.z5_max || null},

        avatar_url = COALESCE(
          ${body.avatar_url || null},
          avatar_url
        ),

        updated_at = NOW()

      WHERE id = ${Number(id)}
      RETURNING *
    `

    return NextResponse.json(student[0])
  } catch (error) {
    console.error(error)

    return NextResponse.json(
      { error: 'Erro ao atualizar aluno' },
      { status: 500 }
    )
  }
}

// =======================
// UPDATE AVATAR
// =======================

export async function PATCH(
  request: NextRequest,
  { params }: Params
) {
  try {
    const { id } = await params
    const body = await request.json()

    if (body.avatar_url !== undefined) {
      const updated = await sql`
        UPDATE students
        SET avatar_url = ${body.avatar_url}, updated_at = NOW()
        WHERE id = ${Number(id)}
        RETURNING *
      `

      return NextResponse.json({ success: true, student: updated[0] })
    }

    if (body.is_active !== undefined) {
      const updated = await sql`
        UPDATE students
        SET is_active = ${body.is_active}, updated_at = NOW()
        WHERE id = ${Number(id)}
        RETURNING *
      `

      return NextResponse.json({ success: true, student: updated[0] })
    }

    return NextResponse.json(
      { error: 'Nenhum campo válido enviado' },
      { status: 400 }
    )
  } catch (error) {
    console.error(error)

    return NextResponse.json(
      { error: 'Erro ao atualizar aluno' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: Params
) {
  try {
    const { id } = await params

    await sql`
      DELETE FROM students
      WHERE id = ${Number(id)}
    `

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error(error)

    return NextResponse.json(
      { error: 'Erro ao excluir aluno' },
      { status: 500 }
    )
  }
}