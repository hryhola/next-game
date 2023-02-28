import { api } from 'client/network-utils/api'
import React, { useState, createContext, useEffect } from 'react'
import { TChatMessage, LobbyMemberData, LobbyData } from 'state'
import { GameName } from 'state/games'
import { URL as ApiUrl } from 'client/network-utils/const'
import { GeneralFailure, GeneralSuccess } from 'util/t'

type ReadyCheck = {
    members: string[]
    ready: string[]
}

export const LobbyContext = createContext({
    members: [] as LobbyMemberData[],
    setMembers: (_value: LobbyMemberData[] | ((curr: LobbyMemberData[]) => LobbyMemberData[])) => {},
    lobbyId: '',
    setLobbyId: (_value: string) => {},
    gameName: null as null | GameName,
    setGameName: (_value: GameName) => {},
    chatMessages: [] as TChatMessage[],
    setChatMessages: (_val: TChatMessage[]) => {},
    readyCheck: null as null | ReadyCheck,
    setReadyCheck: (_val: ReadyCheck) => {},
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
    const [readyCheck, setReadyCheck] = useState<ReadyCheck | null>(null)
    const [chatMessages, setChatMessages] = useState<TChatMessage[]>([])

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
                readyCheck
            }}
        >
            {children}
        </LobbyContext.Provider>
    )
}

export const useLobby = () => {
    return React.useContext(LobbyContext)
}
