import { useAudio, useLobby, useRouter, useWS } from 'client/context/list/'
import { LoadingOverlay } from 'client/ui'
import dynamic from 'next/dynamic'
import { useSnackbar } from 'notistack'
import { useEffect, useRef, useState } from 'react'
import { WSEvents } from 'uWebSockets/globalSocketEvents'

export const LobbyRoute: React.FC = () => {
    const lobby = useLobby()
    const lobbyRef = useRef(lobby)
    const ws = useWS()
    const audio = useAudio()
    const router = useRouter()

    const game = useRef<ReturnType<typeof dynamic<any>> | null>(null)
    const [isLoaded, setIsLoaded] = useState(false)

    const { enqueueSnackbar } = useSnackbar()

    const handleLobbyJoin = (data: WSEvents['Lobby-Join']) => {
        if (data.lobbyId === lobbyRef.current.lobbyId) {
            lobby.setMembers(ms => [...ms.filter(m => m.nickname !== data.member.nickname), data.member])
        }
    }

    const handleUpdate = (data: WSEvents['Lobby-Update']) => {
        if (data.lobbyId === lobbyRef.current.lobbyId) {
            if (data.updated.members) {
                lobbyRef.current.setMembers(data.updated.members)
            }
        }
    }

    const handleTipped = (data: WSEvents['Lobby-Tipped']) => {
        if (data.lobbyId === lobbyRef.current.lobbyId) {
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
        }
    }

    const handleDestroy = (data: WSEvents['Lobby-Destroy']) => {
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
            router.setCurrentRoute('Home')
        }
    }

    useEffect(() => {
        ws.on('Lobby-Destroy', handleDestroy)
        ws.on('Lobby-Join', handleLobbyJoin)
        ws.on('Lobby-Update', handleUpdate)
        ws.on('Lobby-Tipped', handleTipped)

        game.current = dynamic(() => import('client/features/games/clicker/ClickerGame').then(mod => mod.Clicker), {
            loading: () => <LoadingOverlay isLoading={true} />
        })

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

    return <>{isLoaded && game.current ? <game.current /> : null}</>
}
