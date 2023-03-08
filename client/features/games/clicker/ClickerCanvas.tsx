import React, { useEffect, useRef, useState } from 'react'
import { Box } from '@mui/material'
import styles from './Clicker.module.scss'
import { useAudio, useEventHandler, useLobby, useUser, useWS } from 'client/context/list'
import { useGame } from '../common/GameCtx'
import { ClickerPlayerData } from 'state'

export const ClickerCanvas: React.FC = () => {
    const ws = useWS()
    const game = useGame()
    const user = useUser()
    const audio = useAudio()
    const { lobbyId } = useLobby()
    const canvasRef = useRef<HTMLDivElement>(null)

    const [gameClickAllowed, setGameClickAllowed] = useState(game.session?.isClickAllowed ?? false)
    const [isCanvasClickable, setIsCanvasClickable] = useState(true)

    React.useEffect(() => {
        if (game.session) {
            setGameClickAllowed(game.session.isClickAllowed)
        }
    }, [game.session?.isClickAllowed])

    useEventHandler('Game-SessionAction', data => {
        if (data.lobbyId !== lobbyId) {
            return
        }

        if (data.type === 'Click' && data.result.status !== 'Skipped') {
            drawClick(data.result.color, data.payload.x, data.payload.y, data.result.status)
        } else if (data.type === 'ClickAllowed') {
            setGameClickAllowed(true)
        }
    })

    useEventHandler('Game-SessionEnd', data => {
        if (data.lobbyId !== lobbyId) {
            return
        }

        setGameClickAllowed(false)
    })

    useEventHandler('Game-SessionStart', ({ lobbyId }) => {
        if (lobbyId === lobbyId) {
            const canvas = canvasRef.current

            if (!canvas) {
                return
            }

            canvas.innerHTML = ''
        }
    })

    const drawClick = (color: string, x: number, y: number, status: 'Ok' | 'Failure') => {
        const canvas = canvasRef.current

        if (!canvas) {
            return
        }

        const circle = document.createElement('div')

        if (status === 'Failure') {
            circle.classList.add(styles.circle, styles.failure)
            audio.play('clicker_fail.wav')
        } else {
            circle.classList.add(styles.circle, styles.success)
            audio.play('clicker_success.wav')
        }

        circle.style.left = `${x}vw`
        circle.style.top = `${y}vh`
        circle.style.backgroundColor = color

        canvas.prepend(circle)
    }

    const actionHandler = (clientX: number, clientY: number) => {
        const width = window.innerWidth
        const height = window.innerHeight

        const x = (clientX / width) * 100
        const y = (clientY / height) * 100

        ws.send('Game-SendAction', {
            lobbyId,
            actionName: 'Click',
            actionPayload: {
                x,
                y
            }
        })
    }

    const handleMouseDown: React.MouseEventHandler<HTMLDivElement> = e => {
        actionHandler(e.clientX, e.clientY)
    }

    const handleTouch: React.TouchEventHandler<HTMLDivElement> = e => {
        actionHandler(e.touches[0].clientX, e.touches[0].clientY)
    }

    useEffect(() => {
        const player = game.players.find(p => p.nickname === user.nickname) as ClickerPlayerData | undefined

        if (player) {
            setIsCanvasClickable(player.isClickAllowed)
        }
    }, [game.players])

    return (
        <Box
            ref={canvasRef}
            onMouseDown={handleMouseDown}
            onTouchStart={handleTouch}
            onTouchEnd={e => e.preventDefault()}
            sx={{
                width: '100vw',
                height: 'var(--fullHeight)',
                backgroundColor: '#000024',
                backgroundSize: '10px 10px',
                overflow: 'hidden',
                pointerEvents: isCanvasClickable === false ? 'none' : 'auto',
                backgroundImage: gameClickAllowed ? 'radial-gradient(#757575 0.5px, #000024 0.5px)' : 'none'
            }}
        ></Box>
    )
}
