import { api } from 'client/network-utils/api'
import React, { useState, createContext, useEffect } from 'react'
import { TChatMessage, LobbyMemberData, LobbyData, ReadyCheckMember } from 'state'
import { GameName } from 'state/games'
import { useUser } from './userCtx'

export type LobbyCtxValue = {
    members: LobbyMemberData[]
    setMembers: (value: LobbyMemberData[] | ((curr: LobbyMemberData[]) => LobbyMemberData[])) => void
    lobbyId: string
    setLobbyId: (value: string) => void
    gameName?: GameName
    setGameName: (value: GameName) => void
    chatMessages: TChatMessage[]
    setChatMessages: (value: TChatMessage[]) => void
    readyCheck: boolean
    setReadyCheck: (value: boolean) => void
    readyCheckMembers: ReadyCheckMember[]
    setReadyCheckMembers: React.Dispatch<React.SetStateAction<ReadyCheckMember[]>>
    exit: () => void
    destroy: () => void
    reset: () => void
    myRole: LobbyMemberData['role']
}

export const LobbyContext = createContext<LobbyCtxValue | null>(null)

interface Props {
    children?: JSX.Element
    lobby?: LobbyData
}

export const LobbyProvider: React.FC<Props> = ({ children, lobby }) => {
    const user = useUser()

    const [lobbyId, setLobbyId] = useState(lobby?.id || '')
    const [members, setMembers] = useState<LobbyMemberData[]>(lobby?.members || [])
    const [gameName, setGameName] = useState<GameName | undefined>(lobby?.gameName)
    const [chatMessages, setChatMessages] = useState<TChatMessage[]>([])

    const [readyCheck, setReadyCheck] = useState(Boolean(lobby?.readyCheck))
    const [readyCheckMembers, setReadyCheckMembers] = useState<ReadyCheckMember[]>(lobby?.readyCheck?.members || [])

    const reset = () => {
        setMembers([])
        setLobbyId('')
        setGameName(undefined)
        setChatMessages([])
    }

    const exit = () => {
        api.post('lobby-leave', { lobbyId })

        reset()
    }

    const destroy = () => {
        api.post('lobby-destroy', { lobbyId })

        reset()
    }

    useEffect(() => {
        if (!lobbyId) {
            document.body.dataset.hideTips = 'true'
        }
    }, [lobbyId])

    const value = {
        members,
        setMembers,
        lobbyId,
        setLobbyId,
        gameName,
        setGameName,
        chatMessages,
        setChatMessages,
        exit,
        destroy,
        reset,
        setReadyCheck,
        readyCheck,
        readyCheckMembers,
        setReadyCheckMembers,
        get myRole() {
            const me = members.find(p => p.id === user.id)

            if (!me || !me.role) {
                console.error('Player role is not defined', me)
            }

            return me?.role || 'spectator'
        }
    }

    return <LobbyContext.Provider value={value}>{children}</LobbyContext.Provider>
}

export const useLobby = () => {
    const ctx = React.useContext(LobbyContext)

    if (!ctx) {
        throw new Error('useLobby must be used within a LobbyProvider')
    }

    return ctx
}
