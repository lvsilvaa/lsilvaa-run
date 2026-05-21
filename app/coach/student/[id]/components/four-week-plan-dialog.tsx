'use client'

import { useState, useEffect } from 'react'
import { format, addDays, startOfWeek, addWeeks } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Calendar, Save, X, ChevronLeft, ChevronRight } from 'lucide-react'
import { toast } from 'sonner'

type DayPlan = {
  date: string
  dayOfWeek: string
  workoutType: string
  title: string
  description: string
  targetDistanceKm: string
  targetDurationMin: string
  targetPace: string
  notes: string
}

type WeekPlan = {
  weekNumber: number
  startDate: Date
  days: DayPlan[]
}

type FourWeekPlanDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  studentId: number
  onSuccess: () => void
}

const WORKOUT_TYPES = [
  { value: 'rest', label: 'Descanso' },
  { value: 'easy', label: 'Leve' },
  { value: 'tempo', label: 'Tempo' },
  { value: 'interval', label: 'Intervalado' },
  { value: 'long', label: 'Longão' },
  { value: 'recovery', label: 'Recuperação' },
  { value: 'race', label: 'Prova' },
  { value: 'fartlek', label: 'Fartlek' },
]

const DAY_NAMES = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo']

function createEmptyWeekPlan(weekNumber: number, baseDate: Date): WeekPlan {
  const weekStart = startOfWeek(addWeeks(baseDate, weekNumber - 1), { weekStartsOn: 1 })
  
  const days: DayPlan[] = DAY_NAMES.map((dayName, index) => {
    const date = addDays(weekStart, index)
    return {
      date: format(date, 'yyyy-MM-dd'),
      dayOfWeek: dayName,
      workoutType: 'rest',
      title: '',
      description: '',
      targetDistanceKm: '',
      targetDurationMin: '',
      targetPace: '',
      notes: '',
    }
  })

  return {
    weekNumber,
    startDate: weekStart,
    days,
  }
}

