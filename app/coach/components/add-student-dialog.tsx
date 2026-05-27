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

type AddStudentDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
  student?: Student | null
  coachId: number
}

// ===============================
// HELPERS
// ===============================

// "5:30" -> 5.5
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

// 5.5 -> "5:30"
function decimalToPace(decimal?: number | null) {
  if (decimal === null || decimal === undefined) {
    return ''
  }

  const min = Math.floor(decimal)
  const sec = Math.round((decimal % 1) * 60)

  return `${min}:${sec.toString().padStart(2, '0')}`
}

// máscara pace
function formatPaceInput(value: string) {
  const digits = value.replace(/\D/g, '').slice(0, 4)

  if (digits.length <= 2) return digits

  return `${digits.slice(0, 2)}:${digits.slice(2)}`
}

// máscara tempo
function formatTimeInput(value: string) {
  const digits = value.replace(/\D/g, '').slice(0, 4)

  if (digits.length <= 2) return digits

  return `${digits.slice(0, 2)}:${digits.slice(2)}`
}

// tempo 3km -> pace
function testTimeToPace(time: string): number | null {
  const parts = time.split(':')

  if (parts.length !== 2) return null

  const min = parseInt(parts[0])
  const sec = parseInt(parts[1])

  if (isNaN(min) || isNaN(sec) || sec >= 60) {
    return null
  }

  const totalMinutes = min + sec / 60

  return Math.round((totalMinutes / 3) * 100) / 100
}

