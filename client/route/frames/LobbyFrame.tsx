import { useEffect, useRef } from 'react'
import dynamic from 'next/dynamic'
import { useAudio, useEventHandler, useI18n, useLobby, useRequestHandler, useUser, useWS } from 'client/context/list/'
import { useClientRouter } from 'client/route/ClientRouter'
import { LoadingOverlay } from 'client/ui'
import { useToast } from 'client/ui/toast/ToastProvider'
import { useLobbyMessages } from 'client/features/lobby/useLobbyMessages'
import { ReadyCheckDialog } from 'client/features/ready-check/ReadyCheckDialog'

const ClickerView = dynamic(() => import('client/features/games/clicker/ClickerView').then(mod => mod.ClickerView), {
    loading: () => <LoadingOverlay isLoading={true} />
})

const TicTacToeView = dynamic(() => import('client/features/games/tic-tac-toe/TicTacToeView').then(mod => mod.TicTacToeView), {
    loading: () => <LoadingOverlay isLoading={true} />
})

const JeopardyView = dynamic(() => import('client/features/games/jeopardy/JeopardyView').then(mod => mod.JeopardyView), {
    loading: () => <LoadingOverlay isLoading={true} />
})

const gameViews = {
    Clicker: ClickerView,
    Jeopardy: JeopardyView,
    TicTacToe: TicTacToeView
} as const