export function FourWeekPlanDialog({ 
  open, 
  onOpenChange, 
  studentId,
  onSuccess 
}: FourWeekPlanDialogProps) {
  const [startDate, setStartDate] = useState<Date>(startOfWeek(new Date(), { weekStartsOn: 1 }))
  const [weeks, setWeeks] = useState<WeekPlan[]>([])
  const [activeWeek, setActiveWeek] = useState(1)
  const [selectedDay, setSelectedDay] = useState<DayPlan | null>(null)
  const [saving, setSaving] = useState(false)
  const [planName, setPlanName] = useState('')

  useEffect(() => {
    if (open) {
      const baseDate = startOfWeek(new Date(), { weekStartsOn: 1 })
      setStartDate(baseDate)
      setWeeks([
        createEmptyWeekPlan(1, baseDate),
        createEmptyWeekPlan(2, baseDate),
        createEmptyWeekPlan(3, baseDate),
        createEmptyWeekPlan(4, baseDate),
      ])
      setActiveWeek(1)
      setSelectedDay(null)
      setPlanName('')
    }
  }, [open])

  function updateDayPlan(weekIndex: number, dayIndex: number, updates: Partial<DayPlan>) {
    setWeeks(prev => {
      const newWeeks = [...prev]
      newWeeks[weekIndex] = {
        ...newWeeks[weekIndex],
        days: newWeeks[weekIndex].days.map((day, idx) => 
          idx === dayIndex ? { ...day, ...updates } : day
        )
      }
      return newWeeks
    })
  }

  function handleDayClick(weekIndex: number, dayIndex: number) {
    setSelectedDay(weeks[weekIndex].days[dayIndex])
  }

  function handleDayUpdate(updates: Partial<DayPlan>) {
    if (!selectedDay) return
    
    const weekIndex = activeWeek - 1
    const dayIndex = weeks[weekIndex].days.findIndex(d => d.date === selectedDay.date)
    
    if (dayIndex !== -1) {
      updateDayPlan(weekIndex, dayIndex, updates)
      setSelectedDay({ ...selectedDay, ...updates })
    }
  }

  async function handleSavePlan() {
    if (!planName.trim()) {
      toast.error('Digite um nome para o plano')
      return
    }

    setSaving(true)
    
    try {
      // Filter only days with actual workouts (not rest days)
      const workoutsToCreate = weeks.flatMap(week => 
        week.days
          .filter(day => day.workoutType !== 'rest' && day.title.trim())
          .map(day => ({
            student_id: studentId,
            title: day.title || `Treino ${day.dayOfWeek}`,
            description: day.description,
            scheduled_date: day.date,
            workout_type: day.workoutType,
            target_distance_km: day.targetDistanceKm ? parseFloat(day.targetDistanceKm) : null,
            target_duration_minutes: day.targetDurationMin ? parseInt(day.targetDurationMin) : null,
            target_pace_min_km: day.targetPace ? parseFloat(day.targetPace) : null,
            notes: day.notes,
          }))
      )

      if (workoutsToCreate.length === 0) {
        toast.error('Adicione pelo menos um treino ao plano')
        setSaving(false)
        return
      }

      // Create all workouts
      for (const workout of workoutsToCreate) {
        const res = await fetch('/api/workouts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(workout),
        })
        
        if (!res.ok) {
          throw new Error('Erro ao criar treino')
        }
      }

      toast.success(`Plano "${planName}" criado com ${workoutsToCreate.length} treinos!`)
      onSuccess()
      onOpenChange(false)
    } catch (error) {
      toast.error('Erro ao salvar o plano')
    } finally {
      setSaving(false)
    }
  }

  function getWorkoutTypeColor(type: string) {
    const colors: Record<string, string> = {
      rest: 'bg-muted text-muted-foreground',
      easy: 'bg-green-500/20 text-green-700 dark:text-green-400',
      tempo: 'bg-orange-500/20 text-orange-700 dark:text-orange-400',
      interval: 'bg-red-500/20 text-red-700 dark:text-red-400',
      long: 'bg-blue-500/20 text-blue-700 dark:text-blue-400',
      recovery: 'bg-teal-500/20 text-teal-700 dark:text-teal-400',
      race: 'bg-purple-500/20 text-purple-700 dark:text-purple-400',
      fartlek: 'bg-yellow-500/20 text-yellow-700 dark:text-yellow-400',
    }
    return colors[type] || 'bg-muted'
  }

  const currentWeek = weeks[activeWeek - 1]

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] p-0">
        <DialogHeader className="p-6 pb-0">
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Plano de 4 Semanas
          </DialogTitle>
          <DialogDescription>
            Monte um plano de treino completo de 4 semanas no estilo MFIT
          </DialogDescription>
        </DialogHeader>

        <div className="px-6 pb-2">
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <Label htmlFor="planName">Nome do Plano</Label>
              <Input
                id="planName"
                placeholder="Ex: Preparação 10km - Fase 1"
                value={planName}
                onChange={(e) => setPlanName(e.target.value)}
              />
            </div>
            <div>
              <Label>Início</Label>
              <p className="text-sm font-medium">
                {format(startDate, "d 'de' MMMM", { locale: ptBR })}
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Week Selector and Calendar */}
          <div className="flex-1 border-r">
            {/* Week Tabs */}
            <div className="flex items-center justify-between px-6 py-2 border-b bg-muted/30">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setActiveWeek(w => Math.max(1, w - 1))}
                disabled={activeWeek === 1}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              
              <Tabs value={activeWeek.toString()} onValueChange={(v) => setActiveWeek(parseInt(v))}>
                <TabsList>
                  <TabsTrigger value="1">Semana 1</TabsTrigger>
                  <TabsTrigger value="2">Semana 2</TabsTrigger>
                  <TabsTrigger value="3">Semana 3</TabsTrigger>
                  <TabsTrigger value="4">Semana 4</TabsTrigger>
                </TabsList>
              </Tabs>
              
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setActiveWeek(w => Math.min(4, w + 1))}
                disabled={activeWeek === 4}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            {/* Week Calendar Grid */}
            <ScrollArea className="h-[400px] p-4">
              {currentWeek && (
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground mb-4">
                    {format(currentWeek.startDate, "d 'de' MMMM", { locale: ptBR })} - {format(addDays(currentWeek.startDate, 6), "d 'de' MMMM", { locale: ptBR })}
                  </p>
                  
                  <div className="grid gap-2">
                    {currentWeek.days.map((day, dayIndex) => (
                      <Card 
                        key={day.date}
                        className={`cursor-pointer transition-all hover:shadow-md ${
                          selectedDay?.date === day.date ? 'ring-2 ring-accent' : ''
                        }`}
                        onClick={() => handleDayClick(activeWeek - 1, dayIndex)}
                      >
                        <CardContent className="p-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="text-center min-w-[60px]">
                                <p className="text-xs text-muted-foreground">{day.dayOfWeek}</p>
                                <p className="font-semibold">{format(new Date(day.date), 'd')}</p>
                              </div>
                              <div className="h-10 w-px bg-border" />
                              <div className="flex-1">
                                {day.workoutType === 'rest' ? (
                                  <p className="text-sm text-muted-foreground">Descanso</p>
                                ) : (
                                  <div>
                                    <p className="font-medium text-sm">{day.title || 'Sem título'}</p>
                                    <div className="flex gap-1 mt-1">
                                      <Badge variant="secondary" className={`text-xs ${getWorkoutTypeColor(day.workoutType)}`}>
                                        {WORKOUT_TYPES.find(t => t.value === day.workoutType)?.label}
                                      </Badge>
                                      {day.targetDistanceKm && (
                                        <Badge variant="outline" className="text-xs">{day.targetDistanceKm} km</Badge>
                                      )}
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}
            </ScrollArea>
          </div>

          {/* Day Editor Panel */}
          <div className="w-[380px] bg-muted/20">
            <div className="p-4 border-b bg-background">
              <h3 className="font-semibold">
                {selectedDay 
                  ? `${selectedDay.dayOfWeek}, ${format(new Date(selectedDay.date), "d 'de' MMMM", { locale: ptBR })}`
                  : 'Selecione um dia'
                }
              </h3>
            </div>

            {selectedDay ? (
              <ScrollArea className="h-[400px]">
                <div className="p-4 space-y-4">
                  <div>
                    <Label>Tipo de Treino</Label>
                    <Select 
                      value={selectedDay.workoutType}
                      onValueChange={(value) => handleDayUpdate({ workoutType: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {WORKOUT_TYPES.map(type => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {selectedDay.workoutType !== 'rest' && (
                    <>
                      <div>
                        <Label>Título do Treino</Label>
                        <Input
                          placeholder="Ex: Intervalado 8x400m"
                          value={selectedDay.title}
                          onChange={(e) => handleDayUpdate({ title: e.target.value })}
                        />
                      </div>

                      <div className="grid grid-cols-3 gap-2">
                        <div>
                          <Label className="text-xs">Distância (km)</Label>
                          <Input
                            type="number"
                            step="0.1"
                            placeholder="5.0"
                            value={selectedDay.targetDistanceKm}
                            onChange={(e) => handleDayUpdate({ targetDistanceKm: e.target.value })}
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Duração (min)</Label>
                          <Input
                            type="number"
                            placeholder="30"
                            value={selectedDay.targetDurationMin}
                            onChange={(e) => handleDayUpdate({ targetDurationMin: e.target.value })}
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Pace (min/km)</Label>
                          <Input
                            type="number"
                            step="0.1"
                            placeholder="5.5"
                            value={selectedDay.targetPace}
                            onChange={(e) => handleDayUpdate({ targetPace: e.target.value })}
                          />
                        </div>
                      </div>

                      <div>
                        <Label>Descrição do Treino</Label>
                        <Textarea
                          placeholder="Descreva o treino em detalhes..."
                          rows={3}
                          value={selectedDay.description}
                          onChange={(e) => handleDayUpdate({ description: e.target.value })}
                        />
                      </div>

                      <div>
                        <Label>Notas/Observações</Label>
                        <Textarea
                          placeholder="Observações adicionais, aquecimento, alongamento..."
                          rows={4}
                          value={selectedDay.notes}
                          onChange={(e) => handleDayUpdate({ notes: e.target.value })}
                        />
                      </div>
                    </>
                  )}
                </div>
              </ScrollArea>
            ) : (
              <div className="flex items-center justify-center h-[400px] text-muted-foreground">
                <p className="text-sm">Clique em um dia para editar</p>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-between items-center p-4 border-t bg-muted/30">
          <div className="text-sm text-muted-foreground">
            {weeks.flatMap(w => w.days.filter(d => d.workoutType !== 'rest' && d.title)).length} treinos configurados
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              <X className="mr-2 h-4 w-4" />
              Cancelar
            </Button>
            <Button onClick={handleSavePlan} disabled={saving}>
              <Save className="mr-2 h-4 w-4" />
              {saving ? 'Salvando...' : 'Salvar Plano'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
