import type { Metadata } from 'next'
import 'client/global'
import './globals.css'

export const metadata: Metadata = {
    title: 'Game Club',
    description: 'Realtime party game lobby'
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
    return (
        <html lang="en">
            <body>{children}</body>
        </html>
    )
}
