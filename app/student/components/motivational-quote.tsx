'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Quote } from 'lucide-react'

const fallbackQuotes = [
  { text: "O único treino ruim é aquele que não aconteceu.", author: "Desconhecido" },
  { text: "Corra quando puder, ande se precisar, rasteje se necessário; apenas nunca desista.", author: "Dean Karnazes" },
  { text: "Correr é a maior metáfora para a vida, porque você consegue o que coloca nela.", author: "Oprah Winfrey" },
  { text: "O milagre não é eu ter terminado. O milagre é eu ter tido coragem de começar.", author: "John Bingham" },
  { text: "Não importa quão devagar você vá, você ainda está superando todos que estão no sofá.", author: "Desconhecido" },
  { text: "A dor é temporária. Desistir dura para sempre.", author: "Lance Armstrong" },
  { text: "Seus pés vão te perdoar... depois.", author: "Desconhecido" },
  { text: "Cada passo te leva mais perto do seu objetivo.", author: "Desconhecido" },
  { text: "A corrida é 90% mental e o resto é físico.", author: "Desconhecido" },
  { text: "Você é mais forte do que pensa.", author: "Desconhecido" },
  { text: "A linha de chegada é só o começo de uma nova corrida.", author: "Desconhecido" },
  { text: "Corra com o coração, não apenas com as pernas.", author: "Desconhecido" },
]

export function MotivationalQuote() {
  const [quote, setQuote] = useState<{ text: string; author: string } | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function fetchQuote() {
      try {
        // Try to fetch from a free quotes API
        const response = await fetch('https://api.quotable.io/random?tags=motivational|inspirational|sports', {
          signal: AbortSignal.timeout(3000),
        })
        
        if (response.ok) {
          const data = await response.json()
          setQuote({ text: data.content, author: data.author })
        } else {
          throw new Error('API error')
        }
      } catch {
        // Use fallback quote
        const randomIndex = Math.floor(Math.random() * fallbackQuotes.length)
        setQuote(fallbackQuotes[randomIndex])
      } finally {
        setIsLoading(false)
      }
    }

    fetchQuote()
  }, [])

  if (isLoading) {
    return (
      <Card className="bg-gradient-to-r from-accent/10 to-primary/5 border-accent/20">
        <CardContent className="py-6">
          <div className="flex items-start gap-4">
            <Quote className="h-8 w-8 text-accent/50 flex-shrink-0 mt-1" />
            <div className="space-y-2 flex-1">
              <div className="h-5 bg-muted rounded animate-pulse w-3/4" />
              <div className="h-5 bg-muted rounded animate-pulse w-1/2" />
              <div className="h-4 bg-muted rounded animate-pulse w-1/4 mt-3" />
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!quote) return null

  return (
    <Card className="bg-gradient-to-r from-accent/10 to-primary/5 border-accent/20">
      <CardContent className="py-6">
        <div className="flex items-start gap-4">
          <Quote className="h-8 w-8 text-accent flex-shrink-0 mt-1" />
          <div>
            <p className="text-lg font-medium italic text-white">
              {quote.text}
            </p>
            <p className="text-sm  text-white mt-2">
              — {quote.author}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
