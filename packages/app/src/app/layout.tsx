import type { Metadata, Viewport } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import { Navbar } from './_components/layout/navbar';
import { ColorProvider } from './_contexts/color-context';

import './globals.css';
import { ThemeProvider } from 'next-themes';
import { SessionProvider } from 'next-auth/react';
import { ChainProvider } from './_contexts/chain/provider';
const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'X402 Place - Collaborative Pixel Canvas',
  description:
    'A collaborative pixel canvas where users can place pixels and create art together in real-time via x402.',
};

export const viewport: Viewport = {
  width: 'device-width',
  height: 'device-height',
  initialScale: 1,
  minimumScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: [
    { media: '(prefers-color-scheme: dark)', color: '#090909' },
    { media: '(prefers-color-scheme: light)', color: 'white' },
  ],
};

export default async function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <SessionProvider>
        <ChainProvider>
          <ThemeProvider
            attribute="class"
            defaultTheme="light"
            storageKey="xplace-theme"
            enableSystem={true}
          >
            <ColorProvider>
              <div className="h-screen flex flex-col overflow-hidden">
                <Navbar />
                <main className="flex-1 overflow-hidden bg-background">
                  {children}
                </main>
              </div>
            </ColorProvider>
          </ThemeProvider>
        </ChainProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
