# Plano de Integração com Garmin

## Análise da Biblioteca @garmin/fitsdk

### O que é o FIT SDK?
O **@garmin/fitsdk** é um SDK JavaScript para ler e decodificar arquivos FIT (Flexible and Interoperable Data Transfer) da Garmin. Esses arquivos contêm dados de atividades físicas gravadas por dispositivos Garmin.

### ⚠️ IMPORTANTE: Diferença entre Strava e Garmin

#### Strava (Atual)
- ✅ **API OAuth**: Conexão direta com conta Strava
- ✅ **Sincronização automática**: Busca atividades automaticamente
- ✅ **Tempo real**: Dados atualizados constantemente
- ✅ **Sem arquivos**: Tudo via API

#### Garmin com FIT SDK
- ❌ **Sem API OAuth**: Não conecta diretamente com conta Garmin
- ❌ **Sem sincronização automática**: Não busca atividades automaticamente
- ✅ **Upload manual**: Aluno precisa fazer upload do arquivo .FIT
- ✅ **Leitura de arquivos**: Processa arquivos .FIT exportados do Garmin Connect

---

## Opções de Integração com Garmin

### Opção 1: Upload Manual de Arquivos .FIT (Recomendado)
**Como funciona:**
1. Aluno exporta atividade do Garmin Connect como arquivo .FIT
2. Aluno faz upload do arquivo no dashboard
3. Sistema processa o arquivo usando @garmin/fitsdk
4. Dados são extraídos e salvos no histórico

**Vantagens:**
- ✅ Simples de implementar
- ✅ Não precisa de credenciais Garmin
- ✅ Funciona com qualquer dispositivo Garmin
- ✅ Dados muito detalhados (frequência cardíaca, cadência, etc.)

**Desvantagens:**
- ❌ Processo manual (aluno precisa fazer upload)
- ❌ Não sincroniza automaticamente

### Opção 2: Garmin Connect API (Complexo)
**Como funciona:**
1. Usar API não oficial do Garmin Connect
2. Requer credenciais de login do aluno
3. Sincronização automática de atividades

**Vantagens:**
- ✅ Sincronização automática
- ✅ Experiência similar ao Strava

**Desvantagens:**
- ❌ API não oficial (pode quebrar a qualquer momento)
- ❌ Requer armazenar credenciais Garmin (risco de segurança)
- ❌ Complexo de implementar
- ❌ Pode violar termos de serviço da Garmin

### Opção 3: Garmin Health API (Empresarial)
**Como funciona:**
1. Aplicar para acesso à Garmin Health API
2. Processo de aprovação empresarial
3. API oficial com OAuth

**Vantagens:**
- ✅ API oficial
- ✅ Sincronização automática
- ✅ Seguro e confiável

**Desvantagens:**
- ❌ Requer aprovação da Garmin (processo demorado)
- ❌ Pode ter custos
- ❌ Voltado para empresas de saúde

---

## Recomendação: Opção 1 - Upload Manual de Arquivos .FIT

### Por que essa opção?
1. **Simples e rápido** de implementar
2. **Sem riscos legais** ou de segurança
3. **Funciona imediatamente** sem aprovações
4. **Complementa o Strava** (alunos podem usar ambos)
5. **Dados muito detalhados** do arquivo .FIT

---

## Implementação Detalhada - Upload de Arquivos .FIT

### 1. Instalação da Biblioteca

```bash
npm install @garmin/fitsdk
```

### 2. Estrutura de Arquivos

```
lib/
  garmin-fit-parser.ts          # Parser de arquivos .FIT
app/
  api/
    student/
      upload-fit/
        route.ts                 # API para upload de arquivo .FIT
  student/
    components/
      garmin-fit-upload.tsx      # Componente de upload
```

### 3. Código do Parser (lib/garmin-fit-parser.ts)

```typescript
import { Decoder, Stream } from '@garmin/fitsdk'

export interface FitActivityData {
  sport: string
  startTime: Date
  totalDistance: number // metros
  totalTime: number // segundos
  avgHeartRate?: number
  maxHeartRate?: number
  avgCadence?: number
  totalCalories?: number
  elevationGain?: number
  avgSpeed?: number // m/s
}

export function parseFitFile(buffer: ArrayBuffer): FitActivityData | null {
  try {
    const stream = Stream.fromArrayBuffer(buffer)
    const decoder = new Decoder(stream)
    
    if (!decoder.isFIT()) {
      throw new Error('Arquivo não é um arquivo FIT válido')
    }
    
    const { messages } = decoder.read()
    
    // Buscar mensagem de sessão (contém resumo da atividade)
    const session = messages.sessionMesgs?.[0]
    
    if (!session) {
      throw new Error('Nenhuma sessão encontrada no arquivo FIT')
    }
    
    // Extrair dados
    const data: FitActivityData = {
      sport: session.sport || 'running',
      startTime: session.startTime || new Date(),
      totalDistance: session.totalDistance || 0,
      totalTime: session.totalTimerTime || 0,
      avgHeartRate: session.avgHeartRate,
      maxHeartRate: session.maxHeartRate,
      avgCadence: session.avgCadence,
      totalCalories: session.totalCalories,
      elevationGain: session.totalAscent,
      avgSpeed: session.avgSpeed,
    }
    
    return data
  } catch (error) {
    console.error('Erro ao processar arquivo FIT:', error)
    return null
  }
}

export function convertFitDataToWorkoutLog(fitData: FitActivityData) {
  // Converter metros para km
  const distanceKm = fitData.totalDistance / 1000
  
  // Converter segundos para minutos
  const durationMinutes = fitData.totalTime / 60
  
  // Calcular pace (min/km)
  const paceMinKm = durationMinutes / distanceKm
  
  return {
    actual_distance_km: distanceKm,
    actual_duration_minutes: durationMinutes,
    actual_pace_min_km: paceMinKm,
    average_heart_rate: fitData.avgHeartRate || null,
    max_heart_rate: fitData.maxHeartRate || null,
    calories_burned: fitData.totalCalories || null,
    elevation_gain_m: fitData.elevationGain || null,
    completed_at: fitData.startTime,
  }
}
```

