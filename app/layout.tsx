import type { Metadata, Viewport } from 'next'
import {Montserrat} from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import { Toaster } from '@/components/ui/sonner'
import './globals.css'


const montserrat = Montserrat({ 
  subsets: ['latin'],
  variable: "--font-montserrat",
  weight: ["400", "500", "600", "700", "800"],
})

export const metadata: Metadata = {
  title: 'Lsilvaa Running | Gestão de Treinos',
  description: 'Plataforma de gestão de treinos de corrida - Lsilvaa Running',
   manifest: '/manifest.json',
  icons: {
    icon: [
      {
        url: '/images/logo.png',
        media: '(prefers-color-scheme: light)',
      },
      {
        url: '/images/logo.png',
        media: '(prefers-color-scheme: dark)',
      },
    ],
  },
}

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f8fafc' },
    { media: '(prefers-color-scheme: dark)', color: '#1a1d23' },
  ],
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="pt-BR" className="bg-background">
      <body className={`${montserrat.variable} font-sans antialiased`}>
        {children}
        <Toaster />
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
