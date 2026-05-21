
# Notificações Push para Celular

## 🎯 Objetivo
Enviar notificações push para o celular do atleta quando um novo treino for criado ou quando houver lembretes importantes.

---

## 📱 Opções de Implementação

### Opção 1: Firebase Cloud Messaging (FCM) - ⭐ RECOMENDADO

**Por que FCM?**
- ✅ Grátis e ilimitado
- ✅ Funciona em Android e iOS
- ✅ Funciona em PWA (Progressive Web App)
- ✅ Fácil integração com Next.js
- ✅ Suporte oficial do Google
- ✅ Não precisa de app nativo

**Como funciona:**
1. Usuário permite notificações no navegador/PWA
2. Sistema registra token FCM do dispositivo
3. Backend envia notificação via FCM
4. Usuário recebe no celular (mesmo com app fechado)

---

### Opção 2: OneSignal

**Características:**
- ✅ Plano gratuito (até 10k usuários)
- ✅ Interface amigável
- ✅ Suporte a segmentação
- ✅ Analytics integrado
- ⚠️ Limitações no plano gratuito

---

### Opção 3: Pusher Beams

**Características:**
- ✅ Fácil de usar
- ✅ Boa documentação
- ⚠️ Plano gratuito limitado
- ⚠️ Mais caro que FCM

---

## 🚀 Implementação com Firebase Cloud Messaging (FCM)

### Passo 1: Configurar Firebase

#### 1.1 Criar Projeto Firebase
1. Acesse [Firebase Console](https://console.firebase.google.com/)
2. Clique em "Adicionar projeto"
3. Nomeie o projeto (ex: "lsilvaa-run")
4. Desabilite Google Analytics (opcional)
5. Clique em "Criar projeto"

#### 1.2 Adicionar App Web
1. No projeto, clique no ícone Web (</>)
2. Registre o app (ex: "lsilvaa-run-web")
3. Copie as credenciais do Firebase

#### 1.3 Gerar Chave Privada
1. Vá em "Configurações do projeto" (⚙️)
2. Aba "Contas de serviço"
3. Clique em "Gerar nova chave privada"
4. Salve o arquivo JSON

---

### Passo 2: Instalar Dependências

```bash
npm install firebase firebase-admin
```

---

### Passo 3: Configurar Firebase no Frontend

#### 3.1 Criar arquivo de configuração

```typescript
// lib/firebase-config.ts

import { initializeApp, getApps } from 'firebase/app'
import { getMessaging, getToken, onMessage } from 'firebase/messaging'

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
}

// Inicializar Firebase
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0]

// Obter instância do Messaging (apenas no cliente)
export const getMessagingInstance = () => {
  if (typeof window !== 'undefined') {
    return getMessaging(app)
  }
  return null
}

export { getToken, onMessage }
```

#### 3.2 Adicionar variáveis de ambiente

```env
# .env.local

# Firebase Config
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSy...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=lsilvaa-run.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=lsilvaa-run
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=lsilvaa-run.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789:web:abc123
NEXT_PUBLIC_FIREBASE_VAPID_KEY=BNxxx... (Web Push certificate)

# Firebase Admin (backend)
FIREBASE_PROJECT_ID=lsilvaa-run
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxx@lsilvaa-run.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

---

### Passo 4: Criar Service Worker

```javascript
// public/firebase-messaging-sw.js

importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js')
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js')

firebase.initializeApp({
  apiKey: "AIzaSy...",
  authDomain: "lsilvaa-run.firebaseapp.com",
  projectId: "lsilvaa-run",
  storageBucket: "lsilvaa-run.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abc123"
})

const messaging = firebase.messaging()

// Lidar com notificações em background
messaging.onBackgroundMessage((payload) => {
  console.log('Received background message:', payload)
  
  const notificationTitle = payload.notification.title
  const notificationOptions = {
    body: payload.notification.body,
    icon: '/icon-192x192.png',
    badge: '/badge-72x72.png',
    data: payload.data
  }

  self.registration.showNotification(notificationTitle, notificationOptions)
})

// Lidar com clique na notificação
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  
  // Abrir URL específica
  if (event.notification.data?.url) {
    event.waitUntil(
      clients.openWindow(event.notification.data.url)
    )
  }
})
```

---

### Passo 5: Componente de Permissão de Notificações

```typescript
// app/student/components/notification-permission.tsx

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
```

---

### Passo 6: API para Salvar Token FCM

```typescript
// app/api/student/fcm-token/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { sql } from '@/lib/db'

export async function POST(request: NextRequest) {
  const session = await getSession()
  
  if (!session || session.role !== 'student') {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  try {
    const { token } = await request.json()
    
    if (!token) {
      return NextResponse.json({ error: 'Token não fornecido' }, { status: 400 })
    }

    // Salvar token no banco de dados
    await sql`
      UPDATE students 
      SET fcm_token = ${token}, fcm_token_updated_at = NOW()
      WHERE id = ${session.id}
    `

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Save FCM token error:', error)
    return NextResponse.json(
      { error: 'Erro ao salvar token' },
      { status: 500 }
    )
  }
}
```

---

### Passo 7: Backend - Enviar Notificação

```typescript
// lib/firebase-admin.ts

import admin from 'firebase-admin'

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
  })
}

