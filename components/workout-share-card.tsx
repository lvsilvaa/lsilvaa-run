'use client'

import { useRef } from 'react'
import html2canvas from 'html2canvas'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

import { Button } from '@/components/ui/button'

import {
  Timer,
  Route,
  Calendar,
  Share2,
} from 'lucide-react'

import type { Workout } from '@/lib/db'

type Props = {
  workout: Workout
  athleteName: string
}

export function WorkoutShareCard({
  workout,
  athleteName,
}: Props) {
  const cardRef = useRef<HTMLDivElement>(null)

 function formatPace(pace?: number | null) {
  if (
    pace === null ||
    pace === undefined ||
    isNaN(pace)
  ) {
    return '-'
  }

    const min = Math.floor(pace)
    const sec = Math.round((pace % 1) * 60)

    return `${min}:${sec
      .toString()
      .padStart(2, '0')}/km`
  }

  async function handleShare() {
    if (!cardRef.current) return

    try {
      const canvas = await html2canvas(cardRef.current, {
        backgroundColor: '#0f172a',
        scale: 2,
        useCORS: true,
        logging: false,
      })

      const blob = await new Promise<Blob | null>(
        (resolve) => {
          canvas.toBlob(resolve)
        }
      )

      if (!blob) return

      const file = new File(
        [blob],
        'treino.png',
        {
          type: 'image/png',
        }
      )

      // Compartilhamento mobile
      if (
        navigator.share &&
        navigator.canShare?.({
          files: [file],
        })
      ) {
        try {
          await navigator.share({
            title: workout.title,
            files: [file],
          })

          return
        } catch {}
      }

      // Download fallback
      const url = URL.createObjectURL(blob)

      const a = document.createElement('a')

      a.href = url
      a.download = 'treino.png'
      a.click()

      URL.revokeObjectURL(url)
    } catch (err) {
      console.error(err)
    }
  }

  return (
    <div className="space-y-4">
      <div
        ref={cardRef}
        style={{
          background:
            'linear-gradient(135deg, #000428 0%, #004e92 50%, #001f3f 100%)',
          color: '#ffffff',
          borderRadius: '20px',
          padding: '18px',
          overflow: 'hidden',
          position: 'relative',
          boxShadow:
            '0 25px 50px -12px rgba(0,0,0,0.5)',
        }}
      >
        {/* Glow */}
        <div
          style={{
            position: 'absolute',
            top: '-60px',
            right: '-60px',
            width: '180px',
            height: '160px',
            borderRadius: '9999px',
            background:
              'rgba(34,197,94,0.18)',
            filter: 'blur(45px)',
          }}
        />

        {/* Header */}
        <div
          style={{
            position: 'relative',
            zIndex: 10,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderBottom:
              '1px solid rgba(255,255,255,0.1)',
            paddingBottom: '16px',
            gap: '16px',
          }}
        >
          <div>
            <p
              style={{
                fontSize: '12px',
                textTransform: 'uppercase',
                letterSpacing: '0.2em',
                color: '#4ade80',
              }}
            >
              LSILVA RUN
            </p>

            <h1
              style={{
                marginTop: '4px',
                fontSize: '22px',
                fontWeight: '700',
                lineHeight: 1.1,
              }}
            >
              {workout.title}
            </h1>
          </div>

          <div
            style={{
              background:
                'rgba(255,255,255,0.08)',
              padding: '10px 14px',
              borderRadius: '16px',
              backdropFilter: 'blur(10px)',
              minWidth: '100px',
            }}
          >
            <p
              style={{
                fontSize: '12px',
                color: '#d4d4d8',
              }}
            >
              Atleta
            </p>

            <p
              style={{
                fontWeight: '600',
                marginTop: '2px',
              }}
            >
              {athleteName}
            </p>
          </div>
        </div>

        {/* Date */}
        <div
          style={{
            marginTop: '20px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            color: '#e4e4e7',
            fontSize: '14px',
          }}
        >
          <Calendar
            size={16}
            color="#4ade80"
          />

          <span>
            {format(
              new Date(workout.scheduled_date),
              "EEEE, d 'de' MMMM",
              {
                locale: ptBR,
              }
            )}
          </span>
        </div>

        {/* Metrics */}
        <div
          style={{
            marginTop: '18px',
            display: 'grid',
            gridTemplateColumns:
              'repeat(3, minmax(0, 1fr))',
            gap: '8px',
          }}
        >
          {/* Distância */}
          <div
            style={{
              background:
                'rgba(255,255,255,0.06)',
              border:
                '1px solid rgba(255,255,255,0.1)',
              borderRadius: '14px',
              padding: '12px',
              textAlign: 'center',
              backdropFilter: 'blur(8px)',
            }}
          >
            <Route
              size={20}
              color="#4ade80"
              style={{
                margin: '0 auto 8px',
              }}
            />

            <p
              style={{
                fontSize: '12px',
                color: '#a1a1aa',
              }}
            >
              Distância
            </p>

            <p
              style={{
                fontSize: '16px',
                fontWeight: '700',
                marginTop: '4px',
              }}
            >
              {workout.target_distance_km || '-'} km
            </p>
          </div>

          {/* Pace */}
          <div
            style={{
              background:
                'rgba(255,255,255,0.06)',
              border:
                '1px solid rgba(255,255,255,0.1)',
              borderRadius: '18px',
              padding: '16px',
              textAlign: 'center',
              backdropFilter: 'blur(8px)',
            }}
          >
            <Timer
              size={20}
              color="#4ade80"
              style={{
                margin: '0 auto 8px',
              }}
            />

            <p
              style={{
                fontSize: '12px',
                color: '#a1a1aa',
              }}
            >
              Pace
            </p>

          <p
              style={{
                fontSize: '20px',
                fontWeight: '700',
                marginTop: '4px',
              }}
            >
              {(() => {
                const paceValue =
                  workout.target_pace_min_km ||
                  workout.target_pace_from ||
                  workout.target_pace_to ||
                  workout.steps?.reduce(
                    (lowest: any, step: any) => {
                      const pace =
                        step.target_pace_from ||
                        step.target_from

                      if (!pace) return lowest

                      // se vier string tipo "5:30"
                      if (
                        typeof pace === 'string' &&
                        pace.includes(':')
                      ) {
                        return lowest || pace
                      }

                      // se vier decimal
                      const numericPace = Number(pace)

                      if (isNaN(numericPace)) {
                        return lowest
                      }

                      if (!lowest) {
                        return numericPace
                      }

                      return numericPace < lowest
                        ? numericPace
                        : lowest
                    },
                    null
                  )

                // se já for string pace
                if (
                  typeof paceValue === 'string' &&
                  paceValue.includes(':')
                ) {
                  return `${paceValue}`
                }

                return formatPace(Number(paceValue))
              })()}
            </p>
          </div>

          {/* Duração */}
          <div
            style={{
              background:
                'rgba(255,255,255,0.06)',
              border:
                '1px solid rgba(255,255,255,0.1)',
              borderRadius: '14px',
              padding: '12px',
              textAlign: 'center',
              backdropFilter: 'blur(8px)',
            }}
          >
            <Timer
              size={20}
              color="#4ade80"
              style={{
                margin: '0 auto 8px',
              }}
            />

            <p
              style={{
                fontSize: '12px',
                color: '#a1a1aa',
              }}
            >
              Duração
            </p>

            <p
              style={{
                fontSize: '14px',
                fontWeight: '700',
                marginTop: '4px',
              }}
            >
              {workout.target_duration_minutes ||
                '-'}{' '}
              min
            </p>
          </div>
        </div>

        {/* Description */}
        {workout.description && (
          <div
            style={{
              marginTop: '18px',
              background:
                'rgba(255,255,255,0.06)',
              border:
                '1px solid rgba(255,255,255,0.1)',
              borderRadius: '14px',
              padding: '12px',
              backdropFilter: 'blur(8px)',
            }}
          >
            <p
              style={{
                fontSize: '12px',
                fontWeight: '700',
                color: '#4ade80',
                marginBottom: '8px',
              }}
            >
              DESCRIÇÃO
            </p>

            <p
              style={{
                whiteSpace: 'pre-wrap',
                fontSize: '14px',
                lineHeight: 1.6,
                color: '#f4f4f5',
              }}
            >
              {workout.description}
            </p>
          </div>
        )}

        {/* Footer */}
        <div
          style={{
            marginTop: '20px',
            paddingTop: '12px',
            borderTop:
              '1px solid rgba(255,255,255,0.1)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div>
            <p
              style={{
                fontSize: '12px',
                color: '#71717a',
              }}
            >
              Powered by
            </p>

            <p
              style={{
                fontWeight: '700',
                letterSpacing: '0.15em',
                color: '#4ade80',
              }}
            >
              LSILVA RUN
            </p>
          </div>

          <div
            style={{
              background: '#22c55e',
              color: '#000000',
              borderRadius: '9999px',
              padding: '8px 14px',
              fontWeight: '700',
              fontSize: '12px',
            }}
          >
            BORA TREINAR
          </div>
        </div>
      </div>

      <Button
        onClick={handleShare}
        className="w-full"
      >
        <Share2 className="mr-2 h-4 w-4" />
        Compartilhar Card
      </Button>
    </div>
  )
}