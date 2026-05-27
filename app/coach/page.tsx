import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { sql } from '@/lib/db'
import { CoachDashboard } from './components/coach-dashboard'

export default async function CoachPage() {
  const session = await getSession()

  if (!session || session.role !== 'coach') {
    redirect('/')
  }

  const coachData = await sql`
    SELECT * FROM coaches 
    WHERE id = ${session.id}
  `

  const coach = coachData[0]

  // impede coach não aprovado
  if (!coach.approved) {
    redirect('/pending-approval')
  }

  const studentsData = await sql`
    SELECT * 
    FROM students 
    WHERE coach_id = ${session.id} 
    ORDER BY name
  `

  const pendingCoaches = await sql`
    SELECT id, name, email, created_at
    FROM coaches
    WHERE approved = false
    ORDER BY created_at DESC
  `

  return (
    <CoachDashboard
      coach={coach}
      initialStudents={studentsData}
      pendingCoaches={pendingCoaches}
    />
  )
}
