'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { WorkoutStep, Student } from '@/lib/db'
import { formatPace } from '@/lib/format-pace'
import { formatDistance } from '@/lib/format-distance'

interface WorkoutStepsDisplayProps {
  steps: WorkoutStep[]
  student: Student
}

export function WorkoutStepsDisplay({ steps, student }: WorkoutStepsDisplayProps) {
  // Função para obter a zona do aluno
  const getStudentZone = (zone: string): string => {
    if (!zone.startsWith('z')) return zone
    
    const zoneNum = zone.substring(1)
    const minKey = `z${zoneNum}_min` as keyof Student
    const maxKey = `z${zoneNum}_max` as keyof Student
    
    const min = student[minKey]
    const max = student[maxKey]
    
    if (min && max) {
      return `${formatPace(Number(min))} - ${formatPace(Number(max))}`
    }
    return zone.toUpperCase()
  }

  // Função para renderizar um step
  const renderStep = (step: WorkoutStep, index: number, isNested = false) => {
    const stepTypeLabels = {
      warmup: 'Aquecimento',
      run: 'Corrida',
      recovery: 'Recuperação',
      cooldown: 'Desaquecimento',
      repeat: 'Intervalado'
    }

    const stepTypeColors = {
      warmup: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
      run: 'bg-red-500/10 text-red-500 border-red-500/20',
      recovery: 'bg-green-500/10 text-green-500 border-green-500/20',
      cooldown: 'bg-purple-500/10 text-purple-500 border-purple-500/20',
      repeat: 'bg-orange-500/10 text-orange-500 border-orange-500/20'
    }

    return (
      <div key={step.id} className={isNested ? 'ml-6' : ''}>
        <div className="flex items-start gap-3 mb-3">
          <Badge className={stepTypeColors[step.type]}>
            {stepTypeLabels[step.type]}
          </Badge>
          
          <div className="flex-1">
            {/* Duração */}
            {step.duration_type === 'distance' && step.duration_value && (
              <span className="text-white font-medium">
                {formatDistance(Number(step.duration_value))}
              </span>
            )}
            {step.duration_type === 'time' && step.duration_value && (
              <span className="text-white font-medium">
                {step.duration_value}min
              </span>
            )}
            {step.duration_type === 'open' && (
              <span className="text-white font-medium">
                Duração livre
              </span>
            )}
            
            {/* Zona/Pace alvo */}
            {step.target_type === 'pace' && step.target_from && (
              <span className="text-muted-foreground ml-2">
                em {getStudentZone(step.target_from)}
                {step.target_from !== step.target_to && ` - ${getStudentZone(step.target_to)}`}
              </span>
            )}
            
            {/* Descrição adicional */}
            {step.description && step.type !== 'repeat' && (
              <p className="text-sm text-muted-foreground mt-1">
                {step.description}
              </p>
            )}
          </div>
        </div>
        
        {/* Steps de repetição */}
        {step.type === 'repeat' && step.repeat_steps && (
          <div className="ml-6 mb-3">
            <p className="text-sm text-muted-foreground mb-2">
              Repetir {step.repeat_count}x:
            </p>
            {step.repeat_steps.map((repeatStep, idx) => 
              renderStep(repeatStep, idx, true)
            )}
          </div>
        )}
      </div>
    )
  }

  if (!steps || steps.length === 0) {
    return null
  }

  return (
    <Card className="mt-4 border-accent/20 bg-white/5 backdrop-blur">
      <CardContent className="pt-6">
        <h4 className="text-sm font-semibold text-white mb-4">
          Estrutura do Treino
        </h4>
        <div className="space-y-2">
          {steps.map((step, index) => renderStep(step, index))}
        </div>
      </CardContent>
    </Card>
  )
}
