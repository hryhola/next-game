import { api } from 'client/network-utils/api'
import { SnackbarContent, SnackbarProvider } from 'notistack'
import React, { useState, createContext, useContext, useEffect } from 'react'
import { TChatMessage, LobbyMemberData, LobbyData, Tip } from 'state'
import { GameName } from 'state/games'
import { WSContext } from './ws'
import { URL as ApiUrl } from 'client/network-utils/const'
import { GeneralFailure, GeneralSuccess } from 'util/t'

export const LobbyContext = createContext({
    members: [] as LobbyMemberData[],
    setMembers: (_value: LobbyMemberData[] | ((curr: LobbyMemberData[]) => LobbyMemberData[])) => {},
    lobbyId: '',
    setLobbyId: (_value: string) => {},
    gameName: null as null | GameName,
    setGameName: (_value: GameName) => {},
    chatMessages: [] as TChatMessage[],
    setChatMessages: (_val: TChatMessage[]) => {},
    setIsTipsVisible: (_val: boolean) => {},
    exit: () => {},
    destroy: () => {},
    reset: () => {}
})

interface Props {
    children?: JSX.Element
    lobby?: LobbyData
}

export const LobbyProvider: React.FC<Props> = ({ children, lobby }) => {
    const [lobbyId, setLobbyId] = useState(lobby?.id || '')
    const [members, setMembers] = useState<LobbyMemberData[]>(lobby?.members || [])
    const [gameName, setGameName] = useState<GameName | null>(lobby?.gameName || null)
    const [chatMessages, setChatMessages] = useState<TChatMessage[]>([])
    const [isTipsVisible, setIsTipsVisible] = useState(true)

    const reset = () => {
        setMembers([])
        setLobbyId('')
        setGameName(null)
        setChatMessages([])
    }

    const exit = () => {
        api.post<GeneralSuccess | GeneralFailure>(ApiUrl.LobbyLeave, { lobbyId })

        reset()
    }

    const destroy = () => {
        api.post<GeneralSuccess | GeneralFailure>(ApiUrl.LobbyDestroy, { lobbyId })

        reset()
    }

    useEffect(() => {
        if (!lobbyId) {
            setIsTipsVisible(false)
        }
    }, [lobbyId])

    return (
        <LobbyContext.Provider
            value={{
                members,
                setMembers,
                lobbyId,
                setLobbyId,
                gameName,
                setGameName,
                chatMessages,
                setChatMessages,
                setIsTipsVisible,
                exit,
                destroy,
                reset
            }}
        >
            <SnackbarProvider
                maxSnack={5}
                classes={{
                    root: 'SnackbarProvider-root',
                    containerRoot: 'SnackbarProvider-containerRoot'
                }}
                hidden={!isTipsVisible}
                dense
            >
                {children}
            </SnackbarProvider>
        </LobbyContext.Provider>
    )
}
