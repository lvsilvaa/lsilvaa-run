'use client'

import { useState } from 'react'
import useSWR from 'swr'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Link2, Link2Off, RefreshCw, Download } from 'lucide-react'
import { toast } from 'sonner'

const fetcher = (url: string) => fetch(url).then(res => res.json())

type StravaActivity = {
  id: string
  name: string
  start_date: string
  distance_km: number
  duration_minutes: number
  pace_min_km: number
  calories: number
  elevation_gain_m: number
}
type StravaIntegrationProps = {
  onImportActivity: (activity: {
    id: string
    name: string
    start_date: string
    distance_km: number
    duration_minutes: number
    pace_min_km: number
    calories: number
    elevation_gain_m: number
  }) => void
}

export function StravaIntegration({ onImportActivity }: StravaIntegrationProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [showActivities, setShowActivities] = useState(false)

  const { data: statusData, mutate: mutateStatus } = useSWR<{ connected: boolean }>(
    '/api/strava/status',
    fetcher
  )

  const { data: activitiesData, isLoading: loadingActivities, mutate: mutateActivities } = useSWR<{ activities: StravaActivity[] }>(
    showActivities && statusData?.connected ? '/api/strava/activities' : null,
    fetcher
  )

  const isConnected = statusData?.connected || false
  const activities = activitiesData?.activities || []

  async function handleConnect() {
    setIsLoading(true)
    window.location.href = '/api/strava/connect'
  }

  async function handleDisconnect() {
    if (!confirm('Deseja desconectar sua conta do Strava?')) return
    
    setIsLoading(true)
    try {
      await fetch('/api/strava/status', { method: 'DELETE' })
      toast.success('Strava desconectado')
      mutateStatus()
    } catch {
      toast.error('Erro ao desconectar Strava')
    } finally {
      setIsLoading(false)
    }
  }

  function formatPace(pace: number) {
    const min = Math.floor(pace)
    const sec = Math.round((pace % 1) * 60)
    return `${min}'${sec.toString().padStart(2, '0')}"/km`
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <svg className="h-6 w-6" viewBox="0 0 24 24" fill="currentColor">
              <path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.598h4.172L10.463 0l-7.14 14.099h4.172" fillRule="evenodd"/>
            </svg>
            <CardTitle className="text-base">Strava</CardTitle>
          </div>
          <Badge variant={isConnected ? 'default' : 'secondary'}>
            {isConnected ? 'Conectado' : 'Desconectado'}
          </Badge>
        </div>
        <CardDescription>
          Importe suas corridas diretamente do Strava
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {!isConnected ? (
          <Button 
            onClick={handleConnect} 
            disabled={isLoading}
            className="w-full"
            variant="outline"
          >
            <Link2 className="mr-2 h-4 w-4" />
            Conectar Strava
          </Button>
        ) : (
          <div className="flex gap-2">
            <Dialog open={showActivities} onOpenChange={setShowActivities}>
              <DialogTrigger asChild>
                <Button variant="outline" className="flex-1">
                  <Download className="mr-2 h-4 w-4" />
                  Importar Atividade
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-lg max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Atividades do Strava</DialogTitle>
                  <DialogDescription>
                    Selecione uma atividade para importar os dados
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-3">
                  {loadingActivities ? (
                    <div className="flex items-center justify-center py-8">
                      <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                  ) : activities.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">
                      Nenhuma atividade encontrada nos últimos 30 dias
                    </p>
                  ) : (
                    activities.map((activity) => (
                  <Card
                    key={activity.id}
                    className="cursor-pointer hover:border-accent transition-colors"
                    onClick={() => {
                      onImportActivity(activity)
                      setShowActivities(false)
                        
                      }}
                  >
                        <CardContent className="p-4">
                          <div className="flex justify-between items-start mb-2">
                            <h4 className="font-medium">{activity.name}</h4>
                            <span className="text-xs text-muted-foreground">
                              {format(new Date(activity.start_date), "d MMM", { locale: ptBR })}
                            </span>
                          </div>
                          <div className="grid grid-cols-3 gap-2 text-sm">
                            <div>
                              <span className="text-muted-foreground">Dist: </span>
                              <span className="font-medium">{activity.distance_km} km</span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Tempo: </span>
                              <span className="font-medium">{activity.duration_minutes} min</span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Pace: </span>
                              <span className="font-medium">{formatPace(activity.pace_min_km)}</span>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  )}
                  <Button 
                    variant="ghost" 
                    className="w-full" 
                    onClick={() => mutateActivities()}
                    disabled={loadingActivities}
                  >
                    <RefreshCw className={`mr-2 h-4 w-4 ${loadingActivities ? 'animate-spin' : ''}`} />
                    Atualizar
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
            <Button 
              variant="ghost" 
              size="icon"
              onClick={handleDisconnect}
              disabled={isLoading}
            >
              <Link2Off className="h-4 w-4" />
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
