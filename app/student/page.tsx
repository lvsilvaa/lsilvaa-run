import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { sql } from '@/lib/db'
import { StudentDashboard } from './components/student-dashboard'

export default async function StudentPage() {
  const session = await getSession()
  
  if (!session || session.role !== 'student') {
    redirect('/')
  }

  const studentData = await sql`
    SELECT s.*, c.name as coach_name, c.brand_name as coach_brand
    FROM students s
    JOIN coaches c ON s.coach_id = c.id
    WHERE s.id = ${session.id}
  `
  
  if (studentData.length === 0) {
    redirect('/')
  }

  const student = studentData[0]

  // Get today's workout
  const today = new Date().toISOString().split('T')[0]
  const todayWorkoutData = await sql`
    SELECT * FROM workouts 
    WHERE student_id = ${session.id} 
    AND scheduled_date = ${today}
    AND status = 'pending'
    LIMIT 1
  `

  // Get all workouts for the student (past workouts only, excluding future)
  const workoutsData = await sql`
    SELECT * FROM workouts 
    WHERE student_id = ${session.id}
    AND scheduled_date <= ${today}
    ORDER BY scheduled_date DESC
  `

  // Get workout logs
  const logsData = await sql`
    SELECT wl.*, w.title as workout_title
    FROM workout_logs wl
    JOIN workouts w ON wl.workout_id = w.id
    WHERE wl.student_id = ${session.id}
    ORDER BY wl.completed_at DESC
    LIMIT 20
  `

  return (
    <StudentDashboard 
      student={student}
      todayWorkout={todayWorkoutData[0] || null}
      workouts={workoutsData}
      recentLogs={logsData}
    />
  )
}
