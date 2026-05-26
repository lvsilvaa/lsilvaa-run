'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import useSWR from 'swr'
import Image from 'next/image'

import { Logo } from '@/components/logo'
import { Button } from '@/components/ui/button'

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

type CoachDashboardProps = {
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
}: CoachDashboardProps) {
  const router = useRouter()

  const [pendingList, setPendingList] =
    useState(pendingCoaches)

  const [coachAvatar, setCoachAvatar] =
    useState<string | null>(
      coach.profile_image_url
    )

  const [showAddStudent, setShowAddStudent] =
    useState(false)

  const [editingStudent, setEditingStudent] =
    useState<Student | null>(null)

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

  const isAdmin = coach.is_admin

  async function handleLogout() {
    await fetch('/api/auth/logout', {
      method: 'POST',
    })

    toast.success('Logout realizado com sucesso')

    router.push('/')
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
      </header>

      <main className="container py-12 relative pl-5">
        <div className="fixed inset-0 flex items-center justify-center pointer-events-none z-0">
          <Image
            src="/images/logo.png"
            alt=""
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

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {students.map((student) => (
              <Card
                key={student.id}
                className="
                  group
                  overflow-hidden
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
                <CardContent className="p-5">

                  {/* Layout: coluna no mobile, linha no desktop */}
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">

                    {/* Avatar + Info */}
                    <div className="flex items-center gap-4">
                      <div
                        className="
                          relative
                          h-16
                          w-16
                          shrink-0
                          overflow-hidden
                          rounded-full
                          border
                          border-white/10
                          bg-zinc-900
                          shadow-lg
                        "
                      >
                        {student.profile_image_url ? (
                          <Image
                            src={student.profile_image_url}
                            alt={student.name}
                            width={64}
                            height={64}
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
                              text-lg
                              font-bold
                              text-white
                            "
                          >
                            {getInitials(student.name)}
                          </div>
                        )}
                      </div>

                      <div className="min-w-0 space-y-1">
                        <h3 className="font-semibold text-white text-base leading-none truncate">
                          {student.name}
                        </h3>

                        <p className="text-sm text-zinc-400 truncate">
                          {student.email}
                        </p>

                        <div className="flex items-center gap-2 pt-1">
                          <Badge
                            variant="secondary"
                            className="
                              bg-green-500/10
                              text-green-400
                              border
                              border-green-500/20
                            "
                          >
                            Ativo
                          </Badge>
                        </div>
                      </div>
                    </div>

                    {/* Botões — lado no desktop, embaixo no mobile */}
                    <div className="flex sm:flex-col gap-2 sm:shrink-0">
                      <Button
                        onClick={() =>
                          router.push(`/coach/student/${student.id}`)
                        }
                        className="
                          flex-1
                          sm:flex-none
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
                          flex-1
                          sm:flex-none
                          border-white/10
                          bg-destructive
                          text-white
                          hover:bg-white/10
                        "
                      >
                        <Pencil className="mr-2 h-4 w-4" />
                        Editar
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
      />
    </div>
  )
}