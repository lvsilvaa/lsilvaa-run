'use client'

import { useMemo, useState } from 'react'
import { format, eachDayOfInterval } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Card,
  CardContent,
} from '@/components/ui/card'

type Props = {
  studentId: number
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

type WorkoutDay = {
  date: string
  title: string
  workout_type: string
  target_distance_km: string
  target_duration_minutes: string
  target_pace_min_km: string
  description: string
}

export function PeriodWorkoutBuilder({
  studentId,
  open,
  onOpenChange,
  onSuccess,
}: Props) {
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
      start: new Date(startDate),
      end: new Date(endDate),
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
      }))
    )
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
        (day) => day.title || day.description
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
          student_id: studentId,
          workouts: workoutsToSave.map((day) => ({
            title: day.title || 'Treino programado',
            workout_type: day.workout_type,
            scheduled_date: day.date,
            target_distance_km: day.target_distance_km
              ? Number(day.target_distance_km)
              : null,
            target_duration_minutes: day.target_duration_minutes
              ? Number(day.target_duration_minutes)
              : null,
            target_pace_min_km: day.target_pace_min_km || null,
            description: day.description || null,
            status: 'pending',
          })),
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Erro ao salvar treinos')
      }

      toast.success('Treinos salvos com sucesso!')
      onSuccess()
      onOpenChange(false)
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : 'Erro ao salvar treinos'
      )
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-350px max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Montar treinos por período</DialogTitle>
        </DialogHeader>

        {days.length === 0 ? (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Data inicial</Label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>Data final</Label>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
            </div>

            <Button onClick={generateDays} className="w-full">
              Gerar planejamento
            </Button>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {days.map((day, index) => (
                <Card key={day.date}>
                  <CardContent className="p-4 space-y-3">
                    <div>
                      <h3 className="font-bold">
                        {format(new Date(day.date), 'EEEE', {
                          locale: ptBR,
                        })}
                      </h3>

                      <p className="text-sm text-muted-foreground">
                        {format(new Date(day.date), 'dd/MM/yyyy')}
                      </p>
                    </div>

                    <Input
                      placeholder="Título do treino"
                      value={day.title}
                      onChange={(e) =>
                        updateDay(index, 'title', e.target.value)
                      }
                    />

                    <select
                      className="w-full rounded-md border bg-background p-2 text-sm"
                      value={day.workout_type}
                      onChange={(e) =>
                        updateDay(index, 'workout_type', e.target.value)
                      }
                    >
                      <option value="easy">Leve</option>
                      <option value="tempo">Tempo</option>
                      <option value="interval">Intervalado</option>
                      <option value="long">Longão</option>
                      <option value="recovery">Recuperação</option>
                      <option value="race">Prova</option>
                      <option value="fartlek">Fartlek</option>
                    </select>

                    <div className="grid grid-cols-3 gap-2">
                      <Input
                        placeholder="Km"
                        value={day.target_distance_km || ''}
                        onChange={(e) =>
                          updateDay(
                            index,
                            'target_distance_km',
                            e.target.value
                          )
                        }
                      />

                      <Input
                        placeholder="Min"
                        value={day.target_duration_minutes || ''}
                        onChange={(e) =>
                          updateDay(
                            index,
                            'target_duration_minutes',
                            e.target.value
                          )
                        }
                      />

                      <Input
                        placeholder="Pace"
                        value={day.target_pace_min_km || ''}
                        onChange={(e) =>
                          updateDay(
                            index,
                            'target_pace_min_km',
                            e.target.value
                          )
                        }
                      />
                    </div>

                    <Textarea
                      placeholder="Descrição do treino"
                      value={day.description}
                      onChange={(e) =>
                        updateDay(index, 'description', e.target.value)
                      }
                      className="min-h-[120px]"
                    />
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => setDays([])}
              >
                Voltar
              </Button>

              <Button
                onClick={saveAll}
                disabled={isSaving}
                className="flex-1"
              >
                {isSaving ? 'Salvando...' : 'Salvar todos os treinos'}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}