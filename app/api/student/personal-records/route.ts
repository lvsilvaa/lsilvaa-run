import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { sql } from '@/lib/db'

const PR_DISTANCES = [
  { label: '1 milha', km: 1.609 },
  { label: '3 km', km: 3 },
  { label: '5 km', km: 5 },
  { label: '10 km', km: 10 },
  { label: '15 km', km: 15 },
  { label: '21 km', km: 21.097 },
  { label: '42 km', km: 42.195 },
]

export async function GET() {
  const session = await getSession()

  if (!session || session.role !== 'student') {
    return NextResponse.json(
      { error: 'Não autorizado' },
      { status: 401 }
    )
  }

  const records = await sql`
    SELECT *
    FROM student_personal_records
    WHERE student_id = ${session.id}
  `

  const formatted = PR_DISTANCES.map((distance) => {
    const record = records.find(
      (r: any) => r.distance_label === distance.label
    )

    return {
      distance_label: distance.label,
      distance_km: distance.km,
      record_seconds: record?.record_seconds ?? null,
      source: record?.source ?? null,
    }
  })

  return NextResponse.json({
    records: formatted,
  })
}

export async function PATCH(request: NextRequest) {
  const session = await getSession()

  if (!session || session.role !== 'student') {
    return NextResponse.json(
      { error: 'Não autorizado' },
      { status: 401 }
    )
  }

  const body = await request.json()

  const distance = PR_DISTANCES.find(
    (d) => d.label === body.distance_label
  )

  if (!distance) {
    return NextResponse.json(
      { error: 'Distância inválida' },
      { status: 400 }
    )
  }

  await sql`
    INSERT INTO student_personal_records (
      student_id,
      distance_label,
      distance_km,
      record_seconds,
      source,
      updated_at
    )
    VALUES (
      ${session.id},
      ${distance.label},
      ${distance.km},
      ${body.record_seconds || null},
      'manual',
      NOW()
    )
    ON CONFLICT (student_id, distance_label)
    DO UPDATE SET
      record_seconds = EXCLUDED.record_seconds,
      source = 'manual',
      updated_at = NOW()
  `

  return NextResponse.json({
    success: true,
  })
}