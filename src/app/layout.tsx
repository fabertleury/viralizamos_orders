import React from 'react';

export const metadata = {
  title: 'Viralizamos Orders API',
  description: 'Microserviço de gestão de pedidos do sistema Viralizamos',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  )
} 