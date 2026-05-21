'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { TrendingUp, Target } from 'lucide-react'
import type { Workout, WorkoutLog } from '@/lib/db'
import { startOfWeek, endOfWeek, isWithinInterval } from 'date-fns'
import { formatDistance } from '@/lib/format-distance'

interface WeeklyVolumeCardProps {
  workouts: Workout[]
  logs: WorkoutLog[]
}

export function WeeklyVolumeCard({ workouts, logs }: WeeklyVolumeCardProps) {
  // Calcular início e fim da semana (domingo a sábado)
  const now = new Date()
  const weekStart = startOfWeek(now, { weekStartsOn: 0 })
  const weekEnd = endOfWeek(now, { weekStartsOn: 0 })

  // Volume planejado (soma dos treinos da semana)
  const plannedVolume = Number(
    workouts
      .filter(w => {
        const workoutDate = new Date(w.scheduled_date)
        return isWithinInterval(workoutDate, { start: weekStart, end: weekEnd })
      })
      .reduce((sum, w) => sum + (Number(w.target_distance_km) || 0), 0)
  ) || 0

  // Volume realizado (soma dos logs da semana)
  const completedVolume = Number(
    logs
      .filter(l => {
        const logDate = new Date(l.completed_at)
        return isWithinInterval(logDate, { start: weekStart, end: weekEnd })
      })
      .reduce((sum, l) => sum + (Number(l.actual_distance_km) || 0), 0)
  ) || 0

  // Calcular percentual
  const percentage = plannedVolume > 0 
    ? Math.min((completedVolume / plannedVolume) * 100, 100)
    : 0

  // Determinar cor baseada no progresso
  const getProgressColor = () => {
    if (percentage >= 100) return 'text-green-500'
    if (percentage >= 75) return 'text-blue-500'
    if (percentage >= 50) return 'text-yellow-500'
    return 'text-orange-500'
  }

  return (
    <Card className="border-accent/20 bg-gradient-to-br from-accent/5 to-transparent backdrop-blur">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-white">
          <TrendingUp className="h-5 w-5 text-accent" />
          Volume Semanal
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between gap-6">
          {/* Círculo de Progresso */}
          <div className="relative flex items-center justify-center">
            <svg className="transform -rotate-90" width="120" height="120">
              {/* Círculo de fundo */}
              <circle
                cx="60"
                cy="60"
                r="50"
                stroke="currentColor"
                strokeWidth="10"
                fill="none"
                className="text-muted/20"
              />
              {/* Círculo de progresso */}
              <circle
                cx="60"
                cy="60"
                r="50"
                stroke="currentColor"
                strokeWidth="10"
                fill="none"
                strokeDasharray={`${2 * Math.PI * 50}`}
                strokeDashoffset={`${2 * Math.PI * 50 * (1 - percentage / 100)}`}
                className={`${getProgressColor()} transition-all duration-500`}
                strokeLinecap="round"
              />
            </svg>
            {/* Percentual no centro */}
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className={`text-3xl font-bold ${getProgressColor()}`}>
                {percentage.toFixed(0)}%
              </span>
            </div>
          </div>

          {/* Informações */}
          <div className="flex-1 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                Realizado
              </span>
              <span className="text-lg font-bold text-white">
                {formatDistance(completedVolume)}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground flex items-center gap-1">
                <Target className="h-3 w-3" />
                Meta
              </span>
              <span className="text-lg font-semibold text-muted-foreground">
                {formatDistance(plannedVolume)}
              </span>
            </div>

            <div className="pt-2 border-t border-accent/20">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  Faltam
                </span>
                <span className={`text-base font-semibold ${
                  completedVolume >= plannedVolume
                    ? 'text-green-500'
                    : 'text-accent'
                }`}>
                  {completedVolume >= plannedVolume
                    ? '✓ Meta atingida!'
                    : formatDistance(plannedVolume - completedVolume)
                  }
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Mensagem motivacional */}
        {percentage >= 100 && (
          <div className="mt-4 p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
            <p className="text-sm text-green-500 text-center font-medium">
              🎉 Parabéns! Você atingiu sua meta semanal!
            </p>
          </div>
        )}
        
        {percentage >= 75 && percentage < 100 && (
          <div className="mt-4 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
            <p className="text-sm text-blue-500 text-center font-medium">
              💪 Quase lá! Continue assim!
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// Made with Bob
