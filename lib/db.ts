import { neon } from '@neondatabase/serverless'

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL não configurada')
}

export const sql = neon(process.env.DATABASE_URL)

// ===============================
// COACH
// ===============================

export type Coach = {
  id: number
  name: string
  email: string
  brand_name: string | null
  password_hash: string
  approved: boolean
  is_admin: boolean
  avatar_url?: string | null
  created_at: string
}

// ===============================
// STUDENT
// ===============================

export type Student = {
  id: number
  coach_id: number
  fcm_token: string | null
  fcm_token_updated_at: Date | null
  name: string
  email: string
  password_hash: string

  avatar_url: string | null

  birth_date: string | null

  weight_kg: number | null
  height_cm: number | null

  base_pace_min_km: number | null

  resting_heart_rate: number | null
  max_heart_rate: number | null

  test_3km_time: string | null
  test_3km_pace_min_km: number | null

  // ===============================
  // ZONAS DE TREINO
  // ===============================

  z1_min: number | null
  z1_max: number | null

  z2_min: number | null
  z2_max: number | null

  z3_min: number | null
  z3_max: number | null

  z4_min: number | null
  z4_max: number | null

  z5_min: number | null
  z5_max: number | null

  // ===============================

  strava_athlete_id: string | null
  strava_access_token: string | null
  strava_refresh_token: string | null

  strava_token_expires_at: Date | null

  created_at: Date
  updated_at: Date
}

// ===============================
// WORKOUT
// ===============================

export type Workout = {
  id: number
  student_id: number
  coach_id: number
  
  title: string
  description: string | null

  scheduled_date: string

  workout_type: string
  strava_activity_id: string | null
  target_distance_km: number | null
  target_duration_minutes: number | null
  target_pace_min_km: number | null
  steps: WorkoutStep[] | null
  intervals: WorkoutInterval[] | null

  notes: string | null

  status: 'pending' | 'completed' | 'skipped'

  created_at: Date
  updated_at: Date
}

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

// ===============================
// WORKOUT INTERVAL
// ===============================

export type WorkoutInterval = {
  type: 'warmup' | 'run' | 'rest' | 'cooldown'

  distance_km?: number
  duration_minutes?: number
  pace_min_km?: number

  description?: string
}

// ===============================
// WORKOUT LOG
// ===============================

export type WorkoutLog = {
  id: number

  workout_id: number
  student_id: number

  completed_at: Date

  actual_distance_km: number | null
  actual_duration_minutes: number | null
  actual_pace_min_km: number | null

  calories_burned: number | null

  average_heart_rate: number | null
  max_heart_rate: number | null

  elevation_gain_m: number | null

  strava_activity_id: string | null

  notes: string | null

  created_at: Date
}