import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { sql } from '@/lib/db'
import { CoachDashboard } from './components/coach-dashboard'

export default async function CoachPage() {
  const session = await getSession()

  // valida sessão primeiro
  if (!session || session.role !== 'coach') {
    redirect('/')
  }

  const completedWorkouts = await sql`
      SELECT
        wl.id,
        wl.student_id,
        wl.workout_id,
        wl.actual_distance_km,
        wl.actual_duration_minutes,
        wl.actual_pace_min_km,
        wl.notes,
        wl.completed_at,
        s.name AS student_name,
        w.title AS workout_title,
        w.workout_type
      FROM workout_logs wl
      JOIN students s ON s.id = wl.student_id
      LEFT JOIN workouts w ON w.id = wl.workout_id
      WHERE s.coach_id = ${session.id}
      ORDER BY wl.completed_at DESC
      LIMIT 10
    `
  // busca coach
  const coachData = await sql`
    SELECT *
    FROM coaches
    WHERE id = ${session.id}
    LIMIT 1
  `

  const coach = coachData[0]

  if (!coach) {
    redirect('/')
  }

  // coach não aprovado
  if (!coach.approved) {
    redirect('/pending-approval')
  }

  // admin
  const isAdmin = coach.is_admin === true

  // alunos
  const studentsData = await sql`
  SELECT *
  FROM students
  WHERE coach_id = ${session.id}
  AND is_active = true
  ORDER BY name
`

  // coaches pendentes
  const pendingCoaches = isAdmin
    ? await sql`
        SELECT
          id,
          name,
          email,
          phone,
          city,
          state,
          cpf,
          birth_date,
          created_at
        FROM coaches
        WHERE approved = false
        ORDER BY created_at DESC
      `
    : []

  // coaches cadastrados
  const registeredCoaches = isAdmin
    ? await sql`
        SELECT
          id,
          name,
          email,
          phone,
          city,
          state,
          approved,
          is_active,
          is_admin,
          created_at
        FROM coaches
        WHERE approved = true
        ORDER BY created_at DESC
      `
    : []

  return (
    <CoachDashboard
      coach={coach}
      initialStudents={studentsData}
      pendingCoaches={pendingCoaches}
      registeredCoaches={registeredCoaches}
      completedWorkouts={completedWorkouts}
    />
  )
}