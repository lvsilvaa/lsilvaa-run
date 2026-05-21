# Envio Automático de Treinos para Strava e Garmin

## 🎯 Objetivo
Criar treinos no app e enviá-los automaticamente para o calendário de treinos do Strava e Garmin Connect do atleta.

---

## 📊 Análise de Viabilidade

### Strava - Envio de Treinos Planejados

#### ✅ POSSÍVEL - Strava API v3

**Endpoint disponível:**
```
POST /api/v3/athletes/{id}/activities
```

**O que é possível:**
- ✅ Criar atividades planejadas (workouts)
- ✅ Definir tipo de atividade (corrida, ciclismo, etc.)
- ✅ Definir distância alvo
- ✅ Definir duração alvo
- ✅ Adicionar descrição e notas
- ✅ Definir data/hora do treino

**Limitações:**
- ⚠️ Não suporta estrutura detalhada de intervalos
- ⚠️ Não suporta zonas de treino específicas
- ⚠️ Treino aparece como "planejado" no calendário
- ⚠️ Requer permissão `activity:write` do OAuth

**Exemplo de payload:**
```json
{
  "name": "Treino Intervalado",
  "type": "Run",
  "start_date_local": "2024-01-15T06:00:00Z",
  "elapsed_time": 3600,
  "description": "Aquecimento 10min + 3x1km em Z5 + Desaquecimento 10min",
  "distance": 8500,
  "trainer": false,
  "commute": false
}
```

---

### Garmin - Envio de Treinos Planejados

#### ❌ NÃO POSSÍVEL - API Limitada

**Situação atual:**
- ❌ Garmin não possui API pública para criar treinos
- ❌ Garmin Health API não suporta criação de workouts
- ❌ Apenas leitura de dados de atividades completadas

**Alternativas:**
1. **Garmin Connect IQ** - Requer desenvolvimento de app nativo
2. **TrainingPeaks** - Integração via plataforma terceira
3. **Manual** - Atleta copia treino manualmente

---

## 🔄 Solução Recomendada: Híbrida

### Opção 1: Strava + Notificação (Recomendado)

**Como funciona:**
1. ✅ Treinador cria treino no app
2. ✅ Sistema envia treino para Strava automaticamente
3. ✅ Sistema envia notificação/email para atleta com detalhes
4. ⚠️ Atleta copia treino manualmente para Garmin (se usar)

**Vantagens:**
- ✅ Integração automática com Strava
- ✅ Atleta vê treino no calendário Strava
- ✅ Notificação com detalhes completos
- ✅ Simples de implementar

**Desvantagens:**
- ❌ Garmin requer cópia manual

---

### Opção 2: TrainingPeaks como Intermediário

**Como funciona:**
1. Treinador cria treino no app
2. Sistema envia para TrainingPeaks via API
3. TrainingPeaks sincroniza com Strava e Garmin

**Vantagens:**
- ✅ Sincronização automática com ambos
- ✅ Suporta estrutura detalhada de treinos
- ✅ Zonas de treino personalizadas

**Desvantagens:**
- ❌ Requer conta TrainingPeaks (paga)
- ❌ Complexidade adicional
- ❌ Custo para atletas

---

### Opção 3: Apenas no App + Notificações

**Como funciona:**
1. ✅ Treinador cria treino no app
2. ✅ Atleta recebe notificação push/email
3. ✅ Atleta visualiza treino detalhado no app
4. ✅ Após completar, sincroniza com Strava/Garmin

**Vantagens:**
- ✅ Controle total da experiência
- ✅ Estrutura detalhada de treinos
- ✅ Zonas personalizadas
- ✅ Sem dependências externas

**Desvantagens:**
- ❌ Atleta precisa abrir o app para ver treino

---

## 💻 Implementação - Envio para Strava

### 1. Atualizar Permissões OAuth

```typescript
// lib/strava.ts

export const STRAVA_SCOPES = [
  'read',
  'activity:read',
  'activity:write', // ← ADICIONAR esta permissão
  'activity:read_all'
]
```

### 2. Criar API de Envio de Treino

