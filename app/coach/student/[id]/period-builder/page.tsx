import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { sql } from '@/lib/db'
import { PeriodWorkoutBuilderPage } from './period-workout-builder-page'

type Props = {
  params: Promise<{
    id: string
  }>
}

export default async function Page({ params }: Props) {
  const session = await getSession()

  if (!session || session.role !== 'coach') {
    redirect('/')
  }

  const { id } = await params

  const studentData = await sql`
    SELECT *
    FROM students
    WHERE id = ${Number(id)}
    AND coach_id = ${session.id}
    LIMIT 1
  `

  const student = studentData[0]

  if (!student) {
    redirect('/coach')
  }

  return (
    <PeriodWorkoutBuilderPage
      student={student}
    />
  )
}