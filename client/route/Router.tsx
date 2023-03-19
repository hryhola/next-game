import React, { useState, createContext } from 'react'
import { ValueOf } from 'next/dist/shared/lib/constants'
import { ErrorFrame } from './#common/ErrorFrame'
import { LoginFrame } from './main/LoginFrame'
import { LobbyFrame } from './main/LobbyFrame'
import { HomeFrame } from './main/HomeFrame'
import { PackEditorFrame } from './pack-editor/PackEditorFrame'
import { WsApp } from 'client/features/ws-app/WsApp'

export type PageFrames = {
    main: 'Login' | 'Home' | 'Lobby'
    packEditor: 'PackEditor'
}

export type Frame = ValueOf<PageFrames>

const frameMap: Record<string, Record<string, JSX.Element>> = {
    main: {
        Login: <LoginFrame />,
        Home: <HomeFrame />,
        Lobby: <LobbyFrame />
    },
    packEditor: {
        PackEditor: <PackEditorFrame />
    }
}

export const RouterContext = createContext({
    frame: 'Login' as Frame,
    setFrame: (_val: Frame) => {}
})

interface Props {
    page: keyof PageFrames
    defaultFrame: ValueOf<PageFrames>
}

export const RouterProvider: React.FC<Props> = props => {
    const [frame, setFrame] = useState<Frame>(props.defaultFrame)

    var page = frameMap[props.page]

    if (!page || !(frame in page) || !page[frame]) {
        return <ErrorFrame />
    }

    let frameComponent = page[frame]

    switch (props.page) {
        case 'main':
            frameComponent = <WsApp>{frameComponent}</WsApp>
            break
        default:
            frameComponent = frameComponent
    }

    return <RouterContext.Provider value={{ frame, setFrame }}>{frameComponent}</RouterContext.Provider>
}

export const useRouter = () => {
    return React.useContext(RouterContext)
}
