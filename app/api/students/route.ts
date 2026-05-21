import { NextResponse } from 'next/server'
import { sql } from '@/lib/db'

// =======================
// GET STUDENTS
// =======================

export async function GET() {
  try {
    const students = await sql`
      SELECT *
      FROM students
      ORDER BY created_at DESC
    `

    return NextResponse.json({
      students,
    })
  } catch (error) {
    console.error(error)

    return NextResponse.json(
      {
        error: 'Erro ao buscar alunos',
      },
      {
        status: 500,
      }
    )
  }
}

// =======================
// CREATE STUDENT
// =======================

export async function POST(req: Request) {
  try {
    const body = await req.json()

    const student = await sql`
      INSERT INTO students (
        coach_id,
        name,
        email,
        password_hash,
        birth_date,
        weight_kg,
        height_cm,
        base_pace_min_km,
        resting_heart_rate,
        max_heart_rate,
        test_3km_time,
        test_3km_pace_min_km,

        z1_min,
        z1_max,

        z2_min,
        z2_max,

        z3_min,
        z3_max,

        z4_min,
        z4_max,

        z5_min,
        z5_max
      )
      VALUES (
        ${body.coach_id || null},
        ${body.name},
        ${body.email},
        ${body.password || ''},
        ${body.birth_date || null},
        ${body.weight_kg || null},
        ${body.height_cm || null},
        ${body.base_pace_min_km || null},
        ${body.resting_heart_rate || null},
        ${body.max_heart_rate || null},
        ${body.test_3km_time || null},
        ${body.test_3km_pace_min_km || null},

        ${body.z1_min || null},
        ${body.z1_max || null},

        ${body.z2_min || null},
        ${body.z2_max || null},

        ${body.z3_min || null},
        ${body.z3_max || null},

        ${body.z4_min || null},
        ${body.z4_max || null},

        ${body.z5_min || null},
        ${body.z5_max || null}
      )
      RETURNING *
    `

    return NextResponse.json(student[0])
  } catch (error) {
    console.error(error)

    return NextResponse.json(
      {
        error: 'Erro ao criar aluno',
      },
      {
        status: 500,
      }
    )
  }
}