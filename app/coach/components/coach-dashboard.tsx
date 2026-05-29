'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import useSWR from 'swr'
import Image from 'next/image'

import { Logo } from '@/components/logo'
import { Button } from '@/components/ui/button'
import {X, UserX, UserCheck} from 'lucide-react'

import {
  Card,
  CardContent,
} from '@/components/ui/card'

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from '@/components/ui/avatar'

import { Badge } from '@/components/ui/badge'

import { AddStudentDialog } from './add-student-dialog'
import { AvatarUpload } from '@/components/avatar-upload'

import {
  LogOut,
  Users,
  Plus,
  ChevronRight,
  Pencil,
} from 'lucide-react'

import { toast } from 'sonner'

import type { Coach, Student } from '@/lib/db'

const fetcher = async (url: string) => {
  const res = await fetch(url)

  if (!res.ok) {
    throw new Error('Erro ao carregar dados')
  }

  return res.json()
}

type CoachDashboardProps =  {
  registeredCoaches: {
  id: number
  name: string
  email: string
  phone?: string | null
  city?: string | null
  state?: string | null
  approved: boolean
  is_active: boolean
  is_admin: boolean
  created_at: string
}[]
  coach: Coach
  initialStudents: Student[]
  pendingCoaches: {
    id: number
    name: string
    email: string
    created_at: string
  }[]
}

export function CoachDashboard({
  coach,
  initialStudents,
  pendingCoaches,
  registeredCoaches,
}: CoachDashboardProps) {

  
  const router = useRouter()
  const [studentTab, setStudentTab] = useState<'active' | 'inactive'>('active')
  const [pendingList, setPendingList] =
    useState(pendingCoaches)

  const [coachAvatar, setCoachAvatar] =
    useState<string | null>(
      coach.avatar_url
    )

  const [showAddStudent, setShowAddStudent] =
    useState(false)

  const [editingStudent, setEditingStudent] =
    useState<Student | null>(null)

    const [showCoachesList, setShowCoachesList] = useState(false)

const [coachesList, setCoachesList] =
  useState(registeredCoaches)

  const { data: studentsData, mutate } =
    useSWR<{ students: Student[] }>(
      '/api/students',
      fetcher,
      {
        fallbackData: {
          students: initialStudents,
        },
      }
    )

  const students = studentsData?.students || []
 const activeStudents = students.filter((student) => student.is_active !== false)
const inactiveStudents = students.filter((student) => student.is_active === false)

const filteredStudents =
  studentTab === 'active' ? activeStudents : inactiveStudents

  const isAdmin = coach.is_admin

  async function handleLogout() {
    await fetch('/api/auth/logout', {
      method: 'POST',
    })

    toast.success('Logout realizado com sucesso')

    router.push('/')
  }
  async function handleApproveCoach(coachId: number) {
  try {
    const res = await fetch(`/api/coaches/${coachId}/approve`, {
      method: 'PATCH',
    })

    if (!res.ok) throw new Error()

    toast.success('Coach aprovado com sucesso')

    setPendingList((current) =>
      current.filter((coach) => coach.id !== coachId)
    )
  } catch {
    toast.error('Erro ao aprovar coach')
  }
}

async function handleRejectCoach(coachId: number) {
  if (!confirm('Deseja rejeitar este cadastro?')) return

  try {
    const res = await fetch(`/api/coaches/${coachId}/reject`, {
      method: 'DELETE',
    })

    if (!res.ok) throw new Error()

    toast.success('Coach rejeitado')

    setPendingList((current) =>
      current.filter((coach) => coach.id !== coachId)
    )
  } catch {
    toast.error('Erro ao rejeitar coach')
  }
}

async function handleToggleCoachStatus(targetCoach: {
  id: number
  is_active: boolean
}) {
  try {
    const res = await fetch(`/api/coaches/${targetCoach.id}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        is_active: !targetCoach.is_active,
      }),
    })

    const data = await res.json()

    if (!res.ok) {
      throw new Error(data.error || 'Erro ao alterar status')
    }

    toast.success(
      targetCoach.is_active
        ? 'Coach inativado'
        : 'Coach ativado'
    )

    setCoachesList((current) =>
      current.map((item) =>
        item.id === targetCoach.id
          ? {
              ...item,
              is_active: !targetCoach.is_active,
            }
          : item
      )
    )
  } catch (error) {
    toast.error(
      error instanceof Error
        ? error.message
        : 'Erro ao alterar status'
    )
  }
}
  async function handleToggleStudentStatus(student: Student) {
  if (!student?.id) {
    toast.error('ID do aluno não encontrado')
    return
  }

  try {
    const nextStatus = student.is_active === false

    const res = await fetch(`/api/students/${student.id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        is_active: nextStatus,
      }),
    })

    if (!res.ok) {
      throw new Error()
    }

    toast.success(
      nextStatus
        ? 'Aluno ativado com sucesso'
        : 'Aluno inativado com sucesso'
    )

    mutate()
  } catch {
    toast.error('Erro ao alterar status do aluno')
  }
}

