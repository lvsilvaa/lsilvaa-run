'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Logo } from '@/components/logo'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { toast } from 'sonner'
import { Eye, EyeOff } from 'lucide-react'

export default function LoginPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [showCoachPassword, setShowCoachPassword] = useState(false)
  const [showStudentPassword, setShowStudentPassword] = useState(false)

  async function handleCoachLogin(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setIsLoading(true)
    
    const formData = new FormData(e.currentTarget)
    const email = formData.get('email') as string
    const password = formData.get('password') as string

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, role: 'coach' }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Erro ao fazer login')
      }

      toast.success('Login realizado com sucesso!')
      router.push('/coach')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao fazer login')
    } finally {
      setIsLoading(false)
    }
  }

  async function handleStudentLogin(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setIsLoading(true)
    
    const formData = new FormData(e.currentTarget)
    const email = formData.get('email') as string
    const password = formData.get('password') as string

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, role: 'student' }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Erro ao fazer login')
      }

      toast.success('Login realizado com sucesso!')
      router.push('/student')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao fazer login')
    } finally {
      setIsLoading(false)
    }
  }

  async function handleCoachRegister(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setIsLoading(true)
    
    const formData = new FormData(e.currentTarget)
    const name = formData.get('name') as string
    const email = formData.get('email') as string
    const password = formData.get('password') as string

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password, role: 'coach' }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Erro ao criar conta')
      }

      toast.success('Conta criada com sucesso!')
      router.push('/coach')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao criar conta')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen relative overflow-hidden bg-black">

      {/* BG EFFECTS */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(34,197,94,0.15),transparent_40%)]" />
      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:40px_40px]" />

      {/* CONTENT */}
      <div className="relative z-10 min-h-screen flex flex-col">

        {/* HERO */}
        <section className="flex-1 flex items-center justify-center px-6 py-16">
          <div className="w-full max-w-7xl grid lg:grid-cols-2 gap-16 items-center">

            {/* LEFT */}
            <div className="space-y-8">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 backdrop-blur-sm px-4 py-1.5 text-sm text-zinc-300 shadow-lg">
                <div className="h-2 w-2 rounded-full bg-green-400 animate-pulse" />
                Plataforma inteligente de treinos
              </div>

              <div className="space-y-5">
                <h1 className="text-5xl md:text-7xl font-black tracking-tight text-white leading-[1]">
                  Evolua sua
                  <span className="block bg-gradient-to-r from-green-400 to-emerald-600 bg-clip-text text-transparent">
                    performance
                  </span>
                  com precisão
                </h1>

                <p className="text-zinc-400 text-lg leading-relaxed max-w-2xl">
                  Gerencie atletas, monte treinos inteligentes,
                  acompanhe evolução e entregue uma experiência
                  profissional para corrida, triathlon e performance.
                </p>
              </div>

              {/* FEATURES */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4">
                <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md p-5">
                  <div className="text-3xl mb-3">🏃</div>
                  <h3 className="text-white font-semibold mb-2">Treinos Inteligentes</h3>
                  <p className="text-zinc-400 text-sm">Pace automático, zonas e cálculo inteligente.</p>
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md p-5">
                  <div className="text-3xl mb-3">📈</div>
                  <h3 className="text-white font-semibold mb-2">Gestão Completa</h3>
                  <p className="text-zinc-400 text-sm">Controle total dos seus atletas.</p>
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md p-5">
                  <div className="text-3xl mb-3">⚡</div>
                  <h3 className="text-white font-semibold mb-2">Alta Performance</h3>
                  <p className="text-zinc-400 text-sm">Plataforma feita para treinadores modernos.</p>
                </div>
              </div>
            </div>

            {/* RIGHT - LOGIN */}
            <div className="flex justify-center lg:justify-end">
              <Card className="w-full max-w-md border-white/10 bg-white/5 backdrop-blur-xl shadow-[0_0_50px_rgba(0,0,0,0.5)] rounded-3xl">

                <CardHeader className="space-y-4">
                  <div className="flex justify-center">
                    <Logo />
                  </div>
                  <div className="text-center">
                    <CardTitle className="text-3xl text-white font-bold">Bem-vindo</CardTitle>
                    <CardDescription className="text-zinc-400 mt-2">
                      Acesse sua plataforma de treinamento
                    </CardDescription>
                  </div>
                </CardHeader>

                <CardContent>
                  <Tabs defaultValue="coach" className="w-full">

                    <TabsList className="grid w-full grid-cols-2 bg-zinc-900/70 border border-white/10">
                      <TabsTrigger value="coach">Treinador</TabsTrigger>
                      <TabsTrigger value="student">Aluno</TabsTrigger>
                    </TabsList>

                    {/* LOGIN COACH */}
                    <TabsContent value="coach">
                      <form onSubmit={handleCoachLogin} className="space-y-4 mt-6">

                        <div className="space-y-2">
                          <Label className="text-white">Email</Label>
                          <Input
                            name="email"
                            type="email"
                            required
                            className="bg-zinc-900/70 border-white/10 text-white"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label className="text-white">Senha</Label>
                          <div className="relative">
                            <Input
                              name="password"
                              type={showCoachPassword ? 'text' : 'password'}
                              required
                              className="bg-zinc-900/70 border-white/10 text-white pr-10"
                            />
                            <button
                              type="button"
                              onClick={() => setShowCoachPassword(!showCoachPassword)}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white transition-colors"
                            >
                              {showCoachPassword
                                ? <EyeOff className="h-4 w-4" />
                                : <Eye className="h-4 w-4" />
                              }
                            </button>
                          </div>
                        </div>

                        <Button
                          type="submit"
                          disabled={isLoading}
                          className="w-full h-11 rounded-xl bg-green-500 hover:bg-green-400 text-black font-semibold"
                        >
                          {isLoading ? 'Entrando...' : 'Entrar como treinador'}
                        </Button>

                      </form>
                    </TabsContent>

                    {/* LOGIN STUDENT */}
                    <TabsContent value="student">
                      <form onSubmit={handleStudentLogin} className="space-y-4 mt-6">

                        <div className="space-y-2">
                          <Label className="text-white">Email</Label>
                          <Input
                            name="email"
                            type="email"
                            required
                            className="bg-zinc-900/70 border-white/10 text-white"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label className="text-white">Senha</Label>
                          <div className="relative">
                            <Input
                              name="password"
                              type={showStudentPassword ? 'text' : 'password'}
                              required
                              className="bg-zinc-900/70 border-white/10 text-white pr-10"
                            />
                            <button
                              type="button"
                              onClick={() => setShowStudentPassword(!showStudentPassword)}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white transition-colors"
                            >
                              {showStudentPassword
                                ? <EyeOff className="h-4 w-4" />
                                : <Eye className="h-4 w-4" />
                              }
                            </button>
                          </div>
                        </div>

                        <Button
                          type="submit"
                          disabled={isLoading}
                          className="w-full h-11 rounded-xl bg-green-500 hover:bg-green-400 text-black font-semibold"
                        >
                          {isLoading ? 'Entrando...' : 'Entrar como aluno'}
                        </Button>

                      </form>
                    </TabsContent>

                  </Tabs>
                </CardContent>
              </Card>
            </div>

          </div>
        </section>

        {/* FOOTER */}
        <footer className="relative overflow-hidden border-t border-white/10 bg-gradient-to-r from-zinc-950 via-zinc-900 to-zinc-950">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(34,197,94,0.15),transparent_60%)]" />
          <div className="relative max-w-7xl mx-auto px-6 py-6 flex flex-col md:flex-row items-center justify-between gap-4">
            <div>
              <h3 className="text-white font-semibold tracking-wide">Run Performance System</h3>
              <p className="text-sm text-zinc-400">Plataforma de treinos e acompanhamento esportivo</p>
            </div>
            <div className="text-center md:text-right">
              <p className="text-sm text-zinc-300">Produzido e administrado por</p>
              <p className="text-white font-semibold">Leonardo Silva</p>
              <p className="text-xs text-green-400">(21) 99171-3469</p>
            </div>
          </div>
        </footer>

      </div>
    </div>
  )
}