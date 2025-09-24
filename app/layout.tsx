import './globals.css'
import { Inter } from 'next/font/google'
import { WalletProvider } from '@/components/providers/WalletProvider'
import { MemoryProvider } from '@/components/providers/MemoryProvider'
import { Toaster } from 'react-hot-toast'

const inter = Inter({ subsets: ['latin'] })

export const metadata = {
  title: 'BetterHalf.ai - Your AI Companion for Life',
  description: 'Your personalized AI companion that understands your schedule, preferences, and lifestyle to provide tailored recommendations and support.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <WalletProvider>
          <MemoryProvider>
            <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
              {children}
            </div>
            <Toaster 
              position="top-right"
              toastOptions={{
                duration: 4000,
                style: {
                  background: '#363636',
                  color: '#fff',
                },
              }}
            />
          </MemoryProvider>
        </WalletProvider>
      </body>
    </html>
  )
}



