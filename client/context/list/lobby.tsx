import { SnackbarContent, SnackbarProvider } from 'notistack'
import React, { useState, createContext } from 'react'
import { TChatMessage, LobbyMemberData, LobbyData, Tip } from 'state'
import { GameName } from 'state/games'

export const LobbyContext = createContext({
    members: [] as LobbyMemberData[],
    setMembers: (_value: LobbyMemberData[]) => {},
    lobbyId: '',
    setLobbyId: (_value: string) => {},
    gameName: null as null | GameName,
    setGameName: (_value: GameName) => {},
    chatMessages: [] as TChatMessage[],
    setChatMessages: (_val: TChatMessage[]) => {}
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
                setChatMessages
            }}
        >
            <SnackbarProvider maxSnack={5} dense>
                {children}
            </SnackbarProvider>
        </LobbyContext.Provider>
    )
}
