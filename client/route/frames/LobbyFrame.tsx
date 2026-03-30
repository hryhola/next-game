import { useEffect, useRef, useState } from 'react'
import dynamic from 'next/dynamic'
import { useAudio, useEventHandler, useLobby, useUser, useWS } from 'client/context/list/'
import { useClientRouter } from 'client/route/ClientRouter'
import { LoadingOverlay } from 'client/ui'
import { useToast } from 'client/ui/toast/ToastProvider'
import { ReadyCheckDialog } from 'client/features/ready-check/ReadyCheckDialog'

export const LobbyFrame: React.FC = () => {
    const lobby = useLobby()
    const user = useUser()
    const lobbyRef = useRef(lobby)
    const ws = useWS()
    const audio = useAudio()
    const router = useClientRouter()

    const game = useRef<ReturnType<typeof dynamic<any>> | null>(null)
    const [isLoaded, setIsLoaded] = useState(false)

    const { push } = useToast()

    useEventHandler('Lobby-Join', data => {
        if (data.lobbyId !== lobbyRef.current.lobbyId) {
            return
        }

        lobby.setMembers(ms => [...ms.filter(m => m.id !== data.member.id), data.member])

        push({
            className: 'lobby-tip noselect',
            content: (
                <>
                    <span style={{ color: data.member?.userColor }}>{data.member.userNickname}</span> joined as{' '}
                    <span
                        style={{
                            color: data.member.memberRole === 'player' ? '#00ff00' : '#777777'
                        }}
                    >
                        {data.member.memberRole}
                    </span>
                </>
            )
        })
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
        }
    })

    useEventHandler('Lobby-Tipped', data => {
        if (data.lobbyId !== lobbyRef.current.lobbyId) {
            return
        }

        const from = lobbyRef.current.members.find(member => member.userNickname === data.from)
        const to = lobbyRef.current.members.find(member => member.userNickname === data.to)

        audio.play(Math.random() > 0.1 ? 'comp_coin.wav' : 'coins.wav')

        push({
            className: 'lobby-tip noselect',
            content: (
                <>
                    <span style={{ color: to?.userColor }}>{data.to}</span> tipped by <span style={{ color: from?.userColor }}>{data.from}</span>
                </>
            )
        })
    })

    useEventHandler('Lobby-Destroy', data => {
        if (data.lobbyId === lobbyRef.current.lobbyId) {
            push({
                content: 'Lobby has been destroyed'
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
        push({
            content: `${data.member.userNickname} has been kicked`
        })

        lobby.setMembers(members => members.filter(m => m.id !== data.member.id))

        if (data.member.id === user.id) {
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
        switch (lobby.gameName) {
            case 'Clicker': {
                game.current = dynamic(() => import('client/features/games/clicker/ClickerView').then(mod => mod.ClickerView), {
                    loading: () => <LoadingOverlay isLoading={true} />
                })
                break
            }
            case 'TicTacToe': {
                game.current = dynamic(() => import('client/features/games/tic-tac-toe/TicTacToeView').then(mod => mod.TicTacToeView), {
                    loading: () => <LoadingOverlay isLoading={true} />
                })
                break
            }
            case 'Jeopardy': {
                game.current = dynamic(() => import('client/features/games/jeopardy/JeopardyView').then(mod => mod.JeopardyView), {
                    loading: () => <LoadingOverlay isLoading={true} />
                })
                break
            }
            default: {
                return
            }
        }

        setIsLoaded(true)
    }, [])

    useEffect(() => {
        lobbyRef.current = lobby
    }, [lobby])

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
        }
    }, [ws.isConnected])

    const readyCheckVoted = typeof lobby.readyCheckMembers.find(m => m.id === user.id)?.ready === 'boolean'

    return (
        <>
            {isLoaded && game.current ? <game.current /> : null}
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
