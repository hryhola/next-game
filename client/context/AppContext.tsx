import React from 'react'
import { ContextComposer } from './ContextComposer'
import { UserProvider } from './list/userCtx'
import { WSProvider } from './list/wsCtx'
import { LobbyProvider } from './list/lobbyCtx'
import { HomeProvider } from './list/homeCtx'
import { AudioProvider } from './list/audioCtx'
import type { LobbyData, UserData } from 'shared/contracts/app'

type Props = {
    children: React.ReactNode
    user?: UserData
    lobby?: LobbyData
}

export const AppContext: React.FC<Props> = props => (
    <ContextComposer components={[UserProvider, WSProvider, LobbyProvider, HomeProvider, AudioProvider]} props={props}>
        {props.children}
    </ContextComposer>
)
