'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import useSWR from 'swr'

import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
} from 'date-fns'

import { ptBR } from 'date-fns/locale'

import {
  ArrowLeft,
  Plus,
  Calendar,
  Edit,
  Trash2,
  Timer,
  Route,
  TrendingUp,
  LogOut,
  Send,
} from 'lucide-react'

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

import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs'

import { CreateWorkoutDialog } from './create-workout-dialog'
import { EditWorkoutDialog } from './edit-workout-dialog'
import { StudentMetrics } from './student-metrics'
import { WorkoutShareCard } from '@/components/workout-share-card'

import { toast } from 'sonner'

import type {
  Student,
  Workout,
  WorkoutLog,
} from '@/lib/db'

const fetcher = (url: string) =>
  fetch(url).then((res) => res.json())

type StudentDetailProps = {
  student: Student
  workouts: Workout[]
  workoutLogs: (WorkoutLog & {
    workout_title: string
    workout_type: string
  })[]
}

export function StudentDetail({
  student,
  workouts: initialWorkouts,
  workoutLogs: initialLogs,
}: StudentDetailProps) {
  const router = useRouter()

  const [showCreateWorkout, setShowCreateWorkout] =
    useState(false)

  const [editingWorkout, setEditingWorkout] =
    useState<Workout | null>(null)
    const [selectedWorkoutId, setSelectedWorkoutId] =
  useState<number | null>(null)

  const { data: workoutsData, mutate: mutateWorkouts } =
    useSWR<{ workouts: Workout[] }>(
      `/api/students/${student.id}/workouts`,
      fetcher,
      {
        fallbackData: {
          workouts: initialWorkouts,
        },
      }
    )

  const { data: logsData } = useSWR<{
    logs: (WorkoutLog & {
      workout_title: string
      workout_type: string
    })[]
  }>(
    `/api/students/${student.id}/logs`,
    fetcher,
    {
      fallbackData: {
        logs: initialLogs,
      },
    }
  )

  const workouts = workoutsData?.workouts || []
  const logs = logsData?.logs || []

  async function handleLogout() {
    await fetch('/api/auth/logout', {
      method: 'POST',
    })

    router.push('/')
  }

  async function handleCopyWorkout(workout: Workout) {
    try {
      const text = buildWorkoutText(workout)

      await navigator.clipboard.writeText(text)

      toast.success('Treino copiado!')
    } catch {
      toast.error('Erro ao copiar treino')
    }
  }

  function buildWorkoutText(workout: Workout) {
    let text = `🏃 ${workout.title}\n\n`

    text += `📅 ${format(
      new Date(workout.scheduled_date),
      'dd/MM/yyyy'
    )}\n\n`

    if (workout.description) {
      text += `${workout.description}\n\n`
    }

    if (workout.target_distance_km) {
      text += `📏 Distância: ${workout.target_distance_km}km\n`
    }

    if (workout.target_duration_minutes) {
      text += `⏱ Tempo: ${workout.target_duration_minutes}min\n`
    }

    if (workout.target_pace_min_km) {
      text += `⚡ Pace: ${formatPace(
        Number(workout.target_pace_min_km)
      )}\n`
    }

    if (
      workout.steps &&
      Array.isArray(workout.steps)
    ) {
      text += `\n📋 Estrutura:\n`

      workout.steps.forEach(
        (step: any, index: number) => {
          text += `\n${index + 1}. ${step.type}`

          if (step.duration_value) {
            text += ` - ${step.duration_value}`
          }

          if (step.duration_type) {
            text += ` ${step.duration_type}`
          }

          if (step.target_from) {
            text += ` @ ${step.target_from}`
          }
        }
      )
    }

    return text
  }

  async function handleDeleteWorkout(workoutId: number) {
    if (
      !confirm(
        'Tem certeza que deseja excluir este treino?'
      )
    ) {
      return
    }

    try {
      const res = await fetch(
        `/api/workouts/${workoutId}`,
        {
          method: 'DELETE',
        }
      )

      if (!res.ok) {
        throw new Error(
          'Erro ao excluir treino'
        )
      }

      toast.success('Treino excluído')

      mutateWorkouts()
    } catch {
      toast.error('Erro ao excluir treino')
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

  function formatPace(pace: number | null) {
    if (!pace) return '-'

    const min = Math.floor(pace)
    const sec = Math.round((pace % 1) * 60)

    return `${min}'${sec
      .toString()
      .padStart(2, '0')}"/km`
  }

  function getWorkoutTypeLabel(type: string) {
    const labels: Record<string, string> = {
      easy: 'Leve',
      tempo: 'Tempo',
      interval: 'Intervalado',
      long: 'Longão',
      recovery: 'Recuperação',
      race: 'Prova',
      fartlek: 'Fartlek',
    }

    return labels[type] || type
  }

  function getWorkoutStatusColor(status: string) {
    switch (status) {
      case 'completed':
        return 'bg-green-500/10 text-green-600 border-green-500/20'

      case 'skipped':
        return 'bg-red-500/10 text-red-600 border-red-500/20'

      default:
        return 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20'
    }
  }

  const today = new Date()

  const weekStart = startOfWeek(today, {
    weekStartsOn: 1,
  })

  const weekEnd = endOfWeek(today, {
    weekStartsOn: 1,
  })

  const monthStart = startOfMonth(today)
  const monthEnd = endOfMonth(today)

  const weekLogs = logs.filter((l) => {
    const date = new Date(l.completed_at)

    return date >= weekStart && date <= weekEnd
  })

  const monthLogs = logs.filter((l) => {
    const date = new Date(l.completed_at)

    return date >= monthStart && date <= monthEnd
  })

  const weeklyKm = weekLogs.reduce(
    (acc, l) =>
      acc + (Number(l.actual_distance_km) || 0),
    0
  )

  const monthlyKm = monthLogs.reduce(
    (acc, l) =>
      acc + (Number(l.actual_distance_km) || 0),
    0
  )

  const totalWorkouts = logs.length

  const sortedWorkouts = [...workouts].sort(
    (a, b) => {
      const aFinished =
        a.status === 'completed' ||
        a.status === 'skipped'

      const bFinished =
        b.status === 'completed' ||
        b.status === 'skipped'

      if (aFinished && !bFinished) return 1
      if (!aFinished && bFinished) return -1

      return (
        new Date(a.scheduled_date).getTime() -
        new Date(b.scheduled_date).getTime()
      )
    }
  )

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#000428] to-[#2c3e50]">
      <header className="sticky top-5 z-50 border-b backdrop-blur">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              className="text-white"
              onClick={() => router.push('/coach')}
            >
              <ArrowLeft className="mr-2 h-4 w-4 text-white" />
              Voltar
            </Button>

            <div className="flex items-center">
              <Logo size="sm" className="px-8" />

              <Logo
                size="sm"
                className="-ml-8 opacity-20 scale-95"
              />

              <Logo
                size="sm"
                className="-ml-8 opacity-10 scale-90 px-8"
              />
            </div>
          </div>

          <Button
            variant="ghost"
            size="sm"
            className="text-white"
            onClick={handleLogout}
          >
            <LogOut className="mr-2 h-4 w-4 text-white" />
            Sair
          </Button>
        </div>
      </header>

      <main className="container p-4 md:p-8 my-5">
        <div className="fixed inset-0 flex items-center justify-center pointer-events-none z-0">
          <img
            src="/images/logo.png"
            alt=""
            className="w-120 h-auto opacity-30"
          />
        </div>

        <Card className="mb-8">
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row gap-6">
              <Avatar className="h-20 w-20 border-4 border-accent/20">
                <AvatarImage
                  src={student.avatar_url || ''}
                  alt={student.name}
                />

                <AvatarFallback className="text-xl bg-accent text-accent-foreground">
                  {getInitials(student.name)}
                </AvatarFallback>
              </Avatar>

              <div className="flex-1 space-y-2">
                <h1 className="text-2xl font-bold">
                  {student.name}
                </h1>

                <p className="text-muted-foreground">
                  {student.email}
                </p>

                <div className="flex flex-wrap gap-2">
                  {student.base_pace_min_km && (
                    <Badge
                      variant="outline"
                      className="flex items-center gap-1"
                    >
                      <Timer className="h-3 w-3" />
                      Pace base:{' '}
                      {formatPace(
                        Number(student.base_pace_min_km)
                      )}
                    </Badge>
                  )}

                  {student.weight_kg && (
                    <Badge variant="outline">
                      {student.weight_kg} kg
                    </Badge>
                  )}

                  {student.height_cm && (
                    <Badge variant="outline">
                      {student.height_cm} cm
                    </Badge>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4 text-center">
                <div className="space-y-1">
                  <p className="text-2xl font-bold text-accent">
                    {weeklyKm.toFixed(1)}
                  </p>

                  <p className="text-xs text-muted-foreground">
                    km/semana
                  </p>
                </div>

                <div className="space-y-1">
                  <p className="text-2xl font-bold text-accent">
                    {monthlyKm.toFixed(1)}
                  </p>

                  <p className="text-xs text-muted-foreground">
                    km/mês
                  </p>
                </div>

                <div className="space-y-1">
                  <p className="text-2xl font-bold text-accent">
                    {totalWorkouts}
                  </p>

                  <p className="text-xs text-muted-foreground">
                    treinos
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Tabs
          defaultValue="workouts"
          className="space-y-6"
        >
          <TabsList className=" bg-accent/40 text-black grid w-full grid-cols-2">
            <TabsTrigger value="workouts">
              <Calendar className="h-4 w-6 mr-2" />
              Treinos
            </TabsTrigger>

            <TabsTrigger value="history">
              <Route className="h-4 w-6 mr-2" />
              Histórico
            </TabsTrigger>
          </TabsList>

          <TabsContent
            value="workouts"
            className="space-y-4"
          >
            <div className="flex justify-between items-center">
              <h2 className="text-lg text-white font-semibold">
                Treinos Programados
              </h2>

              <Button
                onClick={() =>
                  setShowCreateWorkout(true)
                }
              >
                <Plus className="mr-2 h-4 w-4" />
                Novo Treino
              </Button>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 2xl:grid-cols-3 gap-4">
              {sortedWorkouts.map((workout, index) => (
              <Card
  key={workout.id}
  onClick={() =>
    setSelectedWorkoutId((current) =>
      current === workout.id
        ? null
        : workout.id
    )
  }
  className={`
    h-full
    cursor-pointer
    overflow-hidden
    border-white/10
    bg-white
    backdrop-blur-md
    transition-all
    hover:scale-[1.01]
    hover:border-accent/30
    ${
      selectedWorkoutId === workout.id
        ? 'border-accent shadow-lg shadow-accent/20'
        : ''
    }
    ${
      index === 0 &&
      workout.status === 'pending'
        ? 'border-accent shadow-lg shadow-accent/10'
        : ''
    }
  `}
>
  <CardContent className="p-4">
    <div className="flex flex-col gap-4 h-full">

      {/* CONTEÚDO */}
      <div className="flex-1 flex flex-col justify-center text-center items-center">

        <div className="w-full">

          {/* HEADER */}
          <div className="flex flex-wrap items-center justify-center gap-2 mb-2">

            <h3 className="text-lg font-bold break-words text-black">
              {workout.title}
            </h3>

            <Badge
              variant="outline"
              className={getWorkoutStatusColor(
                workout.status
              )}
            >
              {workout.status === 'completed'
                ? 'Concluído'
                : workout.status === 'skipped'
                ? 'Pulado'
                : 'Pendente'}
            </Badge>
          </div>

          {/* DATA */}
          <p className="text-xs text-muted-foreground mb-3">
            {format(
              new Date(
                workout.scheduled_date
              ),
              "EEEE, d 'de' MMMM",
              {
                locale: ptBR,
              }
            )}
          </p>

          {/* BADGES */}
          <div className="flex flex-wrap justify-center gap-2 mb-4">

            <Badge variant="secondary">
              {getWorkoutTypeLabel(
                workout.workout_type
              )}
            </Badge>

            {workout.target_distance_km && (
              <Badge variant="outline">
                {
                  workout.target_distance_km
                } km
              </Badge>
            )}

            {workout.target_pace_min_km && (
              <Badge variant="outline">
                {formatPace(
                  Number(
                    workout.target_pace_min_km
                  )
                )}
              </Badge>
            )}
          </div>

          {/* DESCRIÇÃO */}
          {workout.description && (
            <div className="flex justify-center">
              <p
                className="
                  text-center
                  text-base
                  md:text-lg
                  font-semibold
                  leading-relaxed
                  text-black
                  max-w-[90%]
                "
              >
                {workout.description}
              </p>
            </div>
          )}
        </div>

        {/* BOTÕES */}
        <div className="flex flex-wrap justify-center gap-2 mt-4">

          <Button
            variant="ghost"
            size="icon"
            onClick={(e) => {
              e.stopPropagation()
              setEditingWorkout(workout)
            }}
          >
            <Edit className="h-4 w-4" />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            onClick={(e) => {
              e.stopPropagation()
              handleDeleteWorkout(
                workout.id
              )
            }}
          >
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={(e) => {
              e.stopPropagation()
              handleCopyWorkout(
                workout
              )
            }}
          >
            <Send className="mr-2 h-4 w-4" />
            Copiar
          </Button>
        </div>
      </div>

      {/* BANNER */}
      {selectedWorkoutId ===
        workout.id && (
        <div
          className="
            w-full
            flex
            justify-center
            overflow-hidden
            pt-3
            animate-in
            fade-in-0
            zoom-in-95
          "
          onClick={(e) =>
            e.stopPropagation()
          }
        >
          <div
            className="
              w-full
              max-w-[280px]
              scale-[0.88]
              origin-top
            "
          >
            <WorkoutShareCard
              workout={workout}
              athleteName={
                student.name
              }
            />
          </div>
        </div>
      )}
    </div>
  </CardContent>
</Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="history">
            <StudentMetrics
              logs={logs}
              student={student}
            />
          </TabsContent>
        </Tabs>
      </main>

      <CreateWorkoutDialog
        open={showCreateWorkout}
        onOpenChange={setShowCreateWorkout}
        studentId={student.id}
        student={student}
        onSuccess={() => mutateWorkouts()}
      />

      {editingWorkout && (
        <EditWorkoutDialog
          open={!!editingWorkout}
          onOpenChange={(open) =>
            !open && setEditingWorkout(null)
          }
          workout={editingWorkout}
          onSuccess={() => {
            mutateWorkouts()
            setEditingWorkout(null)
          }}
        />
      )}
    </div>
  )
}