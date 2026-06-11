export type TestType = '12min' | '3km' | 'time_trial'

export type TrainingZones = {
  z1_min: number
  z1_max: number
  z2_min: number
  z2_max: number
  z3_min: number
  z3_max: number
  z4_min: number
  z4_max: number
  z5_min: number
  z5_max: number
}

function round(value: number) {
  return Math.round(value * 100) / 100
}

export function calculateZonesByTest(
  testType: TestType,
  testPaceMinKm: number
): TrainingZones {
  const pace = testPaceMinKm

  if (testType === '12min') {
    return {
      z1_min: round(pace + 1.45),
      z1_max: round(pace + 1.15),
      z2_min: round(pace + 1.15),
      z2_max: round(pace + 0.75),
      z3_min: round(pace + 0.75),
      z3_max: round(pace + 0.35),
      z4_min: round(pace + 0.35),
      z4_max: round(pace + 0.05),
      z5_min: round(pace + 0.05),
      z5_max: round(pace - 0.25),
    }
  }

  if (testType === '3km') {
    return {
      z1_min: round(pace + 1.3),
      z1_max: round(pace + 1.0),
      z2_min: round(pace + 1.0),
      z2_max: round(pace + 0.45),
      z3_min: round(pace + 0.45),
      z3_max: round(pace + 0.15),
      z4_min: round(pace + 0.15),
      z4_max: round(pace - 0.1),
      z5_min: round(pace - 0.1),
      z5_max: round(pace - 0.35),
    }
  }

  return {
    z1_min: round(pace + 1.2),
    z1_max: round(pace + 0.9),
    z2_min: round(pace + 0.9),
    z2_max: round(pace + 0.4),
    z3_min: round(pace + 0.4),
    z3_max: round(pace + 0.1),
    z4_min: round(pace + 0.1),
    z4_max: round(pace - 0.1),
    z5_min: round(pace - 0.1),
    z5_max: round(pace - 0.3),
  }
}