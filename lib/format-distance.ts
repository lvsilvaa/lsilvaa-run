/**
 * Formata distância em km para exibição amigável
 * - Valores < 1km são exibidos em metros (ex: 800m)
 * - Valores >= 1km são exibidos em km (ex: 5.2km)
 */
export function formatDistance(distanceKm: number | null | undefined): string {
  // Converter para número e garantir que é válido
  const distance = Number(distanceKm)
  
  if (!distance || distance === 0 || isNaN(distance)) return '0m'
  
  if (distance < 1) {
    // Converter para metros
    const meters = Math.round(distance * 1000)
    return `${meters}m`
  }
  
  // Manter em km com 1 casa decimal
  return `${distance.toFixed(1)}km`
}

// Made with Bob
