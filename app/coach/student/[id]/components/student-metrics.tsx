'use client'

import { useMemo } from 'react'
import {
  format,
  subMonths,
  startOfMonth,
  endOfMonth,
  eachMonthOfInterval,
  subDays,
  eachWeekOfInterval,
  endOfWeek,
} from 'date-fns'
import { ptBR } from 'date-fns/locale'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  Legend,
} from 'recharts'

import { TrendingUp, TrendingDown, Minus } from 'lucide-react'

import type { Student, WorkoutLog } from '@/lib/db'

type StudentMetricsProps = {
  logs: (WorkoutLog & {
    workout_title: string
    workout_type: string
  })[]

  student: Student & {
    test_3km_time?: string | null
    test_3km_pace_min_km?: number | null
    resting_heart_rate?: number | null
    max_heart_rate?: number | null
    birth_date?: string | null
  }
}

type Zone = {
  name: string
  label: string
  description: string
  color: string
  paceMin: string
  paceMax: string
  fcMin: number
  fcMax: number
}

function decimalToTime(decimal: number) {
  const min = Math.floor(decimal)
  const sec = Math.round((decimal % 1) * 60)

  return `${min}'${sec.toString().padStart(2, '0')}"`
}

function formatPace(pace: number | null) {
  if (!pace) return '-'

  const min = Math.floor(pace)
  const sec = Math.round((pace % 1) * 60)

  return `${min}'${sec.toString().padStart(2, '0')}"/km`
}

function calculateTrainingZones(
  testPace: number,
  fcmax: number,
  fcRepouso: number
): Zone[] {
  const fcReserva = fcmax - fcRepouso

  return [
    {
      name: 'Z1',
      label: 'Recuperação',
      description: 'Regeneração ativa',
      color: 'bg-blue-500',
      paceMin: decimalToTime(testPace * 1.25),
      paceMax: decimalToTime(testPace * 1.15),
      fcMin: Math.round(fcRepouso + fcReserva * 0.5),
      fcMax: Math.round(fcRepouso + fcReserva * 0.6),
    },
    {
      name: 'Z2',
      label: 'Base',
      description: 'Base aeróbica',
      color: 'bg-green-500',
      paceMin: decimalToTime(testPace * 1.15),
      paceMax: decimalToTime(testPace * 1.07),
      fcMin: Math.round(fcRepouso + fcReserva * 0.6),
      fcMax: Math.round(fcRepouso + fcReserva * 0.7),
    },
    {
      name: 'Z3',
      label: 'Limiar',
      description: 'Tempo run',
      color: 'bg-yellow-500',
      paceMin: decimalToTime(testPace * 1.07),
      paceMax: decimalToTime(testPace),
      fcMin: Math.round(fcRepouso + fcReserva * 0.7),
      fcMax: Math.round(fcRepouso + fcReserva * 0.8),
    },
    {
      name: 'Z4',
      label: 'Intervalado',
      description: 'Alta intensidade',
      color: 'bg-orange-500',
      paceMin: decimalToTime(testPace),
      paceMax: decimalToTime(testPace * 0.95),
      fcMin: Math.round(fcRepouso + fcReserva * 0.8),
      fcMax: Math.round(fcRepouso + fcReserva * 0.9),
    },
    {
      name: 'Z5',
      label: 'Máximo',
      description: 'VO2 máximo',
      color: 'bg-red-500',
      paceMin: decimalToTime(testPace * 0.95),
      paceMax: decimalToTime(testPace * 0.88),
      fcMin: Math.round(fcRepouso + fcReserva * 0.9),
      fcMax: fcmax,
    },
  ]
}

