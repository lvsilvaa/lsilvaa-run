'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Bell, BellOff } from 'lucide-react'
import { toast } from 'sonner'
import { getMessagingInstance, getToken, onMessage } from '@/lib/firebase-config'

export function NotificationPermission() {
  const [permission, setPermission] = useState<NotificationPermission>('default')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    // Verificar permissão atual
    if ('Notification' in window) {
      setPermission(Notification.permission)
    }

    // Escutar mensagens em foreground
    const messaging = getMessagingInstance()
    if (messaging) {
      const unsubscribe = onMessage(messaging, (payload) => {
        console.log('Foreground message:', payload)
        
        toast.info(payload.notification?.title || 'Nova notificação', {
          description: payload.notification?.body,
        })
      })

      return () => unsubscribe()
    }
  }, [])

  const requestPermission = async () => {
    setLoading(true)

    try {
      // Verificar suporte
      if (!('Notification' in window)) {
        throw new Error('Notificações não suportadas neste navegador')
      }

      // Solicitar permissão
      const permission = await Notification.requestPermission()
      setPermission(permission)

      if (permission === 'granted') {
        // Obter token FCM
        const messaging = getMessagingInstance()
        if (!messaging) {
          throw new Error('Messaging não disponível')
        }

        const token = await getToken(messaging, {
          vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY,
        })

        // Salvar token no backend
        await fetch('/api/student/fcm-token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token }),
        })

        toast.success('Notificações ativadas com sucesso!')
      } else {
        toast.error('Permissão de notificações negada')
      }
    } catch (error) {
      console.error('Error requesting permission:', error)
      toast.error('Erro ao ativar notificações')
    } finally {
      setLoading(false)
    }
  }

  if (permission === 'granted') {
    return (
      <Card className="border-green-500/20 bg-green-500/5">
        <CardContent className="pt-6">
          <div className="flex items-center gap-3">
            <Bell className="h-5 w-5 text-green-500" />
            <div className="flex-1">
              <p className="text-sm font-medium text-green-500">
                Notificações ativadas
              </p>
              <p className="text-xs text-muted-foreground">
                Você receberá alertas de novos treinos
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (permission === 'denied') {
    return (
      <Card className="border-red-500/20 bg-red-500/5">
        <CardContent className="pt-6">
          <div className="flex items-center gap-3">
            <BellOff className="h-5 w-5 text-red-500" />
            <div className="flex-1">
              <p className="text-sm font-medium text-red-500">
                Notificações bloqueadas
              </p>
              <p className="text-xs text-muted-foreground">
                Ative nas configurações do navegador
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-accent/20 bg-accent/5">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Bell className="h-5 w-5 text-accent" />
          Ativar Notificações
        </CardTitle>
        <CardDescription>
          Receba alertas quando novos treinos forem criados
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button 
          onClick={requestPermission} 
          disabled={loading}
          className="w-full"
        >
          {loading ? 'Ativando...' : 'Ativar Notificações'}
        </Button>
      </CardContent>
    </Card>
  )
}