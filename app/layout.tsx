import type { Metadata } from 'next'
import './globals.css'

export const metadata = {
  title: 'Baby Tracker',
  manifest: '/manifest.json',
  themeColor: '#ffffff',
  colorScheme: 'light', // Force le thème clair
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="fr">
      <body className="bg-gray-50 min-h-screen">
        {children}
      </body>
    </html>
  )
}
