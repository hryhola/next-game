import type { Metadata } from 'next'
import 'client/global'
import './globals.css'
import { appFontVariables } from './fonts'

export const metadata: Metadata = {
    title: 'Game Club',
    description: 'Realtime party game lobby'
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
    return (
        <html lang="en">
            <body className={appFontVariables} data-app-font="normal">
                {children}
            </body>
        </html>
    )
}
