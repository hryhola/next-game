import { TChatMessage, TLobbyMember } from 'model'
import React, { useState, createContext } from 'react'

export interface LobbyData {
    members: TLobbyMember[]
    setMembers: (value: TLobbyMember[]) => void
    chatMessages: TChatMessage[]
    setChatMessages: (value: TChatMessage[]) => void
    name: string
    setName: (value: string) => void
}

// @ts-ignore
export const LobbyContext = createContext<LobbyData>({})

interface Props {
    children?: JSX.Element
}

export const LobbyProvider: React.FC<Props> = props => {
    const [name, setName] = useState('')
    const [members, setMembers] = useState<TLobbyMember[]>([])
    const [chatMessages, setChatMessages] = useState<TChatMessage[]>([])

    return <LobbyContext.Provider value={{ members, setMembers, chatMessages, setChatMessages, name, setName }}>{props.children}</LobbyContext.Provider>
}