async function handleDeleteStudent(studentId: number) {
  if (!confirm('Tem certeza que deseja excluir este aluno? Essa ação não pode ser desfeita.')) {
    return
  }

  try {
    const res = await fetch(`/api/students/${studentId}`, {
      method: 'DELETE',
    })

    if (!res.ok) throw new Error()

    toast.success('Aluno excluído com sucesso')
    mutate()
  } catch {
    toast.error('Erro ao excluir aluno')
  }
}

  function getInitials(name: string) {
    return name
      .split(' ')
      .map((n) => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase()
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#000428] to-[#2c3e50]">
      <header className="sticky top-5 z-50 border-b">
        
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center">
            <Logo size="sm" className="px-8" />
            <Logo size="sm" className="-ml-8 opacity-20 scale-95" />
            <Logo size="sm" className="-ml-8 opacity-10 scale-90 px-8" />
          </div>
      <div className='flex justify-between space-x-4'>
          {isAdmin && (
              <Button
                variant="ghost"
                size="sm"
                className="text-accent/40 hover:text-black"
                onClick={() => setShowCoachesList((current) => !current)}
              >
                Coaches cadastrados
              </Button>
            )}

          <Button
            variant="ghost"
            size="sm"
            onClick={handleLogout}
            className="text-secondary-foreground"
          >
            <LogOut className="mr-2 h-4 w-4" />
            Sair
          </Button>
          </div>
        </div>
      </header>

      <main className="container py-12 relative px-3">
        <div className="fixed inset-0 flex items-center justify-center pointer-events-none z-0">
          <Image
            src="/images/logo.png"
            alt="Logo"
             loading="eager"
             priority
            width={500}
            height={500}
            className="w-120 h-auto opacity-10"
          />
        </div>

        {/* Perfil coach */}
        <Card className="mb-8 relative z-10">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center sm:flex-row gap-6">
              {isAdmin ? (
                <Avatar className="h-24 w-24">
                  <AvatarImage
                    src="/images/profile.png"
                    alt={coach.name}
                  />
                  <AvatarFallback>
                    {getInitials(coach.name)}
                  </AvatarFallback>
                </Avatar>
              ) : (
                <AvatarUpload
                  currentUrl={coachAvatar}
                  fallback={getInitials(coach.name)}
                  onUploadSuccess={(url) => {
                    setCoachAvatar(url)
                    mutate()
                  }}
                  size="lg"
                />
              )}

              <div>
                <h1 className="text-2xl font-bold">
                  {coach.brand_name?.trim() || 'Lsilva Run'}
                </h1>

                <p className="text-muted-foreground">
                  {coach.name}
                </p>

                <Badge className="mt-2">
                  <Users className="h-3 w-3 mr-1" />
                  {students.length} alunos
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
        {isAdmin && pendingList.length > 0 && (
  <div className="space-y-4 relative z-10 mb-8">
    <h2 className="text-xl font-semibold text-white">
      Coaches pendentes
    </h2>

    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {pendingList.map((coach) => (
        <Card
          key={coach.id}
          className="border-yellow-500/20 bg-yellow-500/5 backdrop-blur-md"
        >
          <CardContent className="p-5 space-y-3">
            <div>
              <h3 className="font-semibold text-white">
                {coach.name}
              </h3>

              <p className="text-sm text-zinc-400">
                {coach.email}
              </p>

              <p className="text-sm text-zinc-400">
                {coach.phone || '-'}
              </p>

              <p className="text-sm text-zinc-400">
                {coach.city || '-'} / {coach.state || '-'}
              </p>
            </div>

            <div className="flex gap-2">
              <Button
                className="flex-1 bg-green-500 text-black hover:bg-green-400"
                onClick={() => handleApproveCoach(coach.id)}
              >
                Aprovar
              </Button>

              <Button
                variant="destructive"
                className="flex-1"
                onClick={() => handleRejectCoach(coach.id)}
              >
                Rejeitar
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  </div>
)}

{isAdmin && showCoachesList && (
  <div className="space-y-4 relative z-10 mb-8">
    <h2 className="text-xl font-semibold text-white">
      Coaches cadastrados
    </h2>

    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
      {coachesList.map((item) => (
        <Card
          key={item.id}
          className="border-white/10 bg-white/5 backdrop-blur-md"
        >
          <CardContent className="p-5 space-y-4">
            <div>
              <h3 className="font-semibold text-white">
                {item.name}
              </h3>

              <p className="text-sm text-zinc-400">
                {item.email}
              </p>

              <p className="text-sm text-zinc-400">
                {item.phone || '-'}
              </p>

              <p className="text-sm text-zinc-400">
                {item.city || '-'} / {item.state || '-'}
              </p>

              <Badge
                className={
                  item.is_active
                    ? 'mt-3 bg-green-500/10 text-green-400 border border-green-500/20'
                    : 'mt-3 bg-red-500/10 text-red-400 border border-red-500/20'
                }
              >
                {item.is_active ? 'Ativo' : 'Inativo'}
              </Badge>

              {item.is_admin && (
                <Badge className="mt-3 ml-2">
                  Admin
                </Badge>
              )}
            </div>

            {!item.is_admin && (
              <Button
                variant="outline"
                className={
                  item.is_active
                    ? 'w-full border-red-500/20 bg-red-500/10 text-red-400 hover:bg-red-500/20'
                    : 'w-full border-green-500/20 bg-green-500/10 text-green-400 hover:bg-green-500/20'
                }
                onClick={() => handleToggleCoachStatus(item)}
              >
                {item.is_active ? 'Inativar coach' : 'Ativar coach'}
              </Button>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  </div>
)}

        {/* Alunos */}
        <div className="space-y-4 relative z-10">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-secondary-foreground">
              Meus Alunos
            </h2>

            <Button
              onClick={() => {
                setEditingStudent(null)
                setShowAddStudent(true)
              }}
            >
              <Plus className="mr-2 h-4 w-4" />
              Cadastrar Aluno
            </Button>
          </div>
              <div className="flex gap-2">
                <Button
                  variant={studentTab === 'active' ? 'default' : 'outline'}
                  onClick={() => setStudentTab('active')}
                >
                  Ativos ({activeStudents.length})
                </Button>

                <Button
                  variant={studentTab === 'inactive' ? 'default' : 'outline'}
                  onClick={() => setStudentTab('inactive')}
                >
                  Inativos ({inactiveStudents.length})
                </Button>
              </div>
                        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {filteredStudents.map((student) => ( 
              <Card
                  key={student.id}
                  className="
                    relative
                    overflow-visible
                    border-white/10
                    bg-white/5
                    backdrop-blur-md
                    transition-all
                    duration-300
                    hover:border-green-500/30
                    hover:bg-white/[0.08]
                    hover:shadow-[0_0_30px_rgba(34,197,94,0.15)]
                  "
                >
               <button
                  type="button"
                  onClick={() =>
                    handleDeleteStudent(student.id)
                  }
                  className="
                    absolute
                    -right-2
                    -top-2
                    z-30

                    flex
                    h-8
                    w-8
                    items-center
                    justify-center

                    rounded-full

                    border
                    border-red-400/30

                    bg-red-500
                    text-white

                    shadow-lg
                    shadow-red-500/30

                    transition-all
                    duration-200

                    hover:scale-110
                    hover:bg-red-600
                  "
                >
                  <X className="h-4 w-4" />
                </button>
               <CardContent className="p-5">
  <div className="flex flex-col items-center text-center gap-4 sm:flex-row sm:text-left sm:items-center sm:justify-between">

    {/* Avatar + Info */}
    <div className="flex flex-col items-center text-center gap-2 min-w-0 sm:flex-row sm:text-left">

      <div
        className="
          relative
          h-20
          w-20
          shrink-0
          overflow-hidden
          rounded-full
          border
          border-white/10
          bg-zinc-900
          shadow-lg
          sm:h-16
          sm:w-16
        "
      >
        {student.avatar_url ? (
          <Image
            src={student.avatar_url}
            alt={student.name}
            width={80}
            height={80}
            className="h-full w-full object-cover"
          />
        ) : (
          <div
            className="
              flex
              h-full
              w-full
              items-center
              justify-center
              bg-gradient-to-br
              from-green-500
              to-emerald-700
              text-xl
              font-bold
              text-white
            "
          >
            {getInitials(student.name)}
          </div>
        )}
      </div>

      <div className="min-w-0 w-full">
        <h3 className="font-semibold text-white text-lg leading-tight break-words">
          {student.name}
        </h3>

        <p className="text-xs text-zinc-400 break-all">
          {student.email}
        </p>

        <div className="flex items-center justify-center sm:justify-start gap-2 pt-2">
          <Badge
            variant="secondary"
            className="
              bg-green-500/10
              text-green-400
              border
              border-green-500/20
            "
          >
            {student.is_active === false ? 'Inativo' : 'Ativo'}
          </Badge>
        </div>
      </div>
    </div>

    {/* Botões */}
    <div className="grid grid-cols-1 gap-2 w-full sm:w-auto sm:min-w-[140px]">
      <Button
        onClick={() =>
          router.push(`/coach/student/${student.id}`)
        }
        className="
          w-3/4
          bg-green-500
          text-black
          hover:bg-green-400
          font-semibold
        "
      >
        Ver aluno
        <ChevronRight className="ml-2 h-4 w-4" />
      </Button>

      <Button
        variant="outline"
        onClick={() => {
          setEditingStudent(student)
          setShowAddStudent(true)
        }}
        className="
          w-3/4
          border-white/10
          bg-destructive
          text-white
          hover:bg-white/10
        "
      >
        <Pencil className="mr-2 h-4 w-4" />
        Editar
      </Button>
       <Button
            variant="outline"
           onClick={() =>
            handleToggleStudentStatus(student)
            }
            className={`
             w-3/4
              ${
                student.is_active
                  ? 'border-yellow-500/20 bg-yellow-500/10 text-yellow-400 hover:bg-yellow-500/20'
                  : 'border-green-500/20 bg-green-500/10 text-green-400 hover:bg-green-500/20'
              }
            `}
          >
            {student.is_active
              ? 'Inativar'
              : 'Ativar'}
          </Button>
    </div>
  </div>
</CardContent>
              </Card>
            ))}
          </div>
        </div>
      </main>

     <AddStudentDialog
        open={showAddStudent}
        onOpenChange={(open) => {
          setShowAddStudent(open)

          if (!open) {
            setEditingStudent(null)
          }
        }}
        onSuccess={() => mutate()}
        student={editingStudent}
        coachId={coach.id}
      />
    </div>
  )
}