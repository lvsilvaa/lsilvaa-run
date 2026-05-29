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
    />
  )
}