### 4. API de Upload (app/api/student/upload-fit/route.ts)

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { parseFitFile, convertFitDataToWorkoutLog } from '@/lib/garmin-fit-parser'
import { sql } from '@/lib/db'

export async function POST(request: NextRequest) {
  const session = await getSession()
  
  if (!session || session.role !== 'student') {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    const workoutId = formData.get('workout_id') as string
    
    if (!file) {
      return NextResponse.json({ error: 'Nenhum arquivo enviado' }, { status: 400 })
    }
    
    // Verificar extensão do arquivo
    if (!file.name.toLowerCase().endsWith('.fit')) {
      return NextResponse.json({ error: 'Apenas arquivos .FIT são aceitos' }, { status: 400 })
    }
    
    // Ler arquivo como ArrayBuffer
    const arrayBuffer = await file.arrayBuffer()
    
    // Processar arquivo FIT
    const fitData = parseFitFile(arrayBuffer)
    
    if (!fitData) {
      return NextResponse.json({ error: 'Erro ao processar arquivo FIT' }, { status: 400 })
    }
    
    // Converter para formato do workout log
    const logData = convertFitDataToWorkoutLog(fitData)
    
    // Salvar no banco de dados
    const result = await sql`
      INSERT INTO workout_logs (
        workout_id,
        student_id,
        completed_at,
        actual_distance_km,
        actual_duration_minutes,
        actual_pace_min_km,
        average_heart_rate,
        max_heart_rate,
        calories_burned,
        elevation_gain_m,
        notes
      )
      VALUES (
        ${workoutId ? parseInt(workoutId) : null},
        ${session.id},
        ${logData.completed_at},
        ${logData.actual_distance_km},
        ${logData.actual_duration_minutes},
        ${logData.actual_pace_min_km},
        ${logData.average_heart_rate},
        ${logData.max_heart_rate},
        ${logData.calories_burned},
        ${logData.elevation_gain_m},
        'Importado do Garmin'
      )
      RETURNING *
    `
    
    // Atualizar status do treino se houver workout_id
    if (workoutId) {
      await sql`
        UPDATE workouts 
        SET status = 'completed' 
        WHERE id = ${parseInt(workoutId)} AND student_id = ${session.id}
      `
    }
    
    return NextResponse.json({ 
      success: true, 
      log: result[0],
      fitData 
    })
  } catch (error) {
    console.error('Upload FIT error:', error)
    return NextResponse.json(
      { error: 'Erro ao processar arquivo' },
      { status: 500 }
    )
  }
}
```

### 5. Componente de Upload (app/student/components/garmin-fit-upload.tsx)

```typescript
'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Upload, FileCheck, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'
import Image from 'next/image'

interface GarminFitUploadProps {
  workoutId?: number
  onSuccess?: () => void
}

