# Plano de Implementação - Exibição de Steps no Dashboard do Aluno

## Objetivo
Permitir que os treinos criados pelo treinador com steps detalhados (aquecimento, intervalados, recuperação, desaquecimento) sejam salvos no banco de dados e exibidos de forma formatada no dashboard do aluno, mostrando as zonas de treino personalizadas de cada aluno.

---

## 1. Alteração no Banco de Dados (Neon Console)

### 1.1 Verificar estrutura atual
Execute no Neon Console para verificar a estrutura da tabela `workouts`:
```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'workouts';
```

### 1.2 Adicionar coluna `steps` (se não existir)
```sql
ALTER TABLE workouts 
ADD COLUMN IF NOT EXISTS steps JSONB;
```

### 1.3 Verificar se a coluna foi criada
```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'workouts' AND column_name = 'steps';
```

---

## 2. Estrutura de Dados dos Steps

### Tipo WorkoutStep (TypeScript)
```typescript
type WorkoutStep = {
  id: string
  type: 'warmup' | 'run' | 'recovery' | 'cooldown' | 'repeat'
  description: string
  
  duration_type: 'distance' | 'time' | 'open'
  duration_value: string
  
  target_type: 'pace' | 'heart_rate' | 'none'
  target_from: string  // Ex: "z2" ou "5:30"
  target_to: string    // Ex: "z2" ou "5:45"
  
  repeat_count?: number
  repeat_steps?: WorkoutStep[]
}
```

### Exemplo de JSON salvo no banco
```json
[
  {
    "id": "step-1",
    "type": "warmup",
    "description": "Aquecimento",
    "duration_type": "time",
    "duration_value": "10",
    "target_type": "pace",
    "target_from": "z2",
    "target_to": "z2"
  },
  {
    "id": "step-2",
    "type": "repeat",
    "description": "Intervalado 3x1km",
    "duration_type": "distance",
    "duration_value": "",
    "target_type": "none",
    "target_from": "",
    "target_to": "",
    "repeat_count": 3,
    "repeat_steps": [
      {
        "id": "step-2-1",
        "type": "run",
        "description": "Corrida",
        "duration_type": "distance",
        "duration_value": "1",
        "target_type": "pace",
        "target_from": "z5",
        "target_to": "z5"
      },
      {
        "id": "step-2-2",
        "type": "recovery",
        "description": "Recuperação",
        "duration_type": "time",
        "duration_value": "3",
        "target_type": "pace",
        "target_from": "z1",
        "target_to": "z1"
      }
    ]
  },
  {
    "id": "step-3",
    "type": "cooldown",
    "description": "Desaquecimento",
    "duration_type": "time",
    "duration_value": "10",
    "target_type": "pace",
    "target_from": "z2",
    "target_to": "z2"
  }
]
```

---

## 3. Arquivos a Modificar

### 3.1 `lib/db.ts`
**Mudança:** Adicionar campo `steps` ao tipo `Workout`

**Localização:** Após a linha 102 (após `intervals: WorkoutInterval[] | null`)

```typescript
export type Workout = {
  id: number
  student_id: number
  coach_id: number
  title: string
  description: string | null
  scheduled_date: string
  workout_type: string
  target_distance_km: number | null
  target_duration_minutes: number | null
  target_pace_min_km: number | null
  intervals: WorkoutInterval[] | null
  steps: WorkoutStep[] | null  // ← ADICIONAR ESTA LINHA
  notes: string | null
  status: 'pending' | 'completed' | 'skipped'
  created_at: Date
  updated_at: Date
}

// Adicionar tipo WorkoutStep APÓS o tipo WorkoutInterval (após linha 125)
export type WorkoutStep = {
  id: string
  type: 'warmup' | 'run' | 'recovery' | 'cooldown' | 'repeat'
  description: string
  duration_type: 'distance' | 'time' | 'open'
  duration_value: string
  target_type: 'pace' | 'heart_rate' | 'none'
  target_from: string
  target_to: string
  repeat_count?: number
  repeat_steps?: WorkoutStep[]
}
```

