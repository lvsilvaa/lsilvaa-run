'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { toast } from 'sonner'
import type { Workout } from '@/lib/db'

type EditWorkoutDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  workout: Workout
  onSuccess: () => void
}

const workoutTypes = [
  { value: 'easy', label: 'Leve' },
  { value: 'tempo', label: 'Tempo' },
  { value: 'interval', label: 'Intervalado' },
  { value: 'long', label: 'Longão' },
  { value: 'recovery', label: 'Recuperação' },
  { value: 'fartlek', label: 'Fartlek' },
  { value: 'race', label: 'Prova' },
]

export function EditWorkoutDialog({ open, onOpenChange, workout, onSuccess }: EditWorkoutDialogProps) {
  const [isLoading, setIsLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setIsLoading(true)

    const formData = new FormData(e.currentTarget)
    const data = {
      title: formData.get('title') as string,
      description: formData.get('description') as string || null,
      scheduled_date: formData.get('scheduled_date') as string,
      workout_type: formData.get('workout_type') as string,
      target_distance_km: formData.get('target_distance_km') ? parseFloat(formData.get('target_distance_km') as string) : null,
      target_duration_minutes: formData.get('target_duration_minutes') ? parseInt(formData.get('target_duration_minutes') as string) : null,
      target_pace_min_km: formData.get('target_pace_min_km') ? parseFloat(formData.get('target_pace_min_km') as string) : null,
      notes: formData.get('notes') as string || null,
      status: formData.get('status') as string,
    }

    try {
      const res = await fetch(`/api/workouts/${workout.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      const result = await res.json()

      if (!res.ok) {
        throw new Error(result.error || 'Erro ao atualizar treino')
      }

      toast.success('Treino atualizado com sucesso!')
      onSuccess()
      onOpenChange(false)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao atualizar treino')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar Treino</DialogTitle>
          <DialogDescription>
            Atualize os detalhes do treino.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Título do treino *</Label>
            <Input 
              id="title" 
              name="title" 
              required 
              defaultValue={workout.title}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="scheduled_date">Data *</Label>
              <Input 
                id="scheduled_date" 
                name="scheduled_date" 
                type="date" 
                required 
                defaultValue={workout.scheduled_date}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="workout_type">Tipo *</Label>
              <Select name="workout_type" required defaultValue={workout.workout_type}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {workoutTypes.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <Select name="status" defaultValue={workout.status}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">Pendente</SelectItem>
                <SelectItem value="completed">Concluído</SelectItem>
                <SelectItem value="skipped">Pulado</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descrição</Label>
            <Textarea 
              id="description" 
              name="description" 
              defaultValue={workout.description || ''}
              rows={3}
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="target_distance_km">Distância (km)</Label>
              <Input 
                id="target_distance_km" 
                name="target_distance_km" 
                type="number" 
                step="0.1"
                defaultValue={workout.target_distance_km || ''}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="target_duration_minutes">Tempo (min)</Label>
              <Input 
                id="target_duration_minutes" 
                name="target_duration_minutes" 
                type="number"
                defaultValue={workout.target_duration_minutes || ''}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="target_pace_min_km">Pace (min/km)</Label>
              <Input 
                id="target_pace_min_km" 
                name="target_pace_min_km" 
                type="number" 
                step="0.01"
                defaultValue={workout.target_pace_min_km || ''}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Observações</Label>
            <Textarea 
              id="notes" 
              name="notes" 
              defaultValue={workout.notes || ''}
              rows={2}
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Salvando...' : 'Salvar Alterações'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