export function GarminFitUpload({ workoutId, onSuccess }: GarminFitUploadProps) {
  const [uploading, setUploading] = useState(false)
  const [dragActive, setDragActive] = useState(false)

  const handleFileUpload = async (file: File) => {
    if (!file.name.toLowerCase().endsWith('.fit')) {
      toast.error('Apenas arquivos .FIT são aceitos')
      return
    }

    setUploading(true)

    try {
      const formData = new FormData()
      formData.append('file', file)
      if (workoutId) {
        formData.append('workout_id', workoutId.toString())
      }

      const res = await fetch('/api/student/upload-fit', {
        method: 'POST',
        body: formData,
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Erro ao fazer upload')
      }

      toast.success('Atividade importada do Garmin com sucesso!')
      onSuccess?.()
    } catch (error) {
      console.error('Upload error:', error)
      toast.error(error instanceof Error ? error.message : 'Erro ao fazer upload')
    } finally {
      setUploading(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragActive(false)

    const file = e.dataTransfer.files[0]
    if (file) {
      handleFileUpload(file)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      handleFileUpload(file)
    }
  }

  return (
    <Card className="border-orange-500/20 bg-orange-500/5">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Image 
            src="/images/garmin-logo.png" 
            alt="Garmin" 
            width={24} 
            height={24}
            className="rounded"
          />
          Importar do Garmin
        </CardTitle>
        <CardDescription>
          Faça upload do arquivo .FIT exportado do Garmin Connect
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div
          className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
            dragActive
              ? 'border-orange-500 bg-orange-500/10'
              : 'border-muted-foreground/25 hover:border-orange-500/50'
          }`}
          onDragOver={(e) => {
            e.preventDefault()
            setDragActive(true)
          }}
          onDragLeave={() => setDragActive(false)}
          onDrop={handleDrop}
        >
          {uploading ? (
            <div className="flex flex-col items-center gap-2">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500" />
              <p className="text-sm text-muted-foreground">
                Processando arquivo...
              </p>
            </div>
          ) : (
            <>
              <Upload className="h-12 w-12 mx-auto mb-4 text-orange-500" />
              <p className="text-sm font-medium mb-2">
                Arraste o arquivo .FIT aqui ou clique para selecionar
              </p>
              <p className="text-xs text-muted-foreground mb-4">
                Apenas arquivos .FIT do Garmin Connect
              </p>
              <label>
                <Button variant="outline" className="cursor-pointer" asChild>
                  <span>
                    <FileCheck className="mr-2 h-4 w-4" />
                    Selecionar Arquivo
                  </span>
                </Button>
                <input
                  type="file"
                  accept=".fit"
                  className="hidden"
                  onChange={handleChange}
                  disabled={uploading}
                />
              </label>
            </>
          )}
        </div>

        <div className="mt-4 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
          <div className="flex gap-2">
            <AlertCircle className="h-5 w-5 text-blue-500 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-500">
              <p className="font-medium mb-1">Como exportar do Garmin Connect:</p>
              <ol className="list-decimal list-inside space-y-1 text-xs">
                <li>Acesse garminconnect.com</li>
                <li>Abra a atividade desejada</li>
                <li>Clique no ícone de engrenagem (⚙️)</li>
                <li>Selecione "Exportar Original"</li>
                <li>Faça upload do arquivo .FIT aqui</li>
              </ol>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
```

### 6. Integração no Dashboard

Adicionar o componente ao lado do Strava no dashboard do aluno:

```typescript
// Em app/student/components/student-dashboard.tsx

import { GarminFitUpload } from './garmin-fit-upload'

// Adicionar após o componente StravaIntegration
<GarminFitUpload 
  workoutId={selectedWorkout?.id}
  onSuccess={() => {
    mutateLogs()
    mutateWorkouts()
    setShowLogDialog(false)
  }}
/>
```

---

## Dados Extraídos do Arquivo .FIT

O arquivo .FIT contém dados muito detalhados:

### Dados Básicos
- ✅ Distância total
- ✅ Tempo total
- ✅ Data/hora de início
- ✅ Tipo de esporte

### Dados Avançados
- ✅ Frequência cardíaca (média e máxima)
- ✅ Cadência (média)
- ✅ Calorias queimadas
- ✅ Ganho de elevação
- ✅ Velocidade média
- ✅ Zonas de frequência cardíaca
- ✅ Dados de GPS (latitude/longitude)
- ✅ Temperatura

### Dados por Volta (Laps)
- ✅ Distância de cada volta
- ✅ Tempo de cada volta
- ✅ Pace de cada volta
- ✅ FC de cada volta

---

## Comparação: Strava vs Garmin

| Recurso | Strava | Garmin (.FIT) |
|---------|--------|---------------|
| Sincronização automática | ✅ Sim | ❌ Não (upload manual) |
| Dados de atividade | ✅ Sim | ✅ Sim |
| Frequência cardíaca | ✅ Sim | ✅ Sim (mais detalhado) |
| Dados de GPS | ✅ Sim | ✅ Sim (mais preciso) |
| Zonas de treino | ✅ Sim | ✅ Sim |
| Facilidade de uso | ✅ Muito fácil | ⚠️ Requer upload manual |
| Configuração | ⚠️ OAuth complexo | ✅ Simples |

---

## Checklist de Implementação

- [ ] Instalar @garmin/fitsdk
- [ ] Criar lib/garmin-fit-parser.ts
- [ ] Criar API app/api/student/upload-fit/route.ts
- [ ] Criar componente app/student/components/garmin-fit-upload.tsx
- [ ] Adicionar logo do Garmin em public/images/garmin-logo.png
- [ ] Integrar componente no dashboard do aluno
- [ ] Testar upload de arquivo .FIT
- [ ] Validar dados extraídos
- [ ] Adicionar tratamento de erros
- [ ] Documentar processo para usuários

---

## Conclusão

✅ **SIM, é totalmente possível implementar integração com Garmin!**

**Recomendação:** Implementar upload manual de arquivos .FIT usando @garmin/fitsdk

**Vantagens:**
- Simples e rápido de implementar
- Complementa a integração com Strava
- Dados muito detalhados
- Sem riscos legais ou de segurança
- Funciona com qualquer dispositivo Garmin

**Próximos Passos:**
1. Confirmar se deseja implementar
2. Instalar biblioteca
3. Seguir checklist de implementação
4. Testar com arquivo .FIT real