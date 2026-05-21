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

export function calculateZones(threeKmTimeSeconds: number): TrainingZones {
  // pace médio do teste em min/km
  const pace = threeKmTimeSeconds / 3 / 60

  return {
    // regenerativo
    z1_min: pace + 1.3,
    z1_max: pace + 1.0,

    // leve
    z2_min: pace + 1.0,
    z2_max: pace + 0.45,

    // moderado
    z3_min: pace + 0.45,
    z3_max: pace + 0.15,

    // limiar
    z4_min: pace + 0.15,
    z4_max: pace - 0.10,

    // VO2
    z5_min: pace - 0.10,
    z5_max: pace - 0.35,
  }
}