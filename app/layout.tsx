import './globals.css'
import { Inter } from 'next/font/google'
import { WalletProvider } from '@/components/providers/WalletProvider'
import { MemoryProvider } from '@/components/providers/MemoryProvider'
import { Toaster } from 'react-hot-toast'

const inter = Inter({ subsets: ['latin'] })

export const metadata = {
  title: 'Privacy-First AI Memory Platform',
  description: 'Decentralized AI memory storage with privacy controls',
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