### 3.2 `app/api/workouts/route.ts`
**Mudança:** Incluir `steps` na inserção do treino

**Localização:** Linha 23 - adicionar `steps` na desestruturação
```typescript
const {
  student_id,
  title,
  description,
  scheduled_date,
  workout_type,
  target_distance_km,
  target_duration_minutes,
  target_pace_min_km,
  notes,
  steps,  // ← ADICIONAR ESTA LINHA
} = data
```

**Localização:** Linhas 42-54 - modificar a query INSERT
```typescript
const result = await sql`
  INSERT INTO workouts (
    student_id, coach_id, title, description, scheduled_date,
    workout_type, target_distance_km, target_duration_minutes,
    target_pace_min_km, notes, steps
  )
  VALUES (
    ${student_id}, ${session.id}, ${title}, ${description || null}, ${scheduled_date},
    ${workout_type}, ${target_distance_km || null}, ${target_duration_minutes || null},
    ${target_pace_min_km || null}, ${notes || null}, ${steps ? JSON.stringify(steps) : null}
  )
  RETURNING *
`
```

### 3.3 `app/api/workouts/[id]/route.ts`
**Mudança:** Incluir `steps` na atualização do treino

**Localização:** Linha 48 - adicionar `steps` na desestruturação (após `notes,`)
```typescript
const {
  title,
  description,
  scheduled_date,
  workout_type,
  target_distance_km,
  target_duration_minutes,
  target_pace_min_km,
  notes,
  status,
  steps,  // ← ADICIONAR ESTA LINHA
} = data
```

**Localização:** Linha 71 - adicionar `steps` no UPDATE (após a linha `notes = ${notes || null},`)
```typescript
const result = await sql`
  UPDATE workouts SET
    title = ${title},
    description = ${description || null},
    scheduled_date = ${scheduled_date},
    workout_type = ${workout_type},
    target_distance_km = ${target_distance_km || null},
    target_duration_minutes = ${target_duration_minutes || null},
    target_pace_min_km = ${target_pace_min_km || null},
    notes = ${notes || null},
    steps = ${steps ? JSON.stringify(steps) : null},
    status = ${status || 'pending'},
    updated_at = NOW()
  WHERE id = ${parseInt(id)}
  RETURNING *
`
```

### 3.4 Criar `lib/format-pace.ts`
**Novo arquivo:** Função utilitária para formatar pace

```typescript
export function formatPace(paceDecimal: number): string {
  const minutes = Math.floor(paceDecimal)
  const seconds = Math.round((paceDecimal - minutes) * 60)
  return `${minutes}:${seconds.toString().padStart(2, '0')}`
}
```

### 3.5 Criar `app/student/components/workout-steps-display.tsx`
**Novo arquivo:** Componente para exibir os steps formatados

