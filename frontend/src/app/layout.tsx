import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Viola Fingering Generator',
  description: 'AI-powered viola fingering generation using Dyna-Q reinforcement learning',
  icons: {
    icon: '/viola.svg',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
