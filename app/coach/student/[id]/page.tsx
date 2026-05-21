import { redirect, notFound } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { sql } from '@/lib/db'
import { StudentDetail } from './components/student-detail'
import { formatPace } from '@/lib/format-pace'

type Props = {
  params: Promise<{ id: string }>
}

export default async function StudentPage({ params }: Props) {
  const { id } = await params
  const session = await getSession()
  
  if (!session || session.role !== 'coach') {
    redirect('/')
  }

  const studentData = await sql`
    SELECT * FROM students WHERE id = ${parseInt(id)} AND coach_id = ${session.id}
  `
  
  if (studentData.length === 0) {
    notFound()
  }

  const student = studentData[0]

  const workoutsData = await sql`
    SELECT * FROM workouts 
    WHERE student_id = ${student.id} 
    ORDER BY scheduled_date DESC
  `

  const logsData = await sql`
    SELECT wl.*, w.title as workout_title, w.workout_type
    FROM workout_logs wl
    JOIN workouts w ON wl.workout_id = w.id
    WHERE wl.student_id = ${student.id}
    ORDER BY wl.completed_at DESC
  `

  return (
    <StudentDetail 
      student={student} 
      workouts={workoutsData} 
      workoutLogs={logsData}
    />
  )
}