```typescript
'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { WorkoutStep, Student } from '@/lib/db'
import { formatPace } from '@/lib/format-pace'

interface WorkoutStepsDisplayProps {
  steps: WorkoutStep[]
  student: Student
}

export function WorkoutStepsDisplay({ steps, student }: WorkoutStepsDisplayProps) {
  // Função para obter a zona do aluno
  const getStudentZone = (zone: string): string => {
    if (!zone.startsWith('z')) return zone
    
    const zoneNum = zone.substring(1)
    const minKey = `z${zoneNum}_min` as keyof Student
    const maxKey = `z${zoneNum}_max` as keyof Student
    
    const min = student[minKey]
    const max = student[maxKey]
    
    if (min && max) {
      return `${formatPace(Number(min))} - ${formatPace(Number(max))}`
    }
    return zone.toUpperCase()
  }

  // Função para renderizar um step
  const renderStep = (step: WorkoutStep, index: number, isNested = false) => {
    const stepTypeLabels = {
      warmup: 'Aquecimento',
      run: 'Corrida',
      recovery: 'Recuperação',
      cooldown: 'Desaquecimento',
      repeat: 'Intervalado'
    }

    const stepTypeColors = {
      warmup: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
      run: 'bg-red-500/10 text-red-500 border-red-500/20',
      recovery: 'bg-green-500/10 text-green-500 border-green-500/20',
      cooldown: 'bg-purple-500/10 text-purple-500 border-purple-500/20',
      repeat: 'bg-orange-500/10 text-orange-500 border-orange-500/20'
    }

    return (
      <div key={step.id} className={isNested ? 'ml-6' : ''}>
        <div className="flex items-start gap-3 mb-3">
          <Badge className={stepTypeColors[step.type]}>
            {stepTypeLabels[step.type]}
          </Badge>
          
          <div className="flex-1">
            {/* Duração */}
            {step.duration_type === 'distance' && step.duration_value && (
              <span className="text-white font-medium">
                {step.duration_value}km
              </span>
            )}
            {step.duration_type === 'time' && step.duration_value && (
              <span className="text-white font-medium">
                {step.duration_value}min
              </span>
            )}
            {step.duration_type === 'open' && (
              <span className="text-white font-medium">
                Duração livre
              </span>
            )}
            
            {/* Zona/Pace alvo */}
            {step.target_type === 'pace' && step.target_from && (
              <span className="text-muted-foreground ml-2">
                em {getStudentZone(step.target_from)}
                {step.target_from !== step.target_to && ` - ${getStudentZone(step.target_to)}`}
              </span>
            )}
            
            {/* Descrição adicional */}
            {step.description && step.type !== 'repeat' && (
              <p className="text-sm text-muted-foreground mt-1">
                {step.description}
              </p>
            )}
          </div>
        </div>
        
        {/* Steps de repetição */}
        {step.type === 'repeat' && step.repeat_steps && (
          <div className="ml-6 mb-3">
            <p className="text-sm text-muted-foreground mb-2">
              Repetir {step.repeat_count}x:
            </p>
            {step.repeat_steps.map((repeatStep, idx) => 
              renderStep(repeatStep, idx, true)
            )}
          </div>
        )}
      </div>
    )
  }

  if (!steps || steps.length === 0) {
    return null
  }

  return (
    <Card className="mt-4 border-accent/20 bg-white/5 backdrop-blur">
      <CardContent className="pt-6">
        <h4 className="text-sm font-semibold text-white mb-4">
          Estrutura do Treino
        </h4>
        <div className="space-y-2">
          {steps.map((step, index) => renderStep(step, index))}
        </div>
      </CardContent>
    </Card>
  )
}
```

### 3.6 `app/student/components/student-dashboard.tsx`
**Mudança:** Importar e usar o componente `WorkoutStepsDisplay`

**Localização:** Linha 1 - adicionar import
```typescript
import { WorkoutStepsDisplay } from './workout-steps-display'
```

**Localização:** Após linha 615 (após a seção de notas do treino do dia)
```typescript
{todayWorkout.notes && (
  <p className="text-sm text-muted-foreground border-l-2 border-accent pl-3">
    {todayWorkout.notes}
  </p>
)}

{/* ADICIONAR AQUI - Exibir steps do treino */}
{todayWorkout.steps && todayWorkout.steps.length > 0 && (
  <WorkoutStepsDisplay 
    steps={todayWorkout.steps} 
    student={student}
  />
)}
```

**Localização:** Após linha 791 (após a seção de métricas dos treinos pendentes)
```typescript
{workout.target_duration_minutes && (
  <div className="flex items-center gap-1 text-sm">
    <Timer className="h-4 w-4 text-accent" />
    <span>
      {workout.target_duration_minutes >= 60 ? (
        <>
          {Math.floor(workout.target_duration_minutes / 60)}h{' '}
          {workout.target_duration_minutes % 60 > 0 &&
            `${workout.target_duration_minutes % 60}min`}
        </>
      ) : (
        `${workout.target_duration_minutes} min`
      )}
    </span>
  </div>
)}

{/* ADICIONAR AQUI - Exibir steps dos treinos pendentes */}
{workout.steps && workout.steps.length > 0 && (
  <WorkoutStepsDisplay 
    steps={workout.steps} 
    student={student}
  />
)}
```

---

## 4. Exemplo Visual da Exibição

### Como ficará no Dashboard do Aluno:

