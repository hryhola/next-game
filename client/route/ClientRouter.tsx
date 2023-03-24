import React, { useState, createContext } from 'react'
import { ErrorFrame } from './#common/ErrorFrame'
import { LoginFrame } from './frames/LoginFrame'
import { LobbyFrame } from './frames/LobbyFrame'
import { HomeFrame } from './frames/HomeFrame'
import { WsApp } from 'client/features/ws-app/WsApp'

const PageToFrameMap = {
    Login: <LoginFrame />,
    Home: <HomeFrame />,
    Lobby: <LobbyFrame />
}

export type FrameName = keyof typeof PageToFrameMap

export const ClientRouterContext = createContext({
    frame: 'Login' as FrameName,
    setFrame: (_val: FrameName) => {}
})

interface Props {
    initialFrame: FrameName
}

export const ClientRouterProvider: React.FC<Props> = props => {
    const [frame, setFrame] = useState<FrameName>(props.initialFrame)

    if (!frame || !(frame in PageToFrameMap)) {
        return <ErrorFrame />
    }

    let frameComponent = <WsApp>{PageToFrameMap[frame]}</WsApp>

    return <ClientRouterContext.Provider value={{ frame, setFrame }}>{frameComponent}</ClientRouterContext.Provider>
}

export const useClientRouter = () => {
    return React.useContext(ClientRouterContext)
}
