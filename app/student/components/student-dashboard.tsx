'use client'

import { WorkoutStepsDisplay } from './workout-steps-display'
import { WeeklyVolumeCard } from './weekly-volume-card'
import { formatDistance } from '@/lib/format-distance'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { StudentProfileDialog } from './student-profile-dialog'
import { PersonalRecordsCard } from './personal-records-card'
import useSWR from 'swr'
import {
  format,
  isToday,
  isPast,
} from 'date-fns'

import { ptBR } from 'date-fns/locale'

import Image from 'next/image'

import { Logo } from '@/components/logo'
import { Button } from '@/components/ui/button'

import {
  Card,
  CardContent,
  CardDescription,
  CardTitle,
} from '@/components/ui/card'

import { Badge } from '@/components/ui/badge'

import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs'

import { LogWorkoutDialog } from './log-workout-dialog'
import { MotivationalQuote } from './motivational-quote'
import { StravaIntegration } from './strava-integration'

import {
  LogOut,
  Calendar,
  History,
  Play,
  CheckCircle,
  Timer,
  Route,
  Activity,
  User,
  Trash2,
  ImportIcon,
  Camera,
  Settings,
} from 'lucide-react'

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

import { toast } from 'sonner'

import type {
  Student,
  Workout,
  WorkoutLog,
} from '@/lib/db'

const fetcher = (url: string) =>
  fetch(url).then((res) => res.json())

type StudentWithCoach = Student & {
  coach_name: string
  coach_brand: string
}

type StudentDashboardProps = {
  student: StudentWithCoach
  todayWorkout: Workout | null
  workouts: Workout[]
  recentLogs: (WorkoutLog & {
    workout_title: string
  })[]
}

