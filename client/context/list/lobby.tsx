import React, { useState, createContext } from 'react'
import { TChatMessage, TLobbyMember } from 'state'
import { GameName } from 'state/games'

export const LobbyContext = createContext({
    members: [] as TLobbyMember[],
    setMembers: (_value: TLobbyMember[]) => {},
    lobbyId: '',
    setLobbyId: (_value: string) => {},
    gameName: null as null | GameName,
    setGameName: (_value: GameName) => {},
    chatMessages: [] as TChatMessage[],
    setChatMessages: (_val: TChatMessage[]) => {}
})

interface Props {
    children?: JSX.Element
}

export const LobbyProvider: React.FC<Props> = props => {
    const [lobbyId, setLobbyId] = useState('')
    const [members, setMembers] = useState<TLobbyMember[]>([])
    const [gameName, setGameName] = useState<GameName | null>(null)
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
            {props.children}
        </LobbyContext.Provider>
    )
}
