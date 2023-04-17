import React, { useEffect, useRef, useState } from 'react'
import { Box } from '@mui/material'
import styles from './Clicker.module.scss'
import { useAudio, useEventHandler, useLobby, useUser } from 'client/context/list'
import { ClickerPlayerData } from 'state'
import { useActionSender, useClicker, useClickerAction } from './ClickerView'

export const ClickerCanvas: React.FC = () => {
    const game = useClicker()
    const user = useUser()
    const audio = useAudio()
    const { lobbyId } = useLobby()
    const canvasRef = useRef<HTMLDivElement>(null)

    const [gameClickAllowed, setGameClickAllowed] = useState(game.session?.isClickAllowed ?? false)
    const [isCanvasClickable, setIsCanvasClickable] = useState(true)

    const sendAction = useActionSender()

    React.useEffect(() => {
        if (game.session) {
            setGameClickAllowed(game.session.isClickAllowed)
        }
    }, [game.session?.isClickAllowed])

    useClickerAction('$Click', action => {
        if (action.result.status && action.result.status !== 'Skipped') {
            drawClick(action.result.color, action.payload.x, action.payload.y, action.result.status)
        }
    })

    useClickerAction('$ClickAllowed', () => {
        setGameClickAllowed(true)
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

    const drawClick = (color: string, x: number, y: number, status: 'Ok' | 'Failure' | 'NotWin') => {
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

        sendAction('$Click', { x, y })
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
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                width: '100vw',
                height: 'var(--fullHeight)',
                backgroundColor: '#000024',
                overflow: 'hidden',
                pointerEvents: isCanvasClickable === false ? 'none' : 'auto',
                opacity: '0.8',
                background: gameClickAllowed
                    ? 'radial-gradient(circle, transparent 20%, #000024 20%, #000024 80%, transparent 80%, transparent), radial-gradient(circle, transparent 20%, #000024 20%, #000024 80%, transparent 80%, transparent) 32.5px 32.5px, linear-gradient(#8787ca 2.6px, transparent 2.6px) 0 -1.3px, linear-gradient(90deg, #8787ca 2.6px, #000024 2.6px) -1.3px 0'
                    : '#000024',
                backgroundSize: '65px 65px, 65px 65px, 32.5px 32.5px, 32.5px 32.5px'
            }}
        >
            {gameClickAllowed && game.initialData?.background?.value && (
                <img style={{ pointerEvents: 'none', userSelect: 'none' }} src={game.initialData.background.value} alt="background" />
            )}
        </Box>
    )
}
