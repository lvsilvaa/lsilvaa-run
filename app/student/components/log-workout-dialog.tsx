'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import type { Workout } from '@/lib/db'

type StravaImportData = {
  distance_km: number
  duration_minutes: number
  pace_min_km: number
  calories: number
  elevation_gain_m: number
  strava_id: string
} | null

type LogWorkoutDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  workout: Workout
  studentId: number
  onSuccess: () => void
  stravaImportData?: StravaImportData
}

export function LogWorkoutDialog({ 
  open, 
  onOpenChange, 
  workout, 
  studentId,
  onSuccess,
  stravaImportData
}: LogWorkoutDialogProps) {
  const [isLoading, setIsLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setIsLoading(true)

    const formData = new FormData(e.currentTarget)
    
    const distance = parseFloat(formData.get('distance') as string)
    const duration = parseInt(formData.get('duration') as string)
    const pace = duration / distance

    const data = {
      workout_id: workout.id,
      student_id: studentId,
      actual_distance_km: distance,
      actual_duration_minutes: duration,
      actual_pace_min_km: Math.round(pace * 100) / 100,
      calories_burned: formData.get('calories') ? parseInt(formData.get('calories') as string) : null,
      average_heart_rate: formData.get('heart_rate') ? parseInt(formData.get('heart_rate') as string) : null,
      elevation_gain_m: formData.get('elevation') ? parseInt(formData.get('elevation') as string) : null,
      notes: formData.get('notes') as string || null,
      strava_activity_id: stravaImportData?.strava_id || null,
    }

    try {
      const res = await fetch('/api/student/log-workout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      const result = await res.json()

      if (!res.ok) {
        throw new Error(result.error || 'Erro ao registrar treino')
      }

      toast.success('Treino registrado com sucesso!')
      onSuccess()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao registrar treino')
    } finally {
      setIsLoading(false)
    }
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Registrar Treino</DialogTitle>
          <DialogDescription className="space-y-2">
            <span className="block">{workout.title}</span>
            <Badge variant="secondary">{getWorkoutTypeLabel(workout.workout_type)}</Badge>
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="distance">Distância (km) *</Label>
              <Input 
                id="distance" 
                name="distance" 
                type="number" 
                step="0.01"
                required
                placeholder="5.0"
                defaultValue={stravaImportData?.distance_km || workout.target_distance_km || ''}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="duration">Tempo (min) *</Label>
              <Input 
                id="duration" 
                name="duration" 
                type="number"
                required
                placeholder="30"
                defaultValue={stravaImportData?.duration_minutes || workout.target_duration_minutes || ''}
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="calories">Calorias</Label>
              <Input 
                id="calories" 
                name="calories" 
                type="number"
                placeholder="300"
                defaultValue={stravaImportData?.calories || ''}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="heart_rate">FC média</Label>
              <Input 
                id="heart_rate" 
                name="heart_rate" 
                type="number"
                placeholder="150"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="elevation">Elevação (m)</Label>
              <Input 
                id="elevation" 
                name="elevation" 
                type="number"
                placeholder="50"
                defaultValue={stravaImportData?.elevation_gain_m || ''}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Observações</Label>
            <Textarea 
              id="notes" 
              name="notes" 
              placeholder="Como foi o treino? Sensações, clima..."
              rows={3}
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Salvando...' : 'Registrar'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
