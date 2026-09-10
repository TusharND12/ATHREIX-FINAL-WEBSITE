import type { Metadata } from 'next'
import { Space_Grotesk, JetBrains_Mono } from 'next/font/google'
import './globals.css'
import { Stage } from '@/components/core/Stage'
import { SmoothScroll } from '@/components/SmoothScroll'

/**
 * Two faces, doing two jobs.
 *
 * Space Grotesk carries the headlines — geometric, slightly odd, engineered
 * rather than corporate. JetBrains Mono carries every label, readout and
 * measurement, which is what makes the chrome read as an instrument panel
 * instead of decoration.
 */
const display = Space_Grotesk({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-display',
  display: 'swap',
})

const mono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-mono',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Athreix — Intelligence, engineered.',
  description:
    'Athreix builds AI systems that hold up in production. Ingestion through inference, wired as one machine.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${mono.variable}`}>
      <body className="antialiased">
        {/* Mounted once, never unmounts. Everything else scrolls over it. */}
        <Stage />
        <SmoothScroll />
        {children}
      </body>
    </html>
  )
}
