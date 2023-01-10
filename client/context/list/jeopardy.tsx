import { TChatMessage, TLobbyMember } from 'model'
import { TJeopardyMember } from 'model/Jeopardy'
import React, { useState, createContext } from 'react'

export const JeopardyContext = createContext({
    members: [] as TJeopardyMember[],
    setMembers: (_value: TJeopardyMember[]) => {},
    chatMessages: [] as TChatMessage[],
    setChatMessages: (_value: TChatMessage[]) => {},
    name: '',
    setName: (_value: string) => {}
})

interface Props {
    children?: JSX.Element
}

export const LobbyProvider: React.FC<Props> = props => {
    const [name, setName] = useState('')
    const [members, setMembers] = useState<TJeopardyMember[]>([])
    const [chatMessages, setChatMessages] = useState<TChatMessage[]>([])

    return (
        <JeopardyContext.Provider
            value={{
                members,
                setMembers,
                chatMessages,
                setChatMessages,
                name,
                setName
            }}
        >
            {props.children}
        </JeopardyContext.Provider>
    )
}
