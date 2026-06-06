'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

import {
  eachDayOfInterval,
  format,
} from 'date-fns'

import { ptBR } from 'date-fns/locale'
import { toast } from 'sonner'

import { Logo } from '@/components/logo'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
    StepEditor,
    defaultStep,
    stepTypeConfig
} from '@/components/workout-step-editor'

import type {StepType} from '@/components/workout-step-editor'

import {
  Card,
  CardContent,
} from '@/components/ui/card'

import {
  ArrowLeft,
  Calendar,
  Save,
  Plus,
} from 'lucide-react'

import type { Student, WorkoutStep } from '@/lib/db'

type Props = {
  student: Student
}

type WorkoutDay = {
  date: string
  title: string
  workout_type: string
  target_distance_km: string
  target_duration_minutes: string
  target_pace_min_km: string
  description: string
  notes: string
  steps: WorkoutStep[]
}

export function PeriodWorkoutBuilderPage({
  student,
}: Props) {
  const router = useRouter()

  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [days, setDays] = useState<WorkoutDay[]>([])
  const [isSaving, setIsSaving] = useState(false)

  function generateDays() {
    if (!startDate || !endDate) {
      toast.error('Selecione a data inicial e final')
      return
    }

    const dates = eachDayOfInterval({
      start: new Date(`${startDate}T00:00:00`),
      end: new Date(`${endDate}T00:00:00`),
    })

    setDays(
        dates.map((date) => ({
            date: format(date, 'yyyy-MM-dd'),
            title: '',
            workout_type: 'easy',
            target_distance_km: '',
            target_duration_minutes: '',
            target_pace_min_km: '',
            description: '',
            notes: '',
            steps: [],
        }))
        )
  }

  function paceToDecimal(pace: string): number | null {
  const parts = pace.split(':')

  if (parts.length !== 2) return null

  const min = parseInt(parts[0])
  const sec = parseInt(parts[1])

  if (isNaN(min) || isNaN(sec) || sec >= 60) {
    return null
  }

  return Math.round((min + sec / 60) * 100) / 100
}

function calculateAveragePace(totalKm: number, totalMin: number) {
  if (!totalKm || !totalMin) return null

  return totalMin / totalKm
}

function calculateTotals(steps: any[]) {
  let totalKm = 0
  let totalMin = 0

  function getAveragePaceFromStep(step: any) {
    if (step.target_type !== 'pace' || !step.target_from) {
      return null
    }

    const from = paceToDecimal(step.target_from)

    const to = step.target_to
      ? paceToDecimal(step.target_to)
      : from

    if (!from || !to) return null

    return (from + to) / 2
  }

  function processStep(step: any, multiplier = 1) {
    if (step.type === 'repeat') {
      const reps = step.repeat_count || 1

      ;(step.repeat_steps || []).forEach((s: any) =>
        processStep(s, multiplier * reps)
      )

      return
    }

    const value = parseFloat(step.duration_value || '0')

    if (!value) return

    const avgPace = getAveragePaceFromStep(step)

    if (step.duration_type === 'distance') {
      totalKm += value * multiplier

      if (avgPace) {
        totalMin += value * avgPace * multiplier
      }
    }

    if (step.duration_type === 'time') {
      totalMin += value * multiplier

      if (avgPace) {
        totalKm += (value / avgPace) * multiplier
      }
    }
  }

  steps.forEach((step) => processStep(step))

  return {
    totalKm: Math.round(totalKm * 100) / 100,
    totalMin: Math.round(totalMin),
  }
}

  function updateDay(
    index: number,
    field: keyof WorkoutDay,
    value: string
  ) {
    setDays((current) =>
      current.map((day, i) =>
        i === index
          ? {
              ...day,
              [field]: value,
            }
          : day
      )
    )
  }

  async function saveAll() {
    try {
      setIsSaving(true)

      const workoutsToSave = days.filter(
        (day) =>
          day.title ||
          day.description ||
          day.target_distance_km ||
          day.target_duration_minutes
      )

      if (workoutsToSave.length === 0) {
        toast.error('Preencha pelo menos um treino')
        return
      }

      const res = await fetch('/api/workouts/batch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          student_id: student.id,
            workouts: workoutsToSave.map((day) => {
            const { totalKm, totalMin } = calculateTotals(day.steps || [])
            const averagePace = calculateAveragePace(totalKm, totalMin)

            return {
                title: day.title || 'Treino programado',
                workout_type: day.workout_type,
                scheduled_date: day.date,

                target_distance_km:
                totalKm > 0
                    ? totalKm
                    : day.target_distance_km
                    ? Number(day.target_distance_km)
                    : null,

                target_duration_minutes:
                totalMin > 0
                    ? totalMin
                    : day.target_duration_minutes
                    ? Number(day.target_duration_minutes)
                    : null,

                target_pace_min_km:
                averagePace
                    ? Math.round(averagePace * 100) / 100
                    : day.target_pace_min_km || null,

                description: day.description || null,
                notes: day.notes || null,

                steps:
                day.steps.length > 0
                    ? day.steps
                    : null,

                status: 'pending',
            }
            })
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Erro ao salvar treinos')
      }

      toast.success('Planejamento salvo com sucesso!')
      router.push(`/coach/student/${student.id}`)
      router.refresh()
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : 'Erro ao salvar planejamento'
      )
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#000428] to-[#2c3e50]">
      <header className="sticky top-5 z-50 border-b border-white/10 backdrop-blur-xl">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              className="text-white"
              onClick={() =>
                router.push(`/coach/student/${student.id}`)
              }
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Voltar
            </Button>

            <Logo size="sm" />
          </div>
        </div>
      </header>

      <main className="container my-5 px-4 py-8 md:px-8 space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-white">
            Montar treino por período
          </h1>

          <p className="text-zinc-400 mt-2">
            Aluno: {student.name}
          </p>
        </div>

        {days.length === 0 ? (
          <Card className="border-white/10 bg-white/5 backdrop-blur-md max-w-2xl">
            <CardContent className="p-6 space-y-5">
              <div className="flex items-center gap-2 text-white">
                <Calendar className="h-5 w-5 text-green-400" />
                <h2 className="text-xl font-semibold">
                  Selecione o período
                </h2>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-white">
                    Data inicial
                  </Label>

                  <Input
                    type="date"
                    value={startDate}
                    onChange={(e) =>
                      setStartDate(e.target.value)
                    }
                    className="bg-zinc-900/70 border-white/10 text-white"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-white">
                    Data final
                  </Label>

                  <Input
                    type="date"
                    value={endDate}
                    onChange={(e) =>
                      setEndDate(e.target.value)
                    }
                    className="bg-zinc-900/70 border-white/10 text-white"
                  />
                </div>
              </div>

              <Button
                onClick={generateDays}
                className="w-full bg-green-500 text-black hover:bg-green-400"
              >
                Gerar planejamento
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold text-white">
                  Planejamento gerado
                </h2>

                <p className="text-sm text-zinc-400">
                  {format(
                    new Date(`${startDate}T00:00:00`),
                    'dd/MM/yyyy'
                  )}{' '}
                  até{' '}
                  {format(
                    new Date(`${endDate}T00:00:00`),
                    'dd/MM/yyyy'
                  )}
                </p>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="border-white/10 bg-white/5 text-white"
                  onClick={() => setDays([])}
                >
                  Trocar período
                </Button>

                <Button
                  onClick={saveAll}
                  disabled={isSaving}
                  className="bg-green-500 text-black hover:bg-green-400"
                >
                  <Save className="mr-2 h-4 w-4" />
                  {isSaving ? 'Salvando...' : 'Salvar todos'}
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {days.map((day, index) => (
                <Card
                  key={day.date}
                  className="border-white/10 bg-white/5 backdrop-blur-md"
                >
                  <CardContent className="p-4 space-y-3">
                    <div>
                      <h3 className="font-bold text-white capitalize">
                        {format(
                          new Date(`${day.date}T00:00:00`),
                          'EEEE',
                          {
                            locale: ptBR,
                          }
                        )}
                      </h3>

                      <p className="text-sm text-zinc-400">
                        {format(
                          new Date(`${day.date}T00:00:00`),
                          'dd/MM/yyyy'
                        )}
                      </p>
                    </div>

                    <Input
                      placeholder="Título do treino"
                      value={day.title}
                      onChange={(e) =>
                        updateDay(
                          index,
                          'title',
                          e.target.value
                        )
                      }
                      className="bg-zinc-900/70 border-white/10 text-white"
                    />

                    <select
                      className="w-full rounded-md border border-white/10 bg-zinc-900/70 p-2 text-sm text-white"
                      value={day.workout_type}
                      onChange={(e) =>
                        updateDay(
                          index,
                          'workout_type',
                          e.target.value
                        )
                      }
                    >
                      <option value="easy">Leve</option>
                      <option value="tempo">Tempo</option>
                      <option value="interval">
                        Intervalado
                      </option>
                      <option value="long">Longão</option>
                      <option value="recovery">
                        Recuperação
                      </option>
                      <option value="race">Prova</option>
                      <option value="fartlek">Fartlek</option>
                    </select>

                    <div className="space-y-3">
  <Label className="text-white">
    Estrutura do treino
  </Label>

  {day.steps.length === 0 && (
    <p className="text-sm text-zinc-400 text-center py-4 border border-dashed border-white/10 rounded-lg">
      Adicione passos ao treino
    </p>
  )}

  <div className="space-y-2 text-white">
    {day.steps.map((step, stepIndex) => (
      <StepEditor
        key={step.id}
        step={step}
        student={student}
        onChange={(updated) => {
          setDays((current) =>
            current.map((item, i) =>
              i === index
                ? {
                    ...item,
                    steps: item.steps.map((s, si) =>
                      si === stepIndex ? updated : s
                    ),
                  }
                : item
            )
          )
        }}
        onDelete={() => {
          setDays((current) =>
            current.map((item, i) =>
              i === index
                ? {
                    ...item,
                    steps: item.steps.filter(
                      (_, si) => si !== stepIndex
                    ),
                  }
                : item
            )
          )
        }}
      />
    ))}
  </div>

  <div className="flex flex-wrap gap-2">
    {(
      [
        'warmup',
        'run',
        'recovery',
        'cooldown',
        'repeat',
      ] as StepType[]
    ).map((type) => (
      <Button
        key={type}
        type="button"
        variant="outline"
        size="sm"
        onClick={() => {
          setDays((current) =>
            current.map((item, i) =>
              i === index
                ? {
                    ...item,
                    steps: [
                      ...item.steps,
                      defaultStep(type),
                    ],
                  }
                : item
            )
          )
        }}
      >
        <Plus className="h-3 w-3 mr-1" />
        {stepTypeConfig[type].label}
      </Button>
    ))}
  </div>
</div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}