// ===============================
// COMPONENT
// ===============================

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
  const [restingHeartRate, setRestingHeartRate] =
    useState('')

  const [paceInput, setPaceInput] = useState('')
  const [testTimeInput, setTestTimeInput] =
    useState('')

  // ===============================
  // LOAD STUDENT DATA WHEN EDITING
  // ===============================

  useEffect(() => {
    if (student) {
      setName(student.name || '')
      setEmail(student.email || '')

      setBirthDate(
        student.birth_date
          ? new Date(student.birth_date)
              .toISOString()
              .split('T')[0]
          : ''
      )

      setWeightKg(
        student.weight_kg
          ? String(student.weight_kg)
          : ''
      )

      setHeightCm(
        student.height_cm
          ? String(student.height_cm)
          : ''
      )

      setRestingHeartRate(
        student.resting_heart_rate
          ? String(student.resting_heart_rate)
          : ''
      )

      setPaceInput(
        decimalToPace(student.base_pace_min_km)
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
      setTestTimeInput('')
    }
  }, [student, open])

  // ===============================
  // SUBMIT
  // ===============================

  async function handleSubmit(
    e: React.FormEvent<HTMLFormElement>
  ) {
    e.preventDefault()

    setIsLoading(true)

    const paceDecimal = paceInput
      ? paceToDecimal(paceInput)
      : null

    const testPaceDecimal = testTimeInput
      ? testTimeToPace(testTimeInput)
      : null

    if (paceInput && paceDecimal === null) {
      toast.error(
        'Pace inválido. Use o formato MM:SS'
      )

      setIsLoading(false)
      return
    }

    if (
      testTimeInput &&
      testPaceDecimal === null
    ) {
      toast.error(
        'Tempo do teste inválido. Use MM:SS'
      )

      setIsLoading(false)
      return
    }

    const age = birthDate
      ? new Date().getFullYear() -
        new Date(birthDate).getFullYear()
      : null

    const fcmax = age ? 220 - age : null

    // ===============================
    // ZONAS DE TREINO
    // ===============================

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
      z1_min = Number(
        (testPaceDecimal * 1.25).toFixed(2)
      )

      z1_max = Number(
        (testPaceDecimal * 1.15).toFixed(2)
      )

      z2_min = Number(
        (testPaceDecimal * 1.15).toFixed(2)
      )

      z2_max = Number(
        (testPaceDecimal * 1.07).toFixed(2)
      )

      z3_min = Number(
        (testPaceDecimal * 1.07).toFixed(2)
      )

      z3_max = Number(
        (testPaceDecimal * 1.0).toFixed(2)
      )

      z4_min = Number(
        (testPaceDecimal * 1.0).toFixed(2)
      )

      z4_max = Number(
        (testPaceDecimal * 0.95).toFixed(2)
      )

      z5_min = Number(
        (testPaceDecimal * 0.95).toFixed(2)
      )

      z5_max = Number(
        (testPaceDecimal * 0.88).toFixed(2)
      )
    }

    const data = {
      coach_id: coachId,
      name,
      email,

      ...(password && {
        password,
      }),

      birth_date: birthDate || null,

      weight_kg: weightKg
        ? parseFloat(weightKg)
        : null,

      height_cm: heightCm
        ? parseInt(heightCm)
        : null,

      resting_heart_rate: restingHeartRate
        ? parseInt(restingHeartRate)
        : null,

      max_heart_rate: fcmax,

      base_pace_min_km: paceDecimal,

      test_3km_time: testTimeInput || null,

      test_3km_pace_min_km:
        testPaceDecimal,

      // zonas
      z1_min,
      z1_max,

      z2_min,
      z2_max,

      z3_min,
      z3_max,

      z4_min,
      z4_max,

      z5_min,
      z5_max,
    }

    try {
      const res = await fetch(
        isEditing
          ? `/api/students/${student.id}`
          : '/api/students',
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
        throw new Error(
          result.error ||
            'Erro ao salvar aluno'
        )
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
        error instanceof Error
          ? error.message
          : 'Erro ao salvar aluno'
      )
    } finally {
      setIsLoading(false)
    }
  }

  // ===============================
  // UI
  // ===============================

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isEditing
              ? 'Editar Aluno'
              : 'Cadastrar Novo Aluno'}
          </DialogTitle>

          <DialogDescription>
            {isEditing
              ? 'Atualize os dados do aluno.'
              : 'Preencha os dados do aluno para criar a conta.'}
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={handleSubmit}
          className="space-y-4"
        >
          {/* Nome */}
          <div className="space-y-2">
            <Label htmlFor="name">
              Nome *
            </Label>

            <Input
              id="name"
              required
              placeholder="Nome completo"
              value={name}
              onChange={(e) =>
                setName(e.target.value)
              }
            />
          </div>

          {/* Email */}
          <div className="space-y-2">
            <Label htmlFor="email">
              E-mail *
            </Label>

            <Input
              id="email"
              type="email"
              required
              placeholder="email@exemplo.com"
              value={email}
              onChange={(e) =>
                setEmail(e.target.value)
              }
            />
          </div>

          {/* Senha */}
          <div className="space-y-2">
            <Label htmlFor="password">
              {isEditing
                ? 'Nova senha'
                : 'Senha inicial *'}
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
              onChange={(e) =>
                setPassword(e.target.value)
              }
            />
          </div>

          {/* Dados físicos */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="birth_date">
                Data nascimento
              </Label>

              <Input
                id="birth_date"
                type="date"
                value={birthDate}
                onChange={(e) =>
                  setBirthDate(
                    e.target.value
                  )
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="weight_kg">
                Peso (kg)
              </Label>

              <Input
                id="weight_kg"
                type="number"
                step="0.1"
                placeholder="70.5"
                value={weightKg}
                onChange={(e) =>
                  setWeightKg(
                    e.target.value
                  )
                }
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="height_cm">
                Altura (cm)
              </Label>

              <Input
                id="height_cm"
                type="number"
                placeholder="175"
                value={heightCm}
                onChange={(e) =>
                  setHeightCm(
                    e.target.value
                  )
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="resting_heart_rate">
                FC repouso
              </Label>

              <Input
                id="resting_heart_rate"
                type="number"
                placeholder="60"
                value={restingHeartRate}
                onChange={(e) =>
                  setRestingHeartRate(
                    e.target.value
                  )
                }
              />
            </div>
          </div>

          {/* Pace */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="base_pace">
                Pace base
              </Label>

              <Input
                id="base_pace"
                placeholder="5:30"
                maxLength={5}
                value={paceInput}
                onChange={(e) =>
                  setPaceInput(
                    formatPaceInput(
                      e.target.value
                    )
                  )
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="test_3km">
                Teste 3km
              </Label>

              <Input
                id="test_3km"
                placeholder="14:32"
                maxLength={5}
                value={testTimeInput}
                onChange={(e) =>
                  setTestTimeInput(
                    formatTimeInput(
                      e.target.value
                    )
                  )
                }
              />

              {testTimeInput &&
                testTimeToPace(
                  testTimeInput
                ) && (
                  <p className="text-xs text-muted-foreground">
                    Pace calculado:{' '}
                    {decimalToPace(
                      testTimeToPace(
                        testTimeInput
                      ) || 0
                    )}
                    /km
                  </p>
                )}
            </div>
          </div>

          {/* Buttons */}
          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() =>
                onOpenChange(false)
              }
            >
              Cancelar
            </Button>

            <Button
              type="submit"
              disabled={isLoading}
            >
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