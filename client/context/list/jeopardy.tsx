import { TChatMessage } from 'state'
import React, { useState, createContext } from 'react'

export const JeopardyContext = createContext({
    members: [] as any[],
    setMembers: (_value: any[]) => {},
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
    const [members, setMembers] = useState<any[]>([])
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
