'use client'

import useSWR from 'swr'
import { useState } from 'react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {Trophy, Pencil} from 'lucide-react'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

const fetcher = (url: string) =>
  fetch(url).then((res) => res.json())

type RecordItem = {
  distance_label: string
  distance_km: number
  record_seconds: number | null
  source: string | null
}

function secondsToTime(seconds: number | null) {
  if (!seconds) return '-'

  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60

  if (h > 0) {
    return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  }

  return `${m}:${String(s).padStart(2, '0')}`
}

function timeToSeconds(value: string) {
  const parts = value.split(':').map(Number)

  if (parts.some(isNaN)) return null

  if (parts.length === 2) {
    const [m, s] = parts
    return m * 60 + s
  }

  if (parts.length === 3) {
    const [h, m, s] = parts
    return h * 3600 + m * 60 + s
  }

  return null
}

export function PersonalRecordsCard() {
  const { data, mutate } = useSWR<{
    records: RecordItem[]
  }>('/api/student/personal-records', fetcher)

  const [editing, setEditing] = useState<string | null>(null)
  const [time, setTime] = useState('')

  const records = data?.records || []

  async function saveRecord(distanceLabel: string) {
    const seconds = timeToSeconds(time)

    if (!seconds) {
      toast.error('Use o formato MM:SS ou HH:MM:SS')
      return
    }

    try {
      const res = await fetch('/api/student/personal-records', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          distance_label: distanceLabel,
          record_seconds: seconds,
        }),
      })

      if (!res.ok) throw new Error()

      toast.success('RP atualizado!')
      setEditing(null)
      setTime('')
      mutate()
    } catch {
      toast.error('Erro ao salvar RP')
    }
  }

    return (
  <Card className="border-white/10 bg-white/5 backdrop-blur-md">
    <CardHeader className="pb-3">
      <CardTitle className="text-white text-base">
        Recordes Pessoais
      </CardTitle>
    </CardHeader>

    <CardContent>
      <div className="space-y-2">
        {records.map((record) => (
          <div
            key={record.distance_label}
            className="
              flex
              items-center
              justify-between
              gap-3
              rounded-xl
              border
              border-white/10
              bg-white/5
              px-3
              py-2
            "
          >
            <div className="flex items-center gap-3 min-w-0">
              <Trophy className="h-4 w-4 text-yellow-400 shrink-0" />

              <div className="min-w-0">
                <p className="text-sm font-semibold text-white leading-none">
                  {record.distance_label}
                </p>

                <p className="text-xs text-zinc-400 mt-1">
                  {secondsToTime(record.record_seconds)}
                </p>
              </div>
            </div>

            {editing === record.distance_label ? (
              <div className="flex items-center gap-2 shrink-0">
                <Input
                  placeholder="24:30"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  className="h-8 w-24 text-xs"
                />

                <Button
                  size="sm"
                  className="h-8 px-2 text-xs"
                  onClick={() => saveRecord(record.distance_label)}
                >
                  OK
                </Button>
              </div>
            ) : (
              <Button
                size="icon"
                variant="ghost"
                className="
                  h-8
                  w-8
                  shrink-0
                  text-zinc-400
                  hover:text-white
                  hover:bg-white/10
                "
                onClick={() => {
                  setEditing(record.distance_label)
                  setTime(
                    record.record_seconds
                      ? secondsToTime(record.record_seconds)
                      : ''
                  )
                }}
              >
                <Pencil className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        ))}
      </div>
    </CardContent>
  </Card>
)}