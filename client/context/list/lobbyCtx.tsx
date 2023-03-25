import { api } from 'client/network-utils/api'
import React, { useState, createContext, useEffect } from 'react'
import { TChatMessage, LobbyMemberData, LobbyData, ReadyCheckMember } from 'state'
import { GameName } from 'state/games'
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
    readyCheck: false,
    setReadyCheck: (_val: boolean) => {},
    readyCheckMembers: [] as ReadyCheckMember[],
    setReadyCheckMembers: ((_val: ReadyCheckMember[]) => {}) as React.Dispatch<React.SetStateAction<ReadyCheckMember[]>>,
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

    const [readyCheck, setReadyCheck] = useState(Boolean(lobby?.readyCheck))
    const [readyCheckMembers, setReadyCheckMembers] = useState<ReadyCheckMember[]>(lobby?.readyCheck?.members || [])

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
            document.body.dataset.hideTips = 'true'
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
                exit,
                destroy,
                reset,
                setReadyCheck,
                readyCheck,
                readyCheckMembers,
                setReadyCheckMembers
            }}
        >
            {children}
        </LobbyContext.Provider>
    )
}

export const useLobby = () => {
    return React.useContext(LobbyContext)
}
