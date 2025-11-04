import React from 'react'
import './globals.css'
import { Header } from './components/layout/Header'
import { Footer } from './components/layout/Footer'

export const metadata = {
  description: 'Infoshop - Community bookstore collective',
  title: 'Infoshop Bookstore',
}

export default async function RootLayout(props: { children: React.ReactNode }) {
  const { children } = props

  return (
    <html lang="en">
      <body className="min-h-screen bg-background font-sans antialiased">
        <div className="flex min-h-screen flex-col">
          <Header />
          <main className="flex-1">{children}</main>
          <Footer />
        </div>
      </body>
    </html>
  )
}