```typescript
// app/api/workouts/send-to-strava/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { sql } from '@/lib/db'

export async function POST(request: NextRequest) {
  const session = await getSession()
  
  if (!session || session.role !== 'coach') {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  try {
    const { workoutId } = await request.json()
    
    // Buscar treino e dados do aluno
    const workout = await sql`
      SELECT w.*, s.strava_access_token, s.name as student_name
      FROM workouts w
      JOIN students s ON w.student_id = s.id
      WHERE w.id = ${workoutId} AND w.coach_id = ${session.id}
    `
    
    if (workout.length === 0) {
      return NextResponse.json({ error: 'Treino não encontrado' }, { status: 404 })
    }
    
    const w = workout[0]
    
    if (!w.strava_access_token) {
      return NextResponse.json({ 
        error: 'Aluno não conectou Strava' 
      }, { status: 400 })
    }
    
    // Preparar dados do treino
    const stravaWorkout = {
      name: w.title,
      type: 'Run', // ou mapear w.workout_type
      start_date_local: new Date(w.scheduled_date).toISOString(),
      elapsed_time: (w.target_duration_minutes || 60) * 60,
      description: formatWorkoutDescription(w),
      distance: (w.target_distance_km || 0) * 1000, // converter para metros
      trainer: false,
      commute: false
    }
    
    // Enviar para Strava
    const stravaRes = await fetch('https://www.strava.com/api/v3/activities', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${w.strava_access_token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(stravaWorkout)
    })
    
    if (!stravaRes.ok) {
      const error = await stravaRes.json()
      throw new Error(error.message || 'Erro ao enviar para Strava')
    }
    
    const stravaActivity = await stravaRes.json()
    
    // Salvar ID da atividade Strava no treino
    await sql`
      UPDATE workouts 
      SET strava_activity_id = ${stravaActivity.id}
      WHERE id = ${workoutId}
    `
    
    return NextResponse.json({ 
      success: true,
      stravaActivityId: stravaActivity.id,
      stravaUrl: `https://www.strava.com/activities/${stravaActivity.id}`
    })
  } catch (error) {
    console.error('Send to Strava error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro ao enviar' },
      { status: 500 }
    )
  }
}

function formatWorkoutDescription(workout: any): string {
  let description = workout.description || ''
  
  // Adicionar steps se existirem
  if (workout.steps && workout.steps.length > 0) {
    description += '\n\nEstrutura do Treino:\n'
    
    workout.steps.forEach((step: any, index: number) => {
      const stepLabels: any = {
        warmup: 'Aquecimento',
        run: 'Corrida',
        recovery: 'Recuperação',
        cooldown: 'Desaquecimento',
        repeat: 'Intervalado'
      }
      
      description += `${index + 1}. ${stepLabels[step.type] || step.type}`
      
      if (step.duration_type === 'distance' && step.duration_value) {
        description += `: ${step.duration_value}km`
      } else if (step.duration_type === 'time' && step.duration_value) {
        description += `: ${step.duration_value}min`
      }
      
      if (step.target_from) {
        description += ` em ${step.target_from.toUpperCase()}`
      }
      
      description += '\n'
      
      // Adicionar steps de repetição
      if (step.type === 'repeat' && step.repeat_steps) {
        description += `   Repetir ${step.repeat_count}x:\n`
        step.repeat_steps.forEach((rs: any) => {
          description += `   - ${rs.description || rs.type}`
          if (rs.duration_value) {
            description += `: ${rs.duration_value}${rs.duration_type === 'distance' ? 'km' : 'min'}`
          }
          description += '\n'
        })
      }
    })
  }
  
  if (workout.notes) {
    description += `\n\nNotas: ${workout.notes}`
  }
  
  return description
}
```

### 3. Adicionar Botão no Dashboard do Coach

```typescript
// app/coach/student/[id]/components/student-detail.tsx

import { Send } from 'lucide-react'

// Adicionar botão ao lado de cada treino
<Button
  variant="outline"
  size="sm"
  onClick={() => handleSendToStrava(workout.id)}
  disabled={!student.strava_access_token}
>
  <Send className="mr-2 h-4 w-4" />
  Enviar para Strava