export function StudentDashboard({
  student,
  todayWorkout: initialTodayWorkout,
  workouts: initialWorkouts,
  recentLogs: initialLogs,
}: StudentDashboardProps) {
  const router = useRouter()

  const [selectedWorkout, setSelectedWorkout] =
    useState<Workout | null>(null)

  const [showLogDialog, setShowLogDialog] =
    useState(false)

  const [uploading, setUploading] =
    useState(false)

    const [studentProfile, setStudentProfile] = useState(student)

    const [showProfileDialog, setShowProfileDialog] = useState(false)

    const [showProfilePage, setShowProfilePage] = useState(false)

  const [avatar, setAvatar] =
    useState<string | null>(student.avatar_url || null)

    

  const [stravaImportData, setStravaImportData] =
    useState<{
      distance_km: number
      duration_minutes: number
      pace_min_km: number
      calories: number
      elevation_gain_m: number
      strava_id: string
    } | null>(null)

  const {
    data: workoutsData,
    mutate: mutateWorkouts,
  } = useSWR<{ workouts: Workout[] }>(
    '/api/student/workouts',
    fetcher,
    {
      fallbackData: {
        workouts: initialWorkouts,
      },
    }
  )

  const {
    data: logsData,
    mutate: mutateLogs,
  } = useSWR<{
    logs: (WorkoutLog & {
      workout_title: string
    })[]
  }>('/api/student/logs', fetcher, {
    fallbackData: {
      logs: initialLogs,
    },
  })

  const workouts =
    workoutsData?.workouts?.length
      ? workoutsData.workouts
      : initialWorkouts

 const logs =
  logsData?.logs?.length
    ? logsData.logs
    : initialLogs

  // treino de hoje
  const todayWorkout = workouts.find((w) => {
    const workoutDate = new Date(
      w.scheduled_date
    )

    return isToday(workoutDate)
  })

  // treinos passados pendentes
  const pastWorkouts = workouts.filter(
    (w) => {
      const workoutDate = new Date(
        w.scheduled_date
      )

      return (
        isPast(workoutDate) &&
        !isToday(workoutDate) &&
        w.status === 'pending'
      )
    }
  )

  const todayWorkoutCompleted =
    todayWorkout?.status === 'completed'

  async function handleLogout() {
    await fetch('/api/auth/logout', {
      method: 'POST',
    })

    toast.success(
      'Logout realizado com sucesso'
    )

    router.push('/')
  }

  async function handleDeleteLog(
    logId: number
  ) {
    if (
      !confirm(
        'Excluir esta atividade do histórico?'
      )
    )
      return

    try {
      const res = await fetch(
        `/api/student/logs/${logId}`,
        {
          method: 'DELETE',
        }
      )

      if (!res.ok) {
        throw new Error()
      }

      toast.success('Atividade removida')

      mutateLogs()
    } catch {
      toast.error(
        'Erro ao remover atividade'
      )
    }
  }

 async function handleAvatarUpload(
  e: React.ChangeEvent<HTMLInputElement>
) {
  const file = e.target.files?.[0]

  if (!file) return

  try {
    setUploading(true)

    const formData = new FormData()

    formData.append('file', file)

    // upload da imagem
    const uploadRes = await fetch(
      '/api/upload/avatar',
      {
        method: 'POST',
        body: formData,
      }
    )

    const uploadData = await uploadRes.json()

    console.log('UPLOAD DATA:', uploadData)

    if (!uploadRes.ok) {
      throw new Error(
        uploadData.error ||
          'Erro ao enviar avatar'
      )
    }

    if (!uploadData.url) {
      throw new Error(
        'URL da imagem não retornada'
      )
    }

    const avatarUrl = uploadData.url

    // salvar no banco
    const saveRes = await fetch(
      `/api/students/${student.id}`,
      {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          avatar_url: avatarUrl,
        }),
      }
    )

    const saveData = await saveRes.json()

    console.log('SAVE DATA:', saveData)

    if (!saveRes.ok) {
      throw new Error(
        saveData.error ||
          'Erro ao salvar avatar'
      )
    }

    // atualizar tela
    setAvatar(`${avatarUrl}?t=${Date.now()}`)

    toast.success(
      'Avatar atualizado!'
    )
  } catch (error) {
    console.error(error)

    toast.error(
      error instanceof Error
        ? error.message
        : 'Erro ao enviar foto'
    )
  } finally {
    setUploading(false)
  }
}

  function formatPace(
    pace: number | null
  ) {
    if (!pace) return '-'

    const min = Math.floor(pace)

    const sec = Math.round(
      (pace % 1) * 60
    )

    return `${min}'${sec
      .toString()
      .padStart(2, '0')}"/km`
  }

  function getWorkoutTypeLabel(
    type: string
  ) {
    const labels: Record<
      string,
      string
    > = {
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

  function handleStartWorkout(
    workout: Workout
  ) {
    setSelectedWorkout(workout)
    setShowLogDialog(true)
  }

async function handleStravaImport(activity: {
  id: string
  name: string
  start_date: string
  distance_km: number
  duration_minutes: number
  pace_min_km: number
  calories: number
  elevation_gain_m: number
}) {
  try {
    const res = await fetch('/api/student/log-strava', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        strava_id: activity.id,
        name: activity.name,
        start_date: activity.start_date,
        distance_km: activity.distance_km,
        duration_minutes: activity.duration_minutes,
        pace_min_km: activity.pace_min_km,
        calories: activity.calories,
        elevation_gain_m: activity.elevation_gain_m,
      }),
    })

    if (!res.ok) {
      throw new Error()
    }

    toast.success(
      'Atividade salva no histórico!'
    )

    await mutateLogs()

  } catch {
    toast.error(
      'Erro ao salvar atividade'
    )
  }
}

  async function handleLogSuccess() {
    await mutateWorkouts()
    await mutateLogs()

    setShowLogDialog(false)

    setSelectedWorkout(null)

    setStravaImportData(null)
  }

    const totalFinishedActivities = logs.length

    const totalKm = logs.reduce(
      (acc, log) =>
        acc + (Number(log.actual_distance_km) || 0),
      0
    )

 return (
  <div className="min-h-screen bg-gradient-to-br from-[#000428] to-[#2c3e50] ">

    {/* HEADER */}
    <header className="sticky top-5 z-50 border-b border-white/10 backdrop-blur-xl ">
      <div className="container flex h-16 items-center justify-between ">

        <div className="flex items-center">
          <Logo
            size="sm"
            className="px-8"
          />

          <Logo
            size="sm"
            className="-ml-8 opacity-20 scale-95"
          />

          <Logo
            size="sm"
            className="-ml-8 opacity-10 scale-90 px-8"
          />
        </div>

        <div className="flex items-center gap-4">

          <span className="hidden sm:block text-sm text-zinc-300">
            Treinado por{' '}
            <span className="font-semibold text-white">
              {student.coach_name}
            </span>
          </span>
         <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="text-accent  "
              >
                <User className="mr-2 h-4 w-4" />
                Perfil
              </Button>
            </DropdownMenuTrigger>

            <DropdownMenuContent align="end" className=' border-sm '>
              <DropdownMenuItem
                onClick={() => setShowProfilePage(true)}
              >
                <User className="mr-2 h-4 w-4" />
                Perfil
              </DropdownMenuItem>

              <DropdownMenuItem
                onClick={() => setShowProfileDialog(true)}
              >
                <Settings className="mr-2 h-4 w-4" />
                Configuração
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button
            variant="ghost"
            size="sm"
            className="text-white"
            onClick={handleLogout}
          >
            <LogOut className="mr-2 h-4 w-4 cursor-pointer" />
            Sair
          </Button>
        </div>
      </div>
    </header>

    {/* MAIN */}
    <main className="container space-y-8 px-4 py-6 md:p-8 overflow-x-hidden">

      {showProfilePage && (
          <section className="relative z-10 pt-5">
            <Card className="border-white/10 bg-white/5 backdrop-blur-md">
              <CardContent className="p-6">
                <div className="flex flex-col items-center text-center gap-5">

                  <div className="h-28 w-28 rounded-full overflow-hidden border-4 border-green-500 bg-zinc-800 shadow-lg">
                    {avatar ? (
                      <Image
                        src={avatar}
                        alt={studentProfile.name}
                        width={112}
                        height={112}
                        unoptimized
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center text-white text-4xl font-bold">
                        {studentProfile.name?.charAt(0)}
                      </div>
                    )}
                  </div>

                  <div>
                    <h1 className="text-3xl font-bold text-white">
                      {studentProfile.name}
                    </h1>

                    <p className="text-zinc-400">
                      {studentProfile.email}
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-xl">
                    <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
                      <p className="text-sm text-zinc-400">
                        Atividades finalizadas
                      </p>

                      <p className="text-3xl font-bold text-green-400">
                        {totalFinishedActivities}
                      </p>
                    </div>

                    <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
                      <p className="text-sm text-zinc-400">
                        Km total percorrido
                      </p>

                      <p className="text-3xl font-bold text-green-400">
                        {totalKm.toFixed(1)} km
                      </p>
                    </div>
                    <div className="w-full">
                      <PersonalRecordsCard />
                    </div>
                  </div>

                  <Button
                    variant="outline"
                    className="border-white/10 bg-white/5 text-white hover:bg-white/10"
                    onClick={() => setShowProfilePage(false)}
                  >
                    Voltar ao dashboard
                  </Button>
                </div>
              </CardContent>
            </Card>
          </section>
        )}

    {!showProfilePage && (
      <>
      {/* HERO */}
      <div className="space-y-4 py-5">

        <div className="flex items-center gap-4">

          {/* AVATAR */}
          <div className="relative group">

           <div className="h-16 w-16 rounded-full overflow-hidden border-2 border-green-500 shadow-lg bg-zinc-800">
                {avatar && avatar !== 'undefined' ? (
                  <Image
                    src={avatar}
                    alt={student.name}
                    width={64}
                    height={64}
                    unoptimized
                    key={avatar}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="h-full w-full flex items-center justify-center text-white text-2xl font-bold">
                    {student.name?.charAt(0)}
                  </div>
                )}
              </div>

            <label className="absolute inset-0 rounded-full bg-black/60 opacity-0 group-hover:opacity-100 transition-all cursor-pointer flex items-center justify-center">

              {uploading ? (
                <span className="text-xs text-white">
                  ...
                </span>
              ) : (
                <Camera className="h-5 w-5 text-white" />
              )}

              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleAvatarUpload}
              />
            </label>
          </div>

          {/* TEXTO */}
          <div>

            <h1 className="text-3xl font-bold text-white">
              Olá, {studentProfile.name}
            </h1>

            <p className="text-zinc-400">
              Bem-vindo de volta
            </p>

            <p className="text-green-400 text-sm font-semibold mt-1">
              {format(
                new Date(),
                "EEEE, d 'de' MMMM",
                {
                  locale: ptBR,
                }
              )}
            </p>
          </div>
        </div>

        <MotivationalQuote />
      </div>

      {/* TREINO + STRAVA */}
      <section className="space-y-4 pb-8">

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 overflow-hidden">

          {/* TREINO */}
          <div className="lg:col-span-8">

            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">

              <Calendar className="h-5 w-5 text-accent" />

              Treino de Hoje
            </h2>

            {!todayWorkout ? (

              <Card className="h-full">

                <CardContent className="flex flex-col items-center justify-center py-8 text-center h-full">

                  <CheckCircle className="h-12 w-12 text-green-500 mb-4" />

                  <CardTitle className="mb-2">
                    Nenhum treino programado
                  </CardTitle>

                  <CardDescription>
                    Aproveite para descansar.
                  </CardDescription>
                </CardContent>
              </Card>

            ) : (

              <Card
                className={
                  todayWorkoutCompleted
                    ? 'border-green-500/30 bg-green-500/5 h-full'
                    : 'border-accent/30 bg-accent/5 h-full'
                }
              >

               <CardContent className="p-4 sm:pt-6 h-full overflow-hidden">

                  <div className="flex flex-col justify-between h-full">

                    <div className="space-y-4">

                      <div className="flex flex-wrap items-center gap-2">

                        <h3 className="text-xl font-bold text-white">
                          {todayWorkout.title}
                        </h3>

                        <Badge>
                          {getWorkoutTypeLabel(
                            todayWorkout.workout_type
                          )}
                        </Badge>

                        {todayWorkoutCompleted && (
                          <Badge className="bg-green-500 hover:bg-green-600">
                            <CheckCircle className="mr-1 h-3 w-3" />
                            Concluído
                          </Badge>
                        )}
                      </div>

                      {todayWorkout.description && (
                        <p className="text-white">
                          {todayWorkout.description}
                        </p>
                      )}

                      <div className="flex flex-wrap gap-4 text-white">

                        {todayWorkout.target_distance_km && (
                          <div className="flex items-center gap-1 text-sm">

                            <Route className="h-4 w-4 text-accent" />

                            <span>
                              {formatDistance(todayWorkout.target_distance_km)}
                            </span>
                          </div>
                        )}

                        {todayWorkout.target_duration_minutes && (
  <div className="flex items-center gap-1 text-sm">

    <Timer className="h-4 w-4 text-accent" />

    <span>

      {todayWorkout.target_duration_minutes >= 60 ? (
        <>
          {Math.floor(
            todayWorkout.target_duration_minutes / 60
          )}h{' '}

          {todayWorkout.target_duration_minutes % 60 > 0 &&
            `${todayWorkout.target_duration_minutes % 60}min`}
        </>
      ) : (
        `${todayWorkout.target_duration_minutes} min`
      )}

    </span>
  </div>
)}
                      </div>

                     {todayWorkout.notes && (
                      <p className="text-sm text-muted-foreground border-l-2 border-accent pl-3">
                        {todayWorkout.notes}
                      </p>
                    )}

                    {/* ADICIONAR AQUI - Exibir steps do treino */}
                    {todayWorkout.steps && todayWorkout.steps.length > 0 && (
                      <WorkoutStepsDisplay 
                        steps={todayWorkout.steps} 
                        student={student}
                      />
                    )}
                    </div>

                    {!todayWorkoutCompleted && (
                      <div className="pt-2">

                       <Button
                          variant="outline"
                          size="sm"
                          className="w-full text-white sm:w-auto shrink-0 bg-white/5"
                          onClick={() =>
                            handleStartWorkout(todayWorkout)
                          }
                        >
                          Fazer treino
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* STRAVA */}
          <div className="lg:col-span-4">

            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2 pt-8">

              <ImportIcon className="h-5 w-5 text-accent" />

              Strava
            </h2>

            <Card className="w-full border-accent/20 bg-white/5 backdrop-blur overflow-hidden">

             <CardContent className="p-4 flex flex-col gap-4">

               <div className="flex flex-col gap-4">

                  <div className="space-y-2 mb-4 ">

                    <h3 className="font-semibold text-white">
                      Importar atividade
                    </h3>

                    <p className="text-sm text-muted-foreground">
                      Sincronize atividades do Strava.
                    </p>
                  </div>

                  <StravaIntegration
                    onImportActivity={
                      handleStravaImport
                    }
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* TABS */}
      <Tabs
        defaultValue="past"
        className="space-y-4"
      >

        <TabsList className="grid w-full grid-cols-2">

          <TabsTrigger value="past">
            Treinos Anteriores
          </TabsTrigger>

          <TabsTrigger value="history">
            Meu Histórico
          </TabsTrigger>

        </TabsList>

        {/* TREINOS ANTERIORES */}
        <TabsContent
          value="past"
          className="space-y-4"
        >

          {pastWorkouts.length === 0 ? (

            <Card>

              <CardContent className="flex flex-col items-center py-8">

                <History className="h-12 w-12 text-muted-foreground mb-4" />

                <CardTitle className="mb-2 text-base">
                  Nenhum treino pendente
                </CardTitle>

                <CardDescription>
                  Todos os treinos anteriores foram concluídos.
                </CardDescription>
              </CardContent>
            </Card>

          ) : (

            <div className="space-y-3">

              {pastWorkouts.map((workout) => (

                <Card  className="h-full border-accent/20 bg-white/5 backdrop-blur" key={workout.id}>

                  <CardContent className="p-4">

                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">

                      <div className="flex-1">

                        <div className="flex items-center gap-2 mb-1">

                          <h3 className="font-semibold text-white">
                            {workout.title}
                          </h3>

                          <Badge variant="outline" className='text-white'>
                            {getWorkoutTypeLabel(
                              workout.workout_type
                            )}
                          </Badge>
                        </div>

                        <p className="text-sm text-muted-foreground">

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

                        <div className="flex gap-3 mt-2 text-sm text-white">
                          <Route className="h-4 w-4 text-accent" />
                          {workout.target_distance_km && (
                            
                            <span>
                             
                              {formatDistance(workout.target_distance_km)}
                            </span>
                          )}

                          {workout.target_duration_minutes && (
                    <div className="flex items-center gap-1 text-sm">
                      <span>

                        {workout.target_duration_minutes && (
                <div className="flex items-center gap-1 text-sm">
                  <Timer className="h-4 w-4 text-accent" />
                  <span>
                    {workout.target_duration_minutes >= 60 ? (
                      <>
                        {Math.floor(workout.target_duration_minutes / 60)}h{' '}
                        {workout.target_duration_minutes % 60 > 0 &&
                          `${workout.target_duration_minutes % 60}min`}
                      </>
                    ) : (
                      `${workout.target_duration_minutes} min`
                    )}
                  </span>
                </div>
              )}

              {/* ADICIONAR AQUI - Exibir steps dos treinos pendentes */}
              {workout.steps && workout.steps.length > 0 && (
                <WorkoutStepsDisplay 
                  steps={workout.steps} 
                  student={student}
                />
              )}
                      </span>
                    </div>
                  )}
                        </div>
                      </div>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          handleStartWorkout(
                            workout
                          )
                        }
                      >
                        Fazer treino
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* HISTÓRICO */}
       <TabsContent
  value="history"
  className="space-y-4"
>
<WeeklyVolumeCard 
    workouts={workouts} 
    logs={logs}
  />
  {logs.length === 0 ? (

    <Card>

      <CardContent className="flex flex-col items-center py-8">

        <Route className="h-12 w-12 text-muted-foreground mb-4" />

        <CardTitle className="mb-2 text-base">
          Nenhum treino registrado
        </CardTitle>

        <CardDescription>
          Seu histórico de treinos aparecerá aqui.
        </CardDescription>
      </CardContent>
    </Card>

  ) : (

    <div className="space-y-3">

      {logs.map((log) => (

        <Card
          key={log.id}
          className="
            border-white/10
            bg-white/5
            backdrop-blur-md
          "
        >

          <CardContent className="p-4">

            <div className="flex justify-between items-start mb-3">

              <div>

                <h3 className="font-semibold text-white">

                  {log.workout_title ??
                    log.notes?.replace(
                      'Importado do Strava: ',
                      ''
                    ) ??
                    'Atividade Strava'}
                </h3>

                <p className="text-sm text-muted-foreground">

                  {format(
                    new Date(log.completed_at),
                    "d 'de' MMMM 'às' HH:mm",
                    {
                      locale: ptBR,
                    }
                  )}
                </p>
              </div>

              <div className="flex items-center gap-2">

                <CheckCircle className="h-5 w-5 text-green-500" />

                <Button
                  variant="ghost"
                  size="icon"
                  className="
                    h-8
                    w-8
                    text-muted-foreground
                    hover:text-red-500
                    hover:bg-red-500/10
                  "
                  onClick={() =>
                    handleDeleteLog(log.id)
                  }
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">

              {/* DISTÂNCIA */}

              <div className="
                rounded-xl
                border
                border-white/10
                bg-white/5
                p-3
              ">

                <p className="text-xs text-muted-foreground">
                  Distância
                </p>

                <p className="font-bold text-white text-lg">
                  {formatDistance(log.actual_distance_km)}
                </p>
              </div>

              {/* TEMPO */}

              <div className="
                rounded-xl
                border
                border-white/10
                bg-white/5
                p-3
              ">

                <p className="text-xs text-muted-foreground">
                  Tempo
                </p>

                <p className="font-bold text-white text-lg">
                  {log.actual_duration_minutes} min
                </p>
              </div>

              {/* PACE */}

              <div className="
                rounded-xl
                border
                border-white/10
                bg-white/5
                p-3
              ">

                <p className="text-xs text-muted-foreground">
                  Pace
                </p>

                <p className="font-bold text-white text-lg">

                  {formatPace(
                    Number(
                      log.actual_pace_min_km
                    )
                  )}
                </p>
              </div>

              {/* CALORIAS */}

              <div className="
                rounded-xl
                border
                border-white/10
                bg-white/5
                p-3
              ">

                <p className="text-xs text-muted-foreground">
                  Calorias
                </p>

                <p className="font-bold text-white text-lg">

                  {log.calories_burned || '-'}
                </p>
              </div>
            </div>


          </CardContent>
        </Card>
      ))}
    </div>
  )}
</TabsContent>
      </Tabs>
      </>
      )}
    </main>

    {/* DIALOG */}
    {selectedWorkout && (
      <LogWorkoutDialog
        key={
          stravaImportData?.strava_id ||
          selectedWorkout.id
        }
        open={showLogDialog}
        onOpenChange={setShowLogDialog}
        workout={selectedWorkout}
        studentId={student.id}
        onSuccess={handleLogSuccess}
        stravaImportData={
          stravaImportData
        }
      />
    )}
     <StudentProfileDialog
          open={showProfileDialog}
          onOpenChange={setShowProfileDialog}
          student={studentProfile}
          onSuccess={() => {
           router.refresh()
        }}
        />
  </div>

)}