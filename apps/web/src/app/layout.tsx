import '@zekaix/ui/globals.css'

import type { Metadata } from 'next'
import { cn } from '@zekaix/utils/cn'
import { Toaster } from '@zekaix/ui/sonner'
import { siteConfig } from '@/config'
import { ThemeProvider } from '@/components/theme-provider'
import { Geist_Mono, Pixelify_Sans } from 'next/font/google'

const pixelifySans = Pixelify_Sans({
  subsets: ['latin'],
  variable: '--font-sans'
})

const fontMono = Geist_Mono({
  subsets: ['latin'],
  variable: '--font-mono'
})

export const metadata: Metadata = {
  title: {
    default: siteConfig.name,
    template: `%s - ${siteConfig.name}`
  },
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL!),
  description: siteConfig.description,
  keywords: [
    'multiplayer',
    'browser-based',
    'top-down shooter',
    'fast-paced',
    'no install'
  ],
  authors: [
    {
      name: 'nxtvoid',
      url: 'https://x.com/nxtvoid'
    }
  ],
  creator: 'nxtvoid',
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: process.env.NEXT_PUBLIC_APP_URL!,
    title: siteConfig.name,
    description: siteConfig.description,
    siteName: siteConfig.name,
    images: [
      {
        url: `${process.env.NEXT_PUBLIC_APP_URL}/opengraph-image.png`,
        width: 1200,
        height: 630,
        alt: siteConfig.name
      }
    ]
  },
  twitter: {
    card: 'summary_large_image',
    title: siteConfig.name,
    description: siteConfig.description,
    images: [`${process.env.NEXT_PUBLIC_APP_URL}/opengraph-image.png`],
    creator: '@nxtvoid'
  },
  icons: {
    icon: '/favicon.ico',
    shortcut: '/favicon-16x16.png',
    apple: '/apple-touch-icon.png'
  }
}

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang='en'
      suppressHydrationWarning
      className={cn(
        'antialiased',
        fontMono.variable,
        'font-sans',
        pixelifySans.variable
      )}
    >
      <body className='flex min-h-dvh flex-col bg-background text-foreground'>
        <ThemeProvider>
          {children}
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  )
}
