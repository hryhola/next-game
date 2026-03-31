import React, { useEffect, useRef, useState } from 'react'
import styles from './Clicker.module.css'
import { useAudio, useEventHandler, useLobby, useUser } from 'client/context/list'
import type { ClickerPlayerData } from 'shared/contracts/app'
import { useActionSender, useClicker, useClickerAction } from './ClickerView'

export const ClickerCanvas: React.FC = () => {
    const game = useClicker()
    const user = useUser()
    const audio = useAudio()
    const { lobbyId } = useLobby()
    const canvasRef = useRef<HTMLDivElement>(null)

    const [gameClickAllowed, setGameClickAllowed] = useState(game.session?.playerIsClickAllowed ?? false)

    const sendAction = useActionSender()

    React.useEffect(() => {
        if (game.session) {
            setGameClickAllowed(game.session.playerIsClickAllowed)
        }
    }, [game.session?.playerIsClickAllowed])

    function drawClick(color: string, x: number, y: number, status: 'Ok' | 'Failure' | 'NotWin') {
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

    useEventHandler('Game-SessionStart', ({ lobbyId: eventLobbyId }) => {
        if (eventLobbyId === lobbyId) {
            const canvas = canvasRef.current

            if (!canvas) {
                return
            }

            canvas.innerHTML = ''
        }
    })

    const player = game.players.find(p => p.userNickname === user.userNickname) as ClickerPlayerData | undefined
    const isCanvasClickable = game.isSessionStarted && (player?.playerIsClickAllowed ?? game.session?.playerIsClickAllowed ?? false)

    const actionHandler = (clientX: number, clientY: number) => {
        if (!isCanvasClickable) {
            return
        }

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

    const uploadedBackgroundUrl = game.initialData?.background?.value
    const patternColor = '#8787ca'
    const backgroundStyle: React.CSSProperties = gameClickAllowed
        ? uploadedBackgroundUrl
            ? {
                  backgroundColor: '#000024',
                  backgroundImage: `linear-gradient(rgba(0, 0, 36, 0.32), rgba(0, 0, 36, 0.32)), url("${uploadedBackgroundUrl}")`,
                  backgroundPosition: 'center, center',
                  backgroundRepeat: 'no-repeat, no-repeat',
                  backgroundSize: 'cover, cover'
              }
            : {
                  backgroundColor: '#000024',
                  backgroundImage: [
                      `radial-gradient(circle at center, ${patternColor} 1.6px, transparent 1.8px)`,
                      `linear-gradient(rgba(135, 135, 202, 0.18) 1px, transparent 1px)`,
                      `linear-gradient(90deg, rgba(135, 135, 202, 0.18) 1px, transparent 1px)`
                  ].join(', '),
                  backgroundPosition: '0 0, 0 0, 0 0',
                  backgroundRepeat: 'repeat, repeat, repeat',
                  backgroundSize: '32px 32px, 32px 32px, 32px 32px'
              }
        : {
              backgroundColor: '#000024',
              backgroundImage: 'none',
              backgroundPosition: '0 0',
              backgroundRepeat: 'repeat',
              backgroundSize: 'auto'
          }

    return (
        <div
            ref={canvasRef}
            onMouseDown={handleMouseDown}
            onTouchStart={handleTouch}
            onTouchEnd={e => e.preventDefault()}
            style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                width: '100vw',
                height: 'var(--fullHeight)',
                overflow: 'hidden',
                pointerEvents: isCanvasClickable ? 'auto' : 'none',
                opacity: '0.8',
                ...backgroundStyle
            }}
        ></div>
    )
}
