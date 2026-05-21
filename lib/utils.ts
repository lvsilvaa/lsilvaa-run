import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatPace(pace: number) {
  const minutes = Math.floor(pace)
  const seconds = Math.round((pace - minutes) * 60)

  return `${minutes}:${seconds.toString().padStart(2, '0')}/km`
}