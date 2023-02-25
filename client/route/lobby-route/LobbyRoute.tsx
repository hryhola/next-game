import { LobbyContext } from 'client/context/list/lobby'
import { WSContext } from 'client/context/list/ws'
import { AudioCtx } from 'client/context/list/audio'
import { LoadingOverlay } from 'client/ui'
import dynamic from 'next/dynamic'
import { useSnackbar } from 'notistack'
import { useContext, useEffect, useRef, useState } from 'react'
import { WSEvents } from 'uWebSockets/globalSocketEvents'

export const LobbyRoute: React.FC = () => {
    const lobby = useContext(LobbyContext)
    const lobbyRef = useRef(lobby)
    const ws = useContext(WSContext)
    const audio = useContext(AudioCtx)

    const game = useRef<ReturnType<typeof dynamic<any>> | null>(null)
    const [isLoaded, setIsLoaded] = useState(false)

    const { enqueueSnackbar } = useSnackbar()

    const handleUpdate = (data: WSEvents['Lobby-Update']) => {
        if (data.lobbyId === lobbyRef.current.lobbyId) {
            if (data.updated.members) {
                lobbyRef.current.setMembers(data.updated.members)
            }
        }
    }

    const handleTipped = (data: WSEvents['Lobby-Tipped']) => {
        if (data.lobbyId === lobbyRef.current.lobbyId) {
            console.log(lobbyRef.current.members)

            const from = lobbyRef.current.members.find(member => member.nickname === data.from)
            const to = lobbyRef.current.members.find(member => member.nickname === data.to)

            audio.play(Math.random() > 0.1 ? 'comp_coin.wav' : 'coins.wav')

            enqueueSnackbar(
                <>
                    <span style={{ color: to?.nicknameColor }}>{data.to}</span> tipped by <span style={{ color: from?.nicknameColor }}>{data.from}</span>
                </>,
                {
                    content: (key, message) => (
                        <div style={{ pointerEvents: 'none' }} key={key}>
                            {message}
                        </div>
                    )
                }
            )
        }
    }

    useEffect(() => {
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