</Button>

// Função handler
async function handleSendToStrava(workoutId: number) {
  try {
    const res = await fetch('/api/workouts/send-to-strava', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ workoutId })
    })
    
    const data = await res.json()
    
    if (!res.ok) {
      throw new Error(data.error)
    }
    
    toast.success('Treino enviado para o Strava do atleta!')
  } catch (error) {
    toast.error(error instanceof Error ? error.message : 'Erro ao enviar')
  }
}
```

### 4. Adicionar Coluna no Banco de Dados

```sql
-- Adicionar no Neon Console
ALTER TABLE workouts 
ADD COLUMN IF NOT EXISTS strava_activity_id VARCHAR(255);
```

### 5. Atualizar Tipo Workout

```typescript
// lib/db.ts

export type Workout = {
  // ... campos existentes
  strava_activity_id: string | null  // ← ADICIONAR
}
```

---

## 📧 Sistema de Notificações (Complementar)

### Enviar Email com Detalhes do Treino

```typescript
// lib/email.ts (usando Resend, SendGrid, etc.)

export async function sendWorkoutNotification(
  studentEmail: string,
  workout: Workout
) {
  const emailHtml = `
    <h2>Novo Treino Programado</h2>
    <p><strong>Data:</strong> ${format(new Date(workout.scheduled_date), 'dd/MM/yyyy')}</p>
    <p><strong>Título:</strong> ${workout.title}</p>
    <p><strong>Tipo:</strong> ${workout.workout_type}</p>
    
    ${workout.description ? `<p>${workout.description}</p>` : ''}
    
    ${workout.steps ? formatStepsForEmail(workout.steps) : ''}
    
    <p><a href="${process.env.NEXT_PUBLIC_URL}/student">Ver no App</a></p>
  `
  
  // Enviar email usando serviço escolhido
}
```

---

## 🎯 Recomendação Final

### Implementar em Fases:

#### Fase 1: Básico (Recomendado para começar)
1. ✅ Treinos ficam apenas no app
2. ✅ Notificações push/email para atleta
3. ✅ Atleta visualiza no dashboard
4. ✅ Após completar, sincroniza com Strava/Garmin

#### Fase 2: Integração Strava
1. ✅ Adicionar permissão `activity:write`
2. ✅ Botão "Enviar para Strava" no dashboard do coach
3. ✅ Treino aparece no calendário Strava do atleta
4. ✅ Descrição formatada com estrutura do treino

#### Fase 3: Notificações Avançadas
1. ✅ Email com detalhes do treino
2. ✅ Push notifications
3. ✅ Lembrete no dia do treino

---

## ⚠️ Limitações Importantes

### Strava:
- ✅ Pode criar atividades planejadas
- ❌ Não suporta estrutura detalhada de intervalos
- ❌ Não suporta zonas de treino específicas
- ⚠️ Treino aparece como texto na descrição

### Garmin:
- ❌ Não possui API para criar treinos
- ❌ Requer cópia manual pelo atleta
- ⚠️ Alternativa: usar TrainingPeaks (pago)

---

## 📊 Comparação de Abordagens

| Abordagem | Strava | Garmin | Complexidade | Custo |
|-----------|--------|--------|--------------|-------|
| Apenas App | ❌ | ❌ | Baixa | Grátis |
| App + Strava | ✅ | ❌ | Média | Grátis |
| App + TrainingPeaks | ✅ | ✅ | Alta | Pago |
| App + Notificações | ⚠️ | ⚠️ | Baixa | Grátis |

---

## ✅ Conclusão

**Resposta:** 
- ✅ **Strava**: SIM, é possível enviar treinos automaticamente
- ❌ **Garmin**: NÃO, não possui API pública para isso

**Recomendação:**
1. Implementar envio para Strava (Fase 2)
2. Adicionar notificações por email (Fase 3)
3. Para Garmin, atleta copia manualmente ou usa TrainingPeaks

**Melhor experiência:**
- Treinos detalhados ficam no seu app
- Sincronização automática com Strava
- Notificações para lembrar o atleta
- Após completar, dados voltam do Strava/Garmin