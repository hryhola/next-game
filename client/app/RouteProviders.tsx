'use client'

import React from 'react'
import { AppContext } from 'client/context/AppContext'
import { GlobalModalProvider } from 'client/features/global-modal/GlobalModal'
import { SvgFilters } from 'client/ui/filters/SvgFilters'
import { ViewportHeight } from './ViewportHeight'
import type { LobbyData, UserData } from 'shared/contracts/app'
import { ToastProvider } from 'client/ui/toast/ToastProvider'

type Props = {
    children: React.ReactNode
    user?: UserData
    lobby?: LobbyData
}

export const RouteProviders: React.FC<Props> = ({ children, user, lobby }) => {
    return (
        <ToastProvider>
            <AppContext user={user} lobby={lobby}>
                <ViewportHeight />
                <SvgFilters />
                <GlobalModalProvider>{children}</GlobalModalProvider>
            </AppContext>
        </ToastProvider>
    )
}
