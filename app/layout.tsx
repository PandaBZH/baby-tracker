import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Bébé Tracker',
  description: 'Suivi quotidien de bébé',
    themeColor: '#ffffff',
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
