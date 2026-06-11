'use client'

import { useEffect, useState } from 'react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

import { toast } from 'sonner'

import type { Student } from '@/lib/db'
import { calculateZonesByTest } from '@/lib/calculate-zones'

type TestType = '12min' | '3km' | 'time_trial'

type AddStudentDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
  student?: Student | null
  coachId: number
}

function paceToDecimal(pace: string): number | null {
  const parts = pace.split(':')
  if (parts.length !== 2) return null

  const min = parseInt(parts[0])
  const sec = parseInt(parts[1])

  if (isNaN(min) || isNaN(sec) || sec >= 60) return null

  return Math.round((min + sec / 60) * 100) / 100
}

function decimalToPace(decimal?: number | null) {
  if (decimal === null || decimal === undefined) return ''

  const min = Math.floor(decimal)
  const sec = Math.round((decimal % 1) * 60)

  return `${min}:${sec.toString().padStart(2, '0')}`
}

function formatPaceInput(value: string) {
  const digits = value.replace(/\D/g, '').slice(0, 4)
  if (digits.length <= 2) return digits
  return `${digits.slice(0, 2)}:${digits.slice(2)}`
}

function formatTimeInput(value: string) {
  const digits = value.replace(/\D/g, '').slice(0, 4)
  if (digits.length <= 2) return digits
  return `${digits.slice(0, 2)}:${digits.slice(2)}`
}

function testToPace({
  type,
  time,
  distanceKm,
}: {
  type: TestType
  time: string
  distanceKm?: string
}): number | null {
  const parts = time.split(':')
  if (parts.length !== 2) return null

  const min = parseInt(parts[0])
  const sec = parseInt(parts[1])

  if (isNaN(min) || isNaN(sec) || sec >= 60) return null

  const totalMinutes = min + sec / 60

  if (type === '12min') {
    const distance = Number(distanceKm)
    if (!distance || isNaN(distance)) return null
    return Math.round((12 / distance) * 100) / 100
  }

  if (type === '3km') {
    return Math.round((totalMinutes / 3) * 100) / 100
  }

  const distance = Number(distanceKm)
  if (!distance || isNaN(distance)) return null

  return Math.round((totalMinutes / distance) * 100) / 100
}

