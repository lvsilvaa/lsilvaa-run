'use client'

import { useState } from 'react'
import { format } from 'date-fns'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

import { Badge } from '@/components/ui/badge'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

import { toast } from 'sonner'

import {
  Plus,
  Trash2,
  GripVertical,
  ChevronDown,
  ChevronUp,
  RefreshCw,
} from 'lucide-react'

// ─────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────

export type StepType =
  | 'warmup'
  | 'run'
  | 'recovery'
  | 'cooldown'
  | 'repeat'

type DurationType = 'distance' | 'time' | 'open'

type TargetType =
  | 'pace'
  | 'heart_rate'
  | 'none'

type WorkoutStep = {
  id: string
  type: StepType
  description: string

  duration_type: DurationType
  duration_value: string

  target_type: TargetType

  target_from: string
  target_to: string

  repeat_count?: number
  repeat_steps?: WorkoutStep[]
}

type CreateWorkoutDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  studentId: number
  onSuccess: () => void

  student?: any
}

// ─────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────

const workoutTypes = [
  { value: 'easy', label: 'Leve' },
  { value: 'tempo', label: 'Tempo' },
  { value: 'interval', label: 'Intervalado' },
  { value: 'long', label: 'Longão' },
  { value: 'recovery', label: 'Recuperação' },
  { value: 'fartlek', label: 'Fartlek' },
  { value: 'race', label: 'Prova' },
]

export const stepTypeConfig: Record<
  StepType,
  {
    label: string
    color: string
    bg: string
  }
> = {
  warmup: {
    label: 'Aquecimento',
    color: 'text-blue-600',
    bg: 'bg-blue-500/10 border-blue-500/20',
  },

  run: {
    label: 'Corrida',
    color: 'text-green-600',
    bg: 'bg-green-500/10 border-green-500/20',
  },

  recovery: {
    label: 'Recuperação',
    color: 'text-yellow-600',
    bg: 'bg-yellow-500/10 border-yellow-500/20',
  },

  cooldown: {
    label: 'Desaquecimento',
    color: 'text-purple-600',
    bg: 'bg-purple-500/10 border-purple-500/20',
  },

  repeat: {
    label: 'Repetição',
    color: 'text-orange-600',
    bg: 'bg-orange-500/10 border-orange-500/20',
  },
}

// ─────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────

function uid() {
  return Math.random().toString(36).slice(2, 8)
}

function formatPaceInput(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 4)

  if (digits.length <= 2) {
    return digits
  }

  return `${digits.slice(0, 2)}:${digits.slice(2)}`
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

function decimalToPace(decimal?: number | null) {
  if (!decimal) return ''

  const min = Math.floor(decimal)
  const sec = Math.round((decimal % 1) * 60)

  return `${min}:${sec.toString().padStart(2, '0')}`
}

function paceDecimalToString(decimal: number) {
  const min = Math.floor(decimal)
  const sec = Math.round((decimal % 1) * 60)

  return `${min}:${sec.toString().padStart(2, '0')}`
}

function calculateAveragePace(
  totalKm: number,
  totalMin: number
) {
  if (!totalKm || !totalMin) {
    return null
  }

  const avg = totalMin / totalKm

  return avg
}

export function defaultStep(type: StepType): WorkoutStep {
  return {
    id: uid(),

    type,

    description: '',

    duration_type:
      type === 'repeat'
        ? 'open'
        : 'distance',

    duration_value: '',

    target_type: 'none',

    target_from: '',
    target_to: '',

    repeat_count:
      type === 'repeat'
        ? 3
        : undefined,

    repeat_steps:
      type === 'repeat'
        ? [
            defaultStep('run'),
            defaultStep('recovery'),
          ]
        : undefined,
  }
}

// ─────────────────────────────────────────────────────────────
// STEP SUMMARY
// ─────────────────────────────────────────────────────────────

function stepSummary(step: WorkoutStep): string {
  const parts: string[] = []

  if (step.type === 'repeat') {
    return `${step.repeat_count}x repetições`
  }

  if (step.duration_value) {
    if (step.duration_type === 'distance') {
      parts.push(`${step.duration_value} km`)
    }

    if (step.duration_type === 'time') {
      parts.push(`${step.duration_value} min`)
    }

    if (step.duration_type === 'open') {
      parts.push('Aberto')
    }
  }

  if (
    step.target_type === 'pace' &&
    step.target_from
  ) {
    parts.push(
      `${step.target_from}${
        step.target_to
          ? ' - ' + step.target_to
          : ''
      } min/km`
    )
  }

  if (
    step.target_type === 'heart_rate' &&
    step.target_from
  ) {
    parts.push(
      `${step.target_from}${
        step.target_to
          ? ' - ' + step.target_to
          : ''
      } bpm`
    )
  }

  return parts.join(' · ') || 'Configurar...'
}

// ─────────────────────────────────────────────────────────────
// STEP EDITOR
// ─────────────────────────────────────────────────────────────

export function StepEditor({
  step,
  onChange,
  onDelete,
  depth = 0,
  student,
}: {
  step: WorkoutStep

  onChange: (updated: WorkoutStep) => void

  onDelete: () => void

  depth?: number

  student?: any
}) {
  const [expanded, setExpanded] =
    useState(true)

  const cfg = stepTypeConfig[step.type]

  // ─────────────────────────────────────────────────────
  // ZONAS
  // ─────────────────────────────────────────────────────

  const trainingZones = student
  ? [
      {
        label: 'Z1',
        from: student.z1_min
          ? decimalToPace(Number(student.z1_min))
          : '',
        to: student.z1_max
          ? decimalToPace(Number(student.z1_max))
          : '',
      },

      {
        label: 'Z2',
        from: student.z2_min
          ? decimalToPace(Number(student.z2_min))
          : '',
        to: student.z2_max
          ? decimalToPace(Number(student.z2_max))
          : '',
      },

      {
        label: 'Z3',
        from: student.z3_min
          ? decimalToPace(Number(student.z3_min))
          : '',
        to: student.z3_max
          ? decimalToPace(Number(student.z3_max))
          : '',
      },

      {
        label: 'Z4',
        from: student.z4_min
          ? decimalToPace(Number(student.z4_min))
          : '',
        to: student.z4_max
          ? decimalToPace(Number(student.z4_max))
          : '',
      },

      {
        label: 'Z5',
        from: student.z5_min
          ? decimalToPace(Number(student.z5_min))
          : '',
        to: student.z5_max
          ? decimalToPace(Number(student.z5_max))
          : '',
      },
    ].filter(
      (zone) =>
        zone.from &&
        zone.to
    )
  : []

  function updateField<
    K extends keyof WorkoutStep
  >(
    key: K,
    value: WorkoutStep[K]
  ) {
    onChange({
      ...step,
      [key]: value,
    })
  }

  function updateRepeatStep(
    index: number,
    updated: WorkoutStep
  ) {
    const newSteps = [
      ...(step.repeat_steps || []),
    ]

    newSteps[index] = updated

    updateField('repeat_steps', newSteps)
  }

  function deleteRepeatStep(index: number) {
    const newSteps =
      (step.repeat_steps || []).filter(
        (_, i) => i !== index
      )

    updateField('repeat_steps', newSteps)
  }

  function addRepeatStep(type: StepType) {
    const newSteps = [
      ...(step.repeat_steps || []),
      defaultStep(type),
    ]

    updateField('repeat_steps', newSteps)
  }

  return (
    <div
      className={`rounded-lg border ${cfg.bg} ${
        depth > 0 ? 'ml-4' : ''
      }`}
    >
      {/* HEADER */}

      <div className="flex items-center gap-2 p-3">
        <GripVertical className="h-4 w-4 text-muted-foreground shrink-0" />

        <Badge
          variant="outline"
          className={`${cfg.color} border-current shrink-0`}
        >
          {cfg.label}
        </Badge>

        <span className="text-sm text-muted-foreground flex-1 truncate">
          {stepSummary(step)}
        </span>

        <button
          type="button"
          onClick={() =>
            setExpanded((e) => !e)
          }
          className="text-muted-foreground hover:text-foreground p-1"
        >
          {expanded ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
        </button>

        <button
          type="button"
          onClick={onDelete}
          className="text-muted-foreground hover:text-destructive p-1"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      {/* BODY */}

      {expanded && (
        <div className="px-3 pb-3 space-y-3 border-t border-current/10 pt-3">
          {/* DESCRIÇÃO */}

          <div className="space-y-1">
            <Label className="text-xs">
              Descrição (opcional)
            </Label>

            <Input
              value={step.description}
              onChange={(e) =>
                updateField(
                  'description',
                  e.target.value
                )
              }
              placeholder="Ex: Ritmo confortável"
              className="h-8 text-sm"
            />
          </div>

          {/* REPEAT */}

          {step.type === 'repeat' && (
            <div className="space-y-1">
              <Label className="text-xs">
                Número de repetições
              </Label>

              <Input
                type="number"
                min={1}
                max={30}
                value={step.repeat_count ?? 3}
                onChange={(e) =>
                  updateField(
                    'repeat_count',
                    parseInt(e.target.value)
                  )
                }
                className="h-8 text-sm w-24"
              />
            </div>
          )}

          {/* DURAÇÃO */}

          {step.type !== 'repeat' && (
            <div className="grid grid-cols-1 gap-2">
              <div className="space-y-1">
                <Label className="text-xs">
                  Tipo de duração
                </Label>

                <Select
                  value={step.duration_type}
                  onValueChange={(v) =>
                    updateField(
                      'duration_type',
                      v as DurationType
                    )
                  }
                >
                  <SelectTrigger className="h-8 text-sm">
                    <SelectValue />
                  </SelectTrigger>

                  <SelectContent>
                    <SelectItem value="distance">
                      Distância (km)
                    </SelectItem>

                    <SelectItem value="time">
                      Tempo (min)
                    </SelectItem>

                    <SelectItem value="open">
                      Aberto
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {step.duration_type !== 'open' && (
                <div className="space-y-1">
                  <Label className="text-xs">
                    {step.duration_type ===
                    'distance'
                      ? 'Distância (km)'
                      : 'Tempo (min)'}
                  </Label>

                  <Input
                    type="number"
                    step={
                      step.duration_type ===
                      'distance'
                        ? '0.1'
                        : '1'
                    }
                    value={step.duration_value}
                    onChange={(e) =>
                      updateField(
                        'duration_value',
                        e.target.value
                      )
                    }
                    className="h-8 w-36 text-sm"
                  />
                </div>
              )}
            </div>
          )}

          {/* TARGET */}

          {step.type !== 'repeat' && (
            <div className="space-y-2">
              <div className="space-y-1">
                <Label className="text-xs">
                  Alvo
                </Label>

                <Select
                  value={step.target_type}
                  onValueChange={(v) =>
                    updateField(
                      'target_type',
                      v as TargetType
                    )
                  }
                >
                  <SelectTrigger className="h-8 text-sm">
                    <SelectValue />
                  </SelectTrigger>

                  <SelectContent>
                    <SelectItem value="none">
                      Sem alvo
                    </SelectItem>

                    <SelectItem value="pace">
                      Pace (min/km)
                    </SelectItem>

                    <SelectItem value="heart_rate">
                      Frequência cardíaca
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* PACE */}

              {step.target_type === 'pace' && (
  <div className="space-y-3">

    {/* ZONAS */}

    {student ? (
      <div className="space-y-2">
        <Label className="text-xs">
          Zonas do aluno
        </Label>

        <div className="flex flex-wrap gap-2 text-black">
          {[
            {
              label: 'Z1',
              from: decimalToPace(Number(student?.z1_min)),
              to: decimalToPace(Number(student?.z1_max)),
            },
            {
              label: 'Z2',
              from: decimalToPace(Number(student?.z2_min)),
              to: decimalToPace(Number(student?.z2_max)),
            },
            {
              label: 'Z3',
              from: decimalToPace(Number(student?.z3_min)),
              to: decimalToPace(Number(student?.z3_max)),
            },
            {
              label: 'Z4',
              from: decimalToPace(Number(student?.z4_min)),
              to: decimalToPace(Number(student?.z4_max)),
            },
            {
              label: 'Z5',
              from: decimalToPace(Number(student?.z5_min)),
              to: decimalToPace(Number(student?.z5_max)),
            },
          ]
            .filter(
              (zone) =>
                zone.from &&
                zone.to
            )
            .map((zone) => (
              <Button
                key={zone.label}
                type="button"
                variant="outline"
                size="sm"
                className="h-8 text-xs"
                onClick={() => {
                  onChange({
                    ...step,
                    target_from: zone.from,
                    target_to: zone.to,
                  })
                }}
              >
                {zone.label} • {zone.from} - {zone.to}
              </Button>
            ))}
        </div>
      </div>
    ) : (
      <div className="text-xs text-muted-foreground border rounded-md p-2">
        Nenhuma zona encontrada para o aluno.
      </div>
    )}

    {/* INPUTS MANUAIS */}

    <div className="grid grid-cols-2 gap-2">
      <div className="space-y-1">
        <Label className="text-xs">
          Pace mínimo
        </Label>

        <Input
          value={step.target_from}
          onChange={(e) =>
            updateField(
              'target_from',
              formatPaceInput(
                e.target.value
              )
            )
          }
          placeholder="5:00"
          maxLength={5}
          className="h-8 text-sm"
        />
      </div>

      <div className="space-y-1">
        <Label className="text-xs">
          Pace máximo
        </Label>

        <Input
          value={step.target_to}
          onChange={(e) =>
            updateField(
              'target_to',
              formatPaceInput(
                e.target.value
              )
            )
          }
          placeholder="5:30"
          maxLength={5}
          className="h-8 text-sm"
        />
      </div>
    </div>
  </div>
)}
              {/* FC */}

              {step.target_type ===
                'heart_rate' && (
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label className="text-xs">
                      FC mínima
                    </Label>

                    <Input
                      type="number"
                      value={step.target_from}
                      onChange={(e) =>
                        updateField(
                          'target_from',
                          e.target.value
                        )
                      }
                      className="h-8 text-sm"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs">
                      FC máxima
                    </Label>

                    <Input
                      type="number"
                      value={step.target_to}
                      onChange={(e) =>
                        updateField(
                          'target_to',
                          e.target.value
                        )
                      }
                      className="h-8 text-sm"
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* SUBSTEPS */}

          {step.type === 'repeat' && (
            <div className="space-y-2">
              <Label className="text-xs">
                Passos da repetição
              </Label>

              {(step.repeat_steps || []).map(
                (rs, i) => (
                  <StepEditor
                    key={rs.id}
                    step={rs}
                    student={student}
                    onChange={(updated) =>
                      updateRepeatStep(
                        i,
                        updated
                      )
                    }
                    onDelete={() =>
                      deleteRepeatStep(i)
                    }
                    depth={depth + 1}
                  />
                )
              )}

              <div className="flex gap-2 flex-wrap text-black">
                {(
                  ['run', 'recovery'] as StepType[]
                ).map((t) => (
                  <Button
                    key={t}
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() =>
                      addRepeatStep(t)
                    }
                  >
                    <Plus className="h-3 w-3 mr-1" />

                    {stepTypeConfig[t].label}
                  </Button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// MAIN DIALOG
// ─────────────────────────────────────────────────────────────

export function CreateWorkoutDialog({
  open,
  onOpenChange,
  studentId,
  onSuccess,
  student,
}: CreateWorkoutDialogProps) {
  const [isLoading, setIsLoading] =
    useState(false)

  const [paceInput, setPaceInput] =
    useState('')

  const [steps, setSteps] = useState<
    WorkoutStep[]
  >([])

  const [workoutType, setWorkoutType] =
    useState('easy')

  function addStep(type: StepType) {
    setSteps((s) => [
      ...s,
      defaultStep(type),
    ])
  }

  function updateStep(
    index: number,
    updated: WorkoutStep
  ) {
    setSteps((s) =>
      s.map((s2, i) =>
        i === index ? updated : s2
      )
    )
  }

  function deleteStep(index: number) {
    setSteps((s) =>
      s.filter((_, i) => i !== index)
    )
  }

  function reset() {
    setSteps([])
    setPaceInput('')
    setWorkoutType('easy')
  }

function calculateTotals() {
  let totalKm = 0
  let totalMin = 0

  function getAveragePaceFromStep(
    step: WorkoutStep
  ) {
    if (
      step.target_type !== 'pace' ||
      !step.target_from
    ) {
      return null
    }

    const from = paceToDecimal(
      step.target_from
    )

    const to = step.target_to
      ? paceToDecimal(step.target_to)
      : from

    if (!from || !to) {
      return null
    }

    // média do range
    return (from + to) / 2
  }

  function processStep(
    step: WorkoutStep,
    multiplier = 1
  ) {
    // REPETIÇÃO
    if (step.type === 'repeat') {
      const reps = step.repeat_count || 1

      ;(step.repeat_steps || []).forEach(
        (s) =>
          processStep(
            s,
            multiplier * reps
          )
      )

      return
    }

    const value = parseFloat(
      step.duration_value || '0'
    )

    if (!value) return

    const avgPace =
      getAveragePaceFromStep(step)

    // DISTÂNCIA DEFINIDA
    if (
      step.duration_type === 'distance'
    ) {
      totalKm += value * multiplier

      // calcula tempo pelo pace
      if (avgPace) {
        totalMin +=
          value *
          avgPace *
          multiplier
      }
    }

    // TEMPO DEFINIDO
    if (step.duration_type === 'time') {
      totalMin += value * multiplier

      // calcula km pelo pace
      if (avgPace) {
        totalKm +=
          (value / avgPace) *
          multiplier
      }
    }
  }

  steps.forEach((step) =>
    processStep(step)
  )

  return {
    totalKm:
      Math.round(totalKm * 100) / 100,

    totalMin:
      Math.round(totalMin),
  }
}
  async function handleSubmit(
    e: React.FormEvent<HTMLFormElement>
  ) {
    e.preventDefault()

    setIsLoading(true)

    const formData = new FormData(
      e.currentTarget
    )

    const { totalKm, totalMin } = calculateTotals()

    const averagePace = calculateAveragePace(
      totalKm,
      totalMin
    )

    const paceDecimal = paceInput
      ? paceToDecimal(paceInput)
      : null

    if (paceInput && paceDecimal === null) {
      toast.error(
        'Pace inválido. Use MM:SS'
      )

      setIsLoading(false)

      return
    }

    const data = {
      student_id: studentId,

      title: formData.get('title') as string,

      description:
        (formData.get(
          'description'
        ) as string) || null,

      scheduled_date:
        formData.get(
          'scheduled_date'
        ) as string,

      workout_type: workoutType,

      target_distance_km:
        totalKm > 0
          ? Math.round(totalKm * 100) / 100
          : null,

      target_duration_minutes:
        totalMin > 0
          ? Math.round(totalMin)
          : null,

      target_pace_min_km:
        paceDecimal,

      notes:
        (formData.get('notes') as string) ||
        null,

      steps:
        steps.length > 0
          ? steps
          : null,
    }

    try {
      const res = await fetch(
        '/api/workouts',
        {
          method: 'POST',

          headers: {
            'Content-Type':
              'application/json',
          },

          body: JSON.stringify(data),
        }
      )

      const result = await res.json()

      if (!res.ok) {
        throw new Error(
          result.error ||
            'Erro ao criar treino'
        )
      }

      toast.success(
        'Treino criado com sucesso!'
      )

      onSuccess()

      onOpenChange(false)

      reset()
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : 'Erro ao criar treino'
      )
    } finally {
      setIsLoading(false)
    }
  }

  const { totalKm, totalMin } =
    calculateTotals()

  const averagePace =
    calculateAveragePace(
      totalKm,
      totalMin
    )

  return (
    <Dialog
      open={open}
      onOpenChange={(open) => {
        onOpenChange(open)

        if (!open) {
          reset()
        }
      }}
    >
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            Criar Novo Treino
          </DialogTitle>

          <DialogDescription>
            Defina os detalhes e a estrutura
            do treino.
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={handleSubmit}
          className="space-y-5"
        >
          {/* TITLE */}

          <div className="space-y-2">
            <Label htmlFor="title">
              Título
            </Label>

            <Input
              id="title"
              name="title"
              required
              placeholder="Ex: Intervalado 6x800m"
            />
          </div>

          {/* DATE + TYPE */}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="scheduled_date">
                Data
              </Label>

              <Input
                id="scheduled_date"
                name="scheduled_date"
                type="date"
                required
                defaultValue={format(
                  new Date(),
                  'yyyy-MM-dd'
                )}
              />
            </div>

            <div className="space-y-2">
              <Label>Tipo</Label>

              <Select
                value={workoutType}
                onValueChange={
                  setWorkoutType
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>

                <SelectContent>
                  {workoutTypes.map((t) => (
                    <SelectItem
                      key={t.value}
                      value={t.value}
                    >
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* DESCRIPTION */}

          <div className="space-y-2">
            <Label htmlFor="description">
              Descrição
            </Label>

            <Textarea
              id="description"
              name="description"
              rows={2}
            />
          </div>

          {/* GLOBAL */}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>
                Pace alvo geral
              </Label>

              <Input
                value={
                  averagePace
                    ? (() => {
                        const slower = averagePace * 1.033
                        const faster = averagePace * 0.967

                        return `${paceDecimalToString(slower)} - ${paceDecimalToString(faster)}`
                      })()
                    : ''
                }
                readOnly
                className="font-medium bg-muted"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">
                Observações
              </Label>

              <Input
                id="notes"
                name="notes"
              />
            </div>
          </div>

          {/* STEPS */}

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>
                Estrutura do treino
              </Label>

              {steps.length > 0 && (
                <span className="text-xs text-muted-foreground">
                  {totalKm > 0 &&
                    `${totalKm.toFixed(
                      1
                    )} km`}

                  {totalKm > 0 &&
                    totalMin > 0 &&
                    ' · '}

                  {totalMin > 0 &&
                    `${Math.round(
                      totalMin
                    )} min`}
                </span>
              )}
            </div>

            {steps.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4 border border-dashed rounded-lg">
                Adicione passos ao treino
              </p>
            )}

            <div className="space-y-2">
              {steps.map((step, i) => (
                <StepEditor
                  key={step.id}
                  step={step}
                  student={student}
                  onChange={(updated) =>
                    updateStep(i, updated)
                  }
                  onDelete={() =>
                    deleteStep(i)
                  }
                />
              ))}
            </div>

            {/* ADD BUTTONS */}

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
                  onClick={() =>
                    addStep(type)
                  }
                >
                  <Plus className="h-3 w-3 mr-1" />

                  {
                    stepTypeConfig[type]
                      .label
                  }
                </Button>
              ))}
            </div>
          </div>

          {/* ACTIONS */}

          <div className="
            flex
            flex-col
            sm:flex-row
            justify-end
            gap-2
            pt-4
            w-full
          ">
            <Button
              type="button"
              variant="outline"
              className="w-full sm:w-auto"
              onClick={reset}
              disabled={isLoading}
            >
              <RefreshCw className="h-4 w-4 mr-2" />

              Limpar
            </Button>

            <div className="flex gap-2 justify-between">
              <Button
                type="button"
                variant="outline"
                className='px-8'
                onClick={() =>
                  onOpenChange(false)
                }
              >
                Cancelar
              </Button>

              <Button
                type="submit"
                className='px-8'
                disabled={isLoading}
              >
                {isLoading
                  ? 'Criando...'
                  : 'Criar Treino'}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}