import { LobbyContext } from 'client/context/list/lobby'
import { WSContext } from 'client/context/list/ws'
import { LoadingOverlay } from 'client/ui'
import dynamic from 'next/dynamic'
import { useContext, useEffect, useRef, useState } from 'react'
import { WSEvents } from 'uWebSockets/globalSocketEvents'

export const LobbyRoute: React.FC = () => {
    const lobby = useContext(LobbyContext)
    const ws = useContext(WSContext)
    const game = useRef<ReturnType<typeof dynamic<any>> | null>(null)
    const [isLoaded, setIsLoaded] = useState(false)

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

    const sendSubscribeRequest = () => {
        ws.on('Lobby-Update', handleUpdate)

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