```
┌─────────────────────────────────────────────────────┐
│ Treino Intervalado - Terça-feira                    │
│ [Intervalado]                                        │
│                                                      │
│ 📏 8.5 km  ⏱️ 45 min                                │
│                                                      │
│ Estrutura do Treino                                 │
│ ┌─────────────────────────────────────────────┐    │
│ │ [Aquecimento] 10min em 6:30 - 6:00          │    │
│ │                                               │    │
│ │ [Intervalado] Repetir 3x:                    │    │
│ │   [Corrida] 1km em 4:30 - 4:15              │    │
│ │   [Recuperação] 3min em 7:00 - 6:30         │    │
│ │                                               │    │
│ │ [Desaquecimento] 10min em 6:30 - 6:00       │    │
│ └─────────────────────────────────────────────┘    │
│                                                      │
│ [Fazer treino]                                       │
└─────────────────────────────────────────────────────┘
```

---

## 5. Fluxo de Teste

1. **Criar treino como treinador:**
   - Acessar página do aluno
   - Criar novo treino com steps detalhados
   - Incluir aquecimento, intervalados, recuperação e desaquecimento
   - Definir zonas de treino (Z1, Z2, Z5, etc.)
   - Salvar treino

2. **Verificar no banco de dados:**
   ```sql
   SELECT id, title, steps 
   FROM workouts 
   WHERE id = [ID_DO_TREINO]
   ```

3. **Visualizar como aluno:**
   - Fazer login como aluno
   - Verificar dashboard
   - Confirmar que os steps aparecem formatados
   - Verificar que as zonas mostram os valores personalizados do aluno

---

## 6. Checklist de Implementação

- [ x] Executar query SQL no Neon Console para adicionar coluna `steps`
- [ x] Atualizar tipo `Workout` em `lib/db.ts` (linha 103)
- [x ] Adicionar tipo `WorkoutStep` em `lib/db.ts` (após linha 125)
- [x ] Modificar `app/api/workouts/route.ts` para salvar steps (linhas 23 e 42-54)
- [x ] Modificar `app/api/workouts/[id]/route.ts` para atualizar steps (linhas 48 e 71)
- [x ] Criar `lib/format-pace.ts`
- [x ] Criar `app/student/components/workout-steps-display.tsx`
- [x ] Integrar componente no treino do dia (linha ~615)
- [x ] Integrar componente nos treinos pendentes (linha ~791)
- [ x] Testar criação de treino com steps
- [ x] Testar visualização no dashboard do aluno
- [ x] Verificar formatação das zonas personalizadas

---

## 7. Observações Importantes

1. **Zonas Personalizadas:** O sistema já calcula as zonas de treino baseadas no teste de 3km do aluno. Os steps usarão essas zonas personalizadas.

2. **Compatibilidade:** Treinos antigos sem steps continuarão funcionando normalmente (campo será `null`).

3. **Validação:** O frontend já valida os steps no momento da criação, então não é necessário validação adicional no backend.

4. **Performance:** Como os steps são salvos como JSONB, as queries continuam eficientes e não há necessidade de tabelas adicionais.

5. **Extensibilidade:** A estrutura permite adicionar novos tipos de steps no futuro sem quebrar a compatibilidade.

---

## 8. Resumo das Mudanças por Arquivo

| Arquivo | Tipo | Linhas | Descrição |
|---------|------|--------|-----------|
| Neon Console | SQL | - | Adicionar coluna `steps JSONB` |
| `lib/db.ts` | Modificar | 103, 126-137 | Adicionar campo `steps` e tipo `WorkoutStep` |
| `app/api/workouts/route.ts` | Modificar | 23, 46, 51 | Incluir `steps` na criação |
| `app/api/workouts/[id]/route.ts` | Modificar | 50, 71 | Incluir `steps` na atualização |
| `lib/format-pace.ts` | Criar | - | Função para formatar pace |
| `app/student/components/workout-steps-display.tsx` | Criar | - | Componente de exibição |
| `app/student/components/student-dashboard.tsx` | Modificar | 1, 615, 791 | Integrar componente |