export const LobbyFrame: React.FC = () => {
    const lobby = useLobby()
    const user = useUser()
    const lobbyRef = useRef(lobby)
    const ws = useWS()
    const audio = useAudio()
    const router = useClientRouter()

    const { push } = useToast()
    const { t, tMemberRole } = useI18n()
    const { appendLobbyMessage, createLobbySystemMessage } = useLobbyMessages()

    useRequestHandler('Chat-Get', data => {
        if (!data.success || data.scope !== 'lobby' || data.lobbyId !== lobbyRef.current.lobbyId) {
            return
        }

        lobbyRef.current.setChatMessages(curr => [...curr.filter(message => message.kind === 'system'), ...data.messages])
        lobbyRef.current.setIsChatHydrated(true)
    })

    useEventHandler('Chat-NewMessage', data => {
        if (data.scope !== 'lobby' || data.lobbyId !== lobbyRef.current.lobbyId) {
            return
        }

        appendLobbyMessage(data.message)
    })

    useEventHandler('Lobby-Join', data => {
        if (data.lobbyId !== lobbyRef.current.lobbyId) {
            return
        }

        lobby.setMembers(ms => [...ms.filter(m => m.id !== data.member.id), data.member])
        appendLobbyMessage(
            createLobbySystemMessage([
                { color: data.member.userColor, text: data.member.userNickname },
                { text: t('lobby.system.joinedAs') },
                { color: data.member.memberRole === 'player' ? '#00ff00' : '#777777', text: tMemberRole(data.member.memberRole) },
                { text: '.' }
            ])
        )
    })

    useEventHandler('Lobby-Leave', data => {
        if (data.lobbyId !== lobbyRef.current.lobbyId) {
            return
        }

        lobby.setMembers(ms => ms.filter(member => member.id !== data.member.id))
        appendLobbyMessage(createLobbySystemMessage([{ color: data.member.userColor, text: data.member.userNickname }, { text: t('lobby.system.left') }]))
    })

    useEventHandler('Lobby-MemberUpdate', data => {
        if (data.lobbyId === lobbyRef.current.lobbyId) {
            lobby.setMembers(ms =>
                ms.map(member =>
                    member.id === data.data.id
                        ? {
                              ...member,
                              ...data.data
                          }
                        : member
                )
            )
            lobby.setReadyCheckMembers(members =>
                members.map(member =>
                    member.id === data.data.id
                        ? {
                              ...member,
                              ...data.data
                          }
                        : member
                )
            )
        }
    })

    useEventHandler('Lobby-Tipped', data => {
        if (data.lobbyId !== lobbyRef.current.lobbyId) {
            return
        }

        const from = lobbyRef.current.members.find(member => member.userNickname === data.from)
        const to = lobbyRef.current.members.find(member => member.userNickname === data.to)

        audio.play(Math.random() > 0.1 ? 'comp_coin.wav' : 'coins.wav')
        appendLobbyMessage(
            createLobbySystemMessage([
                { color: from?.userColor, text: data.from },
                { text: t('lobby.system.tipped') },
                { color: to?.userColor, text: data.to },
                { text: '.' }
            ])
        )
    })

    useEventHandler('Lobby-Destroy', data => {
        if (data.lobbyId === lobbyRef.current.lobbyId) {
            push({
                content: t('lobby.destroyed'),
                duration: 2400,
                persistOnNextMount: true
            })

            ws.send('Universal-Subscription', {
                mode: 'unsubscribe',
                lobbyId: lobby.lobbyId,
                topic: 'all'
            })

            lobby.reset()
            router.setFrame('Home')
        }
    })

    useEventHandler('ReadyCheck-Start', data => {
        lobby.setReadyCheckMembers(data.members)
        lobby.setReadyCheck(true)
        audio.play('ready_check_start.mp3.mpeg')
    })

    useEventHandler('ReadyCheck-PlayerStatus', data => {
        lobby.setReadyCheckMembers(members =>
            members.map(m => {
                if (m.userNickname === data.userNickname) {
                    return {
                        ...m,
                        ready: data.ready
                    }
                }

                return m
            })
        )
    })

    useEventHandler('ReadyCheck-End', data => {
        setTimeout(() => lobby.setReadyCheck(false), 2000)

        audio.play(data.status === 'success' ? 'ready_check_success.mp3.mpeg' : 'ready_check_failure.mp3.mpeg')
    })

    useEventHandler('Lobby-Kicked', data => {
        lobby.setMembers(members => members.filter(m => m.id !== data.member.id))
        appendLobbyMessage(createLobbySystemMessage([{ color: data.member.userColor, text: data.member.userNickname }, { text: t('lobby.system.kicked') }]))

        if (data.member.id === user.id) {
            push({
                content: t('lobby.kickedToast', { name: data.member.userNickname })
            })

            ws.send('Universal-Subscription', {
                mode: 'unsubscribe',
                lobbyId: lobby.lobbyId,
                topic: 'all'
            })

            lobby.reset()
            router.setFrame('Home')
        }
    })

    useEffect(() => {
        lobbyRef.current = lobby
    }, [lobby])

    // Keep LobbyFrame game-agnostic. Game-specific reactions to shared realtime events
    // belong inside each game's feature tree, not in this route shell.

    const sendSubscribeRequest = () => {
        ws.send('Universal-Subscription', {
            mode: 'subscribe',
            lobbyId: lobby.lobbyId,
            topic: 'all'
        })
    }

    useEffect(() => {
        if (ws.isConnected) {
            sendSubscribeRequest()
            ws.send('Chat-Get', {
                lobbyId: lobby.lobbyId,
                scope: 'lobby'
            })
        }
    }, [ws.isConnected])

    const readyCheckVoted = typeof lobby.readyCheckMembers.find(m => m.id === user.id)?.ready === 'boolean'
    const GameView = lobby.gameName ? gameViews[lobby.gameName] : null

    return (
        <>
            {GameView ? <GameView /> : <LoadingOverlay isLoading={true} text={t('common.loading')} />}
            {lobby.readyCheck && (
                <ReadyCheckDialog
                    members={lobby.readyCheckMembers}
                    voted={readyCheckVoted}
                    onReady={() => ws.send('ReadyCheck-Response', { lobbyId: lobby.lobbyId, ready: true })}
                    onNotReady={() => ws.send('ReadyCheck-Response', { lobbyId: lobby.lobbyId, ready: false })}
                />
            )}
        </>
    )
}
