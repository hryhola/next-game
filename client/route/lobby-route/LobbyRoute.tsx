import { CircularProgress } from '@mui/material'
import { LobbyContext } from 'client/context/list/lobby'
import { WSContext } from 'client/context/list/ws'
import { ChatBox, LoadingOverlay } from 'client/ui'
import dynamic from 'next/dynamic'
import { useContext, useEffect, useRef, useState } from 'react'

export const LobbyRoute: React.FC = () => {
    const lobby = useContext(LobbyContext)
    const ws = useContext(WSContext)
    const game = useRef<ReturnType<typeof dynamic<any>> | null>(null)
    const [isLoaded, setIsLoaded] = useState(false)

    useEffect(() => {
        game.current = dynamic(() => import('client/features/tic-tac-toe/TicTacToe').then(mod => mod.default), {
            loading: () => <LoadingOverlay isLoading={true} />
        })

        setIsLoaded(true)
    }, [])

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
