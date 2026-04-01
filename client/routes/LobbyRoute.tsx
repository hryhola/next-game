'use client'

import { useState } from 'react'
import { RouteProviders } from 'client/app/RouteProviders'
import { LobbyFrame } from 'client/route/frames/LobbyFrame'
import { useClientRouter } from 'client/route/ClientRouter'
import { FullScreenModal } from 'client/ui/full-screen-modal/FullScreenModal'
import { LobbyPreview } from 'client/features/lobby-browser/LobbyPreview'
import { WsApp } from 'client/features/ws-app/WsApp'
import type { LobbyData, UserData } from 'shared/contracts/app'
import { useI18n } from 'client/context/list'

type Props = {
    user: UserData
    lobby: LobbyData
    isMember: boolean
}

const JoinLobbyShell: React.FC<{ lobby: LobbyData }> = ({ lobby }) => {
    const router = useClientRouter()
    const [isOpen, setIsOpen] = useState(true)
    const { t } = useI18n()

    return (
        <div className="flex h-[var(--fullHeight)] overflow-y-auto px-6">
            <div className="m-auto flex w-full items-center justify-center py-6">
                <div className="glass-card flex w-full max-w-2xl items-center justify-center p-10 text-center text-slate-200">
                    <div>
                        <p className="text-sm uppercase tracking-[0.35em] text-violet-200/60">{t('lobby.access')}</p>
                        <h1 className="mt-4 text-4xl font-semibold text-white">{t('lobby.joinTitle', { id: lobby.id })}</h1>
                        <p className="mt-3 text-base text-slate-300">{t('lobby.joinSubtitle')}</p>
                    </div>
                </div>
            </div>
            <FullScreenModal
                isOpen={isOpen}
                setIsOpen={value => {
                    setIsOpen(value)

                    if (!value) {
                        router.setFrame('Home')
                    }
                }}
                label={t('lobby.joinTitle', { id: lobby.id })}
                padding
            >
                <LobbyPreview lobby={lobby} />
            </FullScreenModal>
        </div>
    )
}

export const LobbyRoute: React.FC<Props> = ({ user, lobby, isMember }) => {
    return (
        <RouteProviders user={user} lobby={lobby}>
            {isMember ? (
                <WsApp>
                    <LobbyFrame />
                </WsApp>
            ) : (
                <JoinLobbyShell lobby={lobby} />
            )}
        </RouteProviders>
    )
}
