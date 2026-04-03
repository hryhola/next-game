import React from 'react'
import { useI18n, useLobby } from 'client/context/list'
import type { TChatMessage, TChatMessagePart } from 'shared/contracts/app'

export const useLobbyMessages = () => {
    const lobby = useLobby()
    const { t } = useI18n()
    const lobbyRef = React.useRef(lobby)

    React.useEffect(() => {
        lobbyRef.current = lobby
    }, [lobby])

    const appendLobbyMessage = React.useCallback((message: TChatMessage) => {
        lobbyRef.current.setChatMessages(curr => [message, ...curr.filter(existing => existing.id !== message.id)])
    }, [])

    const createLobbySystemMessage = React.useCallback(
        (parts: TChatMessagePart[]): TChatMessage => ({
            id: crypto.randomUUID(),
            from: t('lobby.systemName'),
            kind: 'system',
            parts,
            text: parts.map(part => part.text).join('')
        }),
        [t]
    )

    const appendLobbySystemMessage = React.useCallback(
        (parts: TChatMessagePart[]) => {
            appendLobbyMessage(createLobbySystemMessage(parts))
        },
        [appendLobbyMessage, createLobbySystemMessage]
    )

    return {
        appendLobbyMessage,
        appendLobbySystemMessage,
        createLobbySystemMessage
    }
}
