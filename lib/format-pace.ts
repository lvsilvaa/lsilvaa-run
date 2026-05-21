export function formatPace(paceDecimal: number): string {
  const minutes = Math.floor(paceDecimal)
  const seconds = Math.round((paceDecimal - minutes) * 60)
  return `${minutes}:${seconds.toString().padStart(2, '0')}`
}