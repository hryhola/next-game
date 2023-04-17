import { useEffect, useRef, useState } from 'react'
import { useSnackbar } from 'notistack'
import dynamic from 'next/dynamic'
import { Button, Dialog, DialogActions, DialogContent, DialogTitle, Grid } from '@mui/material'
import { useAudio, useEventHandler, useLobby, useUser, useWS } from 'client/context/list/'
import { useClientRouter } from 'client/route/ClientRouter'
import { ProfilePicture } from 'client/features/profile-picture/ProfilePicture'
import { LoadingOverlay } from 'client/ui'

export const LobbyFrame: React.FC = () => {
    const lobby = useLobby()
    const user = useUser()
    const lobbyRef = useRef(lobby)
    const ws = useWS()
    const audio = useAudio()
    const router = useClientRouter()

    const game = useRef<ReturnType<typeof dynamic<any>> | null>(null)
    const [isLoaded, setIsLoaded] = useState(false)

    const { enqueueSnackbar } = useSnackbar()

    useEventHandler('Lobby-Join', data => {
        if (data.lobbyId !== lobbyRef.current.lobbyId) {
            return
        }

        lobby.setMembers(ms => [...ms.filter(m => m.nickname !== data.member.nickname), data.member])

        enqueueSnackbar(
            <>
                <span style={{ color: data.member?.nicknameColor }}>{data.member.nickname}</span> joined as{' '}
                <span
                    style={{
                        color: data.member.role === 'player' ? '#00ff00' : '#777777'
                    }}
                >
                    {data.member.role}
                </span>
            </>,
            {
                content: (key, message) => (
                    <div className="lobby-tip noselect" key={key}>
                        {message}
                    </div>
                )
            }
        )
    })

    useEventHandler('Lobby-MemberUpdate', data => {
        if (data.lobbyId === lobbyRef.current.lobbyId) {
            lobby.setMembers(ms => {
                const index = ms.findIndex(m => m.id === data.memberId)

                if (index === -1) {
                    return ms
                }

                Object.assign(ms[index], data.data)

                return ms
            })
        }
    })

    useEventHandler('Lobby-Tipped', data => {
        if (data.lobbyId !== lobbyRef.current.lobbyId) {
            return
        }

        const from = lobbyRef.current.members.find(member => member.nickname === data.from)
        const to = lobbyRef.current.members.find(member => member.nickname === data.to)

        audio.play(Math.random() > 0.1 ? 'comp_coin.wav' : 'coins.wav')

        enqueueSnackbar(
            <>
                <span style={{ color: to?.nicknameColor }}>{data.to}</span> tipped by <span style={{ color: from?.nicknameColor }}>{data.from}</span>
            </>,
            {
                content: (key, message) => (
                    <div className="lobby-tip noselect" key={key}>
                        {message}
                    </div>
                )
            }
        )
    })

    useEventHandler('Lobby-Destroy', data => {
        if (data.lobbyId === lobbyRef.current.lobbyId) {
            enqueueSnackbar('Lobby has been destroyed', {
                anchorOrigin: {
                    horizontal: 'center',
                    vertical: 'top'
                },
                autoHideDuration: 3000
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
                if (m.nickname === data.nickname) {
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
        enqueueSnackbar(`${data.member.nickname}` + ' has been kicked', {
            anchorOrigin: {
                horizontal: 'center',
                vertical: 'top'
            },
            autoHideDuration: 3000
        })

        lobby.setMembers(members => members.filter(m => m.nickname !== data.member.nickname))

        if (data.member.nickname === user.nickname) {
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
                <Dialog open>
                    <DialogTitle>Ready check</DialogTitle>
                    <DialogContent>
                        <Grid container>
                            {lobby.readyCheckMembers.map(m => (
                                <Grid item key={m.id}>
                                    <ProfilePicture
                                        size={90}
                                        color={m.nicknameColor}
                                        url={m.avatarUrl}
                                        {...(m.ready === true
                                            ? {
                                                  filter: "url('#teal-lightgreen')"
                                              }
                                            : {})}
                                        {...(m.ready === false
                                            ? {
                                                  filter: "url('#cherry-icecream')"
                                              }
                                            : {})}
                                    />
                                </Grid>
                            ))}
                        </Grid>
                    </DialogContent>
                    <DialogActions sx={{ visibility: readyCheckVoted ? 'hidden' : 'visible' }}>
                        <Button color="success" onClick={() => ws.send('ReadyCheck-Response', { lobbyId: lobby.lobbyId, ready: true })}>
                            Ready
                        </Button>
                        <Button color="error" onClick={() => ws.send('ReadyCheck-Response', { lobbyId: lobby.lobbyId, ready: false })}>
                            Not ready
                        </Button>
                    </DialogActions>
                </Dialog>
            )}
        </>
    )
}
