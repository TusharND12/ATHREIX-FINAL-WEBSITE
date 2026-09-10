import type { Metadata } from 'next'
import './globals.css'
import { Stage } from '@/components/core/Stage'
import { SmoothScroll } from '@/components/SmoothScroll'

export const metadata: Metadata = {
  title: 'Athreix — Intelligence, engineered.',
  description:
    'Athreix builds AI systems that hold up in production. Ingestion through inference, wired as one machine.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="antialiased">
        {/* Mounted once, never unmounts. Everything else scrolls over it. */}
        <Stage />
        <SmoothScroll />
        {children}
      </body>
    </html>
  )
}
