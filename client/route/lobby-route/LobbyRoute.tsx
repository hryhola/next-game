import { Snackbar } from '@mui/material'
import { LobbyContext } from 'client/context/list/lobby'
import { WSContext } from 'client/context/list/ws'
import { LoadingOverlay } from 'client/ui'
import dynamic from 'next/dynamic'
import { useSnackbar } from 'notistack'
import { useContext, useEffect, useRef, useState } from 'react'
import { WSEvents } from 'uWebSockets/globalSocketEvents'

export const LobbyRoute: React.FC = () => {
    const lobby = useContext(LobbyContext)
    const ws = useContext(WSContext)
    const game = useRef<ReturnType<typeof dynamic<any>> | null>(null)
    const [isLoaded, setIsLoaded] = useState(false)

    const { enqueueSnackbar } = useSnackbar()

    useEffect(() => {
        game.current = dynamic(() => import('client/features/games/clicker/ClickerGame').then(mod => mod.Clicker), {
            loading: () => <LoadingOverlay isLoading={true} />
        })

        setIsLoaded(true)
    }, [])

    const handleUpdate = (data: WSEvents['Lobby-Update']) => {
        if (data.lobbyId === lobby.lobbyId) {
            if (data.updated.members) {
                lobby.setMembers(data.updated.members)
            }
        }
    }

    const handleTipped = (data: WSEvents['Lobby-Tipped']) => {
        if (data.lobbyId === lobby.lobbyId) {
            const from = lobby.members.find(member => member.nickname === data.from)
            const to = lobby.members.find(member => member.nickname === data.to)

            enqueueSnackbar(
                <>
                    <span style={{ color: to?.nicknameColor }}>{data.to}</span> tipped by <span style={{ color: from?.nicknameColor }}>{data.from}</span>
                </>,
                {
                    content: (key, message) => (
                        <div style={{ position: 'relative', bottom: '52px' }} key={key}>
                            {message}
                        </div>
                    )
                }
            )
        }
    }

    const sendSubscribeRequest = () => {
        ws.on('Lobby-Update', handleUpdate)
        ws.on('Lobby-Tipped', handleTipped)

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