export const messaging = admin.messaging()

export async function sendPushNotification(
  token: string,
  title: string,
  body: string,
  data?: Record<string, string>
) {
  try {
    const message = {
      notification: {
        title,
        body,
      },
      data: data || {},
      token,
    }

    const response = await messaging.send(message)
    console.log('Successfully sent message:', response)
    return { success: true, messageId: response }
  } catch (error) {
    console.error('Error sending message:', error)
    return { success: false, error }
  }
}
```

---

### Passo 8: Enviar Notificação ao Criar Treino

```typescript
// app/api/workouts/route.ts

import { sendPushNotification } from '@/lib/firebase-admin'

export async function POST(request: NextRequest) {
  // ... código existente de criação do treino ...

  // Após criar o treino
  const result = await sql`
    INSERT INTO workouts (...)
    VALUES (...)
    RETURNING *
  `

  const workout = result[0]

  // Buscar token FCM do aluno
  const student = await sql`
    SELECT fcm_token, name 
    FROM students 
    WHERE id = ${student_id}
  `

  if (student[0]?.fcm_token) {
    // Enviar notificação push
    await sendPushNotification(
      student[0].fcm_token,
      '🏃 Novo Treino Programado!',
      `${workout.title} - ${format(new Date(workout.scheduled_date), 'dd/MM/yyyy')}`,
      {
        workoutId: workout.id.toString(),
        url: `${process.env.NEXT_PUBLIC_URL}/student`,
      }
    )
  }

  return NextResponse.json({ workout })
}
```

---

### Passo 9: Atualizar Banco de Dados

```sql
-- Adicionar no Neon Console

ALTER TABLE students 
ADD COLUMN IF NOT EXISTS fcm_token TEXT,
ADD COLUMN IF NOT EXISTS fcm_token_updated_at TIMESTAMP;
```

---

### Passo 10: Atualizar Tipo Student

```typescript
// lib/db.ts

export type Student = {
  // ... campos existentes
  fcm_token: string | null
  fcm_token_updated_at: Date | null
}
```

---

## 📱 Tipos de Notificações

### 1. Novo Treino Criado
```typescript
{
  title: '🏃 Novo Treino Programado!',
  body: 'Treino Intervalado - 15/01/2024',
  data: {
    type: 'new_workout',
    workoutId: '123',
    url: '/student'
  }
}
```

### 2. Lembrete de Treino
```typescript
{
  title: '⏰ Lembrete de Treino',
  body: 'Seu treino está programado para hoje às 06:00',
  data: {
    type: 'workout_reminder',
    workoutId: '123',
    url: '/student'
  }
}
```

### 3. Meta Semanal Atingida
```typescript
{
  title: '🎉 Parabéns!',
  body: 'Você atingiu sua meta semanal de 50km!',
  data: {
    type: 'goal_achieved',
    url: '/student'
  }
}
```

### 4. Treino Atualizado
```typescript
{
  title: '📝 Treino Atualizado',
  body: 'Seu treinador fez alterações no treino de amanhã',
  data: {
    type: 'workout_updated',
    workoutId: '123',
    url: '/student'
  }
}
```

---

## 🔔 Configurar PWA (Progressive Web App)

Para notificações funcionarem melhor, configure o app como PWA:

### 1. Criar manifest.json

```json
// public/manifest.json

{
  "name": "LSilvaa Run",
  "short_name": "LSilvaa",
  "description": "Gestão de treinos de corrida",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#000000",
  "theme_color": "#10b981",
  "icons": [
    {
      "src": "/icon-192x192.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "/icon-512x512.png",
      "sizes": "512x512",
      "type": "image/png"
    }
  ]
}
```

### 2. Adicionar no layout.tsx

```typescript
// app/layout.tsx

export const metadata = {
  manifest: '/manifest.json',
  // ... outros metadados
}
```

---

## ✅ Checklist de Implementação

- [ x] Criar projeto no Firebase Console
- [ x] Instalar dependências (firebase, firebase-admin)
- [ x] Configurar variáveis de ambiente
- [ x] Criar firebase-config.ts
- [ x] Criar firebase-admin.ts
- [x ] Criar service worker (firebase-messaging-sw.js)
- [x ] Adicionar colunas fcm_token no banco de dados
- [x ] Criar componente NotificationPermission
- [x ] Criar API /api/student/fcm-token
- [x ] Integrar envio de notificação ao criar treino
- [ x] Configurar PWA (manifest.json)
- [ x] Testar notificações em diferentes dispositivos
- [ x] Adicionar ícones para notificações

---

