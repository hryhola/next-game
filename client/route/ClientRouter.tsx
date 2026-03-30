'use client'

import { useMemo } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { useLobby } from 'client/context/list'

export type FrameName = 'Login' | 'Home' | 'Lobby' | 'Admin'

function getFrameFromPathname(pathname?: string | null): FrameName {
    if (!pathname) {
        return 'Login'
    }

    if (pathname.startsWith('/lobby/')) {
        return 'Lobby'
    }

    if (pathname.startsWith('/home')) {
        return 'Home'
    }

    if (pathname.startsWith('/admin')) {
        return 'Admin'
    }

    return 'Login'
}

function getPathForFrame(frame: FrameName, lobbyId?: string): string {
    if (frame === 'Lobby') {
        return lobbyId ? `/lobby/${encodeURIComponent(lobbyId)}` : '/home'
    }

    if (frame === 'Home') {
        return '/home'
    }

    if (frame === 'Admin') {
        return '/admin'
    }

    return '/login'
}

export const useClientRouter = () => {
    const router = useRouter()
    const pathname = usePathname()
    const lobby = useLobby()

    return useMemo(
        () => ({
            frame: getFrameFromPathname(pathname),
            setFrame: (frame: FrameName) => {
                router.push(getPathForFrame(frame, lobby.lobbyId))
            },
            push: (href: string) => router.push(href),
            replace: (href: string) => router.replace(href),
            refresh: () => router.refresh()
        }),
        [lobby.lobbyId, pathname, router]
    )
}
