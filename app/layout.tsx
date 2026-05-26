import type { Metadata, Viewport } from 'next'
import {Montserrat} from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import { Toaster } from '@/components/ui/sonner'
import './globals.css'
import Registersw from '@/components/Registersw'


const montserrat = Montserrat({ 
  subsets: ['latin'],
  variable: "--font-montserrat",
  weight: ["400", "500", "600", "700", "800"],
})

export const metadata: Metadata = {
  title: 'Lsilvaa Running | Gestão de Treinos',
  description: 'Plataforma de gestão de treinos de corrida - Lsilvaa Running',
   manifest: '/manifest.json',
    themeColor: '#1a1d23',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Lsilvaa Running',
  },
  icons: {
    apple: '/icons/icon-192x192.png',
  
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
      <head>
        <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Lsilvaa Running" />

      </head>
      <body className={`${montserrat.variable} font-sans antialiased`}>
        {children}
        <Toaster />
        {process.env.NODE_ENV === 'production' && <Analytics />}
        <Registersw/>
      </body>
    </html>
  )
}