export function AddStudentDialog({
  open,
  onOpenChange,
  onSuccess,
  student,
  coachId,
}: AddStudentDialogProps) {
  const [isLoading, setIsLoading] = useState(false)

  const isEditing = !!student

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const [birthDate, setBirthDate] = useState('')
  const [weightKg, setWeightKg] = useState('')
  const [heightCm, setHeightCm] = useState('')
  const [restingHeartRate, setRestingHeartRate] = useState('')

  const [paceInput, setPaceInput] = useState('')
  const [testType, setTestType] = useState<TestType>('3km')
  const [testDistanceKm, setTestDistanceKm] = useState('')
  const [testTimeInput, setTestTimeInput] = useState('')

  useEffect(() => {
    if (student) {
      const currentStudent = student as Student & {
        test_type?: TestType | null
        test_distance_km?: number | null
      }

      setName(student.name || '')
      setEmail(student.email || '')

      setBirthDate(
        student.birth_date
          ? new Date(student.birth_date).toISOString().split('T')[0]
          : ''
      )

      setWeightKg(student.weight_kg ? String(student.weight_kg) : '')
      setHeightCm(student.height_cm ? String(student.height_cm) : '')
      setRestingHeartRate(
        student.resting_heart_rate ? String(student.resting_heart_rate) : ''
      )

      setPaceInput(decimalToPace(student.base_pace_min_km))

      setTestType(currentStudent.test_type || '3km')
      setTestDistanceKm(
        currentStudent.test_distance_km
          ? String(currentStudent.test_distance_km)
          : ''
      )

      setTestTimeInput(student.test_3km_time || '')
    } else {
      setName('')
      setEmail('')
      setPassword('')
      setBirthDate('')
      setWeightKg('')
      setHeightCm('')
      setRestingHeartRate('')
      setPaceInput('')
      setTestType('3km')
      setTestDistanceKm('')
      setTestTimeInput('')
    }
  }, [student, open])

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()

    setIsLoading(true)

    const finalTestTime = testType === '12min' ? '12:00' : testTimeInput

    const paceDecimal = paceInput ? paceToDecimal(paceInput) : null

    const testPaceDecimal = finalTestTime
      ? testToPace({
          type: testType,
          time: finalTestTime,
          distanceKm: testType === '3km' ? '3' : testDistanceKm,
        })
      : null
      const zones = testPaceDecimal
        ? calculateZonesByTest(testType, testPaceDecimal)
        : null

    if (paceInput && paceDecimal === null) {
      toast.error('Pace inválido. Use o formato MM:SS')
      setIsLoading(false)
      return
    }

    if (finalTestTime && testPaceDecimal === null) {
      toast.error(
        testType === '3km'
          ? 'Tempo inválido. Use MM:SS'
          : 'Informe tempo e distância válidos'
      )

      setIsLoading(false)
      return
    }

    const age = birthDate
      ? new Date().getFullYear() - new Date(birthDate).getFullYear()
      : null

    const fcmax = age ? 220 - age : null

    let z1_min = null
    let z1_max = null
    let z2_min = null
    let z2_max = null
    let z3_min = null
    let z3_max = null
    let z4_min = null
    let z4_max = null
    let z5_min = null
    let z5_max = null

    if (testPaceDecimal) {
      z1_min = Number((testPaceDecimal * 1.25).toFixed(2))
      z1_max = Number((testPaceDecimal * 1.15).toFixed(2))

      z2_min = Number((testPaceDecimal * 1.15).toFixed(2))
      z2_max = Number((testPaceDecimal * 1.07).toFixed(2))

      z3_min = Number((testPaceDecimal * 1.07).toFixed(2))
      z3_max = Number((testPaceDecimal * 1.0).toFixed(2))

      z4_min = Number((testPaceDecimal * 1.0).toFixed(2))
      z4_max = Number((testPaceDecimal * 0.95).toFixed(2))

      z5_min = Number((testPaceDecimal * 0.95).toFixed(2))
      z5_max = Number((testPaceDecimal * 0.88).toFixed(2))
    }

    const data = {
      coach_id: coachId,
      name,
      email,

      ...(password && {
        password,
      }),
      
      birth_date: birthDate || null,

      weight_kg: weightKg ? parseFloat(weightKg) : null,
      height_cm: heightCm ? parseInt(heightCm) : null,

      resting_heart_rate: restingHeartRate
        ? parseInt(restingHeartRate)
        : null,

      max_heart_rate: fcmax,

      base_pace_min_km: paceDecimal,

      test_type: testType,

      test_distance_km:
        testType === '3km'
          ? 3
          : testDistanceKm
          ? Number(testDistanceKm)
          : null,

      test_3km_time: finalTestTime || null,
      test_3km_pace_min_km: testPaceDecimal,

      z1_min: zones?.z1_min ?? null,
      z1_max: zones?.z1_max ?? null,
      z2_min: zones?.z2_min ?? null,
      z2_max: zones?.z2_max ?? null,
      z3_min: zones?.z3_min ?? null,
      z3_max: zones?.z3_max ?? null,
      z4_min: zones?.z4_min ?? null,
      z4_max: zones?.z4_max ?? null,
      z5_min: zones?.z5_min ?? null,
      z5_max: zones?.z5_max ?? null,
    }

    try {
      const res = await fetch(
        isEditing ? `/api/students/${student.id}` : '/api/students',
        {
          method: isEditing ? 'PUT' : 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(data),
        }
      )

      const result = await res.json()

      if (!res.ok) {
        throw new Error(result.error || 'Erro ao salvar aluno')
      }

      toast.success(
        isEditing
          ? 'Aluno atualizado com sucesso!'
          : 'Aluno cadastrado com sucesso!'
      )

      onSuccess()
      onOpenChange(false)
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Erro ao salvar aluno'
      )
    } finally {
      setIsLoading(false)
    }
  }

  const previewPace = testToPace({
    type: testType,
    time: testType === '12min' ? '12:00' : testTimeInput,
    distanceKm: testType === '3km' ? '3' : testDistanceKm,
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Editar Aluno' : 'Cadastrar Novo Aluno'}
          </DialogTitle>

          <DialogDescription>
            {isEditing
              ? 'Atualize os dados do aluno.'
              : 'Preencha os dados do aluno para criar a conta.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nome *</Label>

            <Input
              id="name"
              required
              placeholder="Nome completo"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">E-mail *</Label>

            <Input
              id="email"
              type="email"
              required
              placeholder="email@exemplo.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">
              {isEditing ? 'Nova senha' : 'Senha inicial *'}
            </Label>

            <Input
              id="password"
              type="password"
              minLength={6}
              required={!isEditing}
              placeholder={
                isEditing
                  ? 'Deixe vazio para não alterar'
                  : 'Mínimo 6 caracteres'
              }
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="birth_date">Data nascimento</Label>

              <Input
                id="birth_date"
                type="date"
                value={birthDate}
                onChange={(e) => setBirthDate(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="weight_kg">Peso kg</Label>

              <Input
                id="weight_kg"
                type="number"
                step="0.1"
                placeholder="70.5"
                value={weightKg}
                onChange={(e) => setWeightKg(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="height_cm">Altura cm</Label>

              <Input
                id="height_cm"
                type="number"
                placeholder="175"
                value={heightCm}
                onChange={(e) => setHeightCm(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="resting_heart_rate">FC repouso</Label>

              <Input
                id="resting_heart_rate"
                type="number"
                placeholder="60"
                value={restingHeartRate}
                onChange={(e) => setRestingHeartRate(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="base_pace">Pace base</Label>

            <Input
              id="base_pace"
              placeholder="5:30"
              maxLength={5}
              value={paceInput}
              onChange={(e) =>
                setPaceInput(formatPaceInput(e.target.value))
              }
            />
          </div>

          <div className="space-y-3 rounded-xl border p-4">
            <Label>Teste de performance</Label>

            <select
              value={testType}
              onChange={(e) => {
                const value = e.target.value as TestType
                setTestType(value)

                if (value === '12min') {
                  setTestTimeInput('')
                }

                if (value === '3km') {
                  setTestDistanceKm('')
                }
              }}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="12min">Teste de 12&apos;</option>
              <option value="3km">Teste de 3km</option>
              <option value="time_trial">Contrarrelógio</option>
            </select>

            <div
              className={
                testType === '3km'
                  ? 'grid grid-cols-1 gap-4'
                  : 'grid grid-cols-2 gap-4'
              }
            >
              {testType !== '3km' && (
                <div className="space-y-2">
                  <Label>
                    {testType === '12min'
                      ? 'Distância em 12min km'
                      : 'Distância km'}
                  </Label>

                  <Input
                    type="number"
                    step="0.01"
                    placeholder={testType === '12min' ? 'Ex: 2.80' : 'Ex: 5'}
                    value={testDistanceKm}
                    onChange={(e) => setTestDistanceKm(e.target.value)}
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label>
                  {testType === '12min' ? 'Tempo fixo' : 'Tempo realizado'}
                </Label>

                <Input
                  placeholder={testType === '12min' ? '12:00' : '14:32'}
                  maxLength={5}
                  value={testType === '12min' ? '12:00' : testTimeInput}
                  disabled={testType === '12min'}
                  onChange={(e) =>
                    setTestTimeInput(formatTimeInput(e.target.value))
                  }
                />
              </div>
            </div>

            {testType === '12min' && (
              <p className="text-xs text-muted-foreground">
                Informe a distância percorrida em 12 minutos.
              </p>
            )}

            {previewPace && (
              <p className="text-xs text-muted-foreground">
                Pace calculado: {decimalToPace(previewPace)}/km
              </p>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>

            <Button type="submit" disabled={isLoading}>
              {isLoading
                ? isEditing
                  ? 'Salvando...'
                  : 'Cadastrando...'
                : isEditing
                ? 'Salvar alterações'
                : 'Cadastrar'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}