export function StudentMetrics({
  logs,
  student,
}: StudentMetricsProps) {
  const today = new Date()

  const age = student.birth_date
    ? today.getFullYear() - new Date(student.birth_date).getFullYear()
    : null

  const fcmax =
    student.max_heart_rate || (age ? 220 - age : null)

  const fcRepouso = student.resting_heart_rate || 60

  const testPace = student.test_3km_pace_min_km
    ? Number(student.test_3km_pace_min_km)
    : null

  const zones = useMemo(() => {
    if (!testPace || !fcmax) return null

    return calculateTrainingZones(
      testPace,
      fcmax,
      fcRepouso
    )
  }, [testPace, fcmax, fcRepouso])

  const weeklyData = useMemo(() => {
    const weeks = eachWeekOfInterval(
      {
        start: subDays(today, 56),
        end: today,
      },
      {
        weekStartsOn: 1,
      }
    )

    return weeks.map((weekStart) => {
      const weekEnd = endOfWeek(weekStart, {
        weekStartsOn: 1,
      })

      const weekLogs = logs.filter((l) => {
        const d = new Date(l.completed_at)

        return d >= weekStart && d <= weekEnd
      })

      return {
        semana: format(weekStart, 'd/MM', {
          locale: ptBR,
        }),

        km: Number(
          weekLogs
            .reduce(
              (acc, l) =>
                acc + (Number(l.actual_distance_km) || 0),
              0
            )
            .toFixed(1)
        ),
      }
    })
  }, [logs])

  const monthlyData = useMemo(() => {
    const sixMonthsAgo = subMonths(today, 5)

    const months = eachMonthOfInterval({
      start: startOfMonth(sixMonthsAgo),
      end: endOfMonth(today),
    })

    return months.map((month) => {
      const monthLogs = logs.filter((log) => {
        const date = new Date(log.completed_at)

        return (
          date >= startOfMonth(month) &&
          date <= endOfMonth(month)
        )
      })

      const totalKm = monthLogs.reduce(
        (sum, log) =>
          sum + (Number(log.actual_distance_km) || 0),
        0
      )

      const totalDuration = monthLogs.reduce(
        (sum, log) =>
          sum +
          (Number(log.actual_duration_minutes) || 0),
        0
      )

      return {
        month: format(month, 'MMM', {
          locale: ptBR,
        }),

        km: Number(totalKm.toFixed(1)),

        pace:
          totalKm > 0
            ? Number((totalDuration / totalKm).toFixed(2))
            : null,
      }
    })
  }, [logs, today])

  return (
    <div className="space-y-6">
      {zones && (
        <Card>
          <CardHeader>
            <CardTitle>Zonas de treino</CardTitle>
          </CardHeader>

          <CardContent className="space-y-3">
            {zones.map((zone) => (
              <div
                key={zone.name}
                className="flex items-center gap-4"
              >
                <div
                  className={`w-10 h-10 rounded-lg ${zone.color} flex items-center justify-center text-white font-bold`}
                >
                  {zone.name}
                </div>

                <div>
                  <p className="font-medium">
                    {zone.label}
                  </p>

                  <p className="text-sm text-muted-foreground">
                    Pace: {zone.paceMax} - {zone.paceMin}
                  </p>

                  <p className="text-sm text-muted-foreground">
                    FC: {zone.fcMin} - {zone.fcMax}
                  </p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Volume semanal</CardTitle>
        </CardHeader>

        <CardContent>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={weeklyData}>
              <CartesianGrid strokeDasharray="3 3" />

              <XAxis dataKey="semana" />

              <YAxis />

              <Tooltip />

              <Bar
                dataKey="km"
                fill="hsl(var(--accent))"
              />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
  <CardHeader>
    <CardTitle>Métricas de Treinamento</CardTitle>
    <CardDescription>
      Zonas de pace calculadas automaticamente
    </CardDescription>
  </CardHeader>

  <CardContent>
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b">
            <th className="text-left py-2">Zona</th>
            <th className="text-left py-2">Pace</th>
            <th className="text-left py-2">Objetivo</th>
          </tr>
        </thead>

        <tbody>
          <tr className="border-b">
            <td className="py-2 font-medium">Z1</td>
            <td>
              {formatPace(student.z1_min)} até {formatPace(student.z1_max)}
            </td>
            <td>Recuperação</td>
          </tr>

          <tr className="border-b">
            <td className="py-2 font-medium">Z2</td>
            <td>
              {formatPace(student.z2_min)} até {formatPace(student.z2_max)}
            </td>
            <td>Resistência leve</td>
          </tr>

          <tr className="border-b">
            <td className="py-2 font-medium">Z3</td>
            <td>
              {formatPace(student.z3_min)} até {formatPace(student.z3_max)}
            </td>
            <td>Moderado</td>
          </tr>

          <tr className="border-b">
            <td className="py-2 font-medium">Z4</td>
            <td>
              {formatPace(student.z4_min)} até {formatPace(student.z4_max)}
            </td>
            <td>Limiar</td>
          </tr>

          <tr>
            <td className="py-2 font-medium">Z5</td>
            <td>
              {formatPace(student.z5_min)} até {formatPace(student.z5_max)}
            </td>
            <td>VO2 Máx</td>
          </tr>
        </tbody>
      </table>
    </div>
  </CardContent>
</Card>

      <Card>
        <CardHeader>
          <CardTitle>Evolução do pace</CardTitle>
        </CardHeader>

        <CardContent>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" />

              <XAxis dataKey="month" />

              <YAxis />

              <Tooltip
                formatter={(value: number) => [
                  formatPace(value),
                ]}
              />

              <Line
                type="monotone"
                dataKey="pace"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  )
}