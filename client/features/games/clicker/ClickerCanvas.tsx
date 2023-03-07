import React, { useRef, useState } from 'react'
import { Box } from '@mui/material'
import styles from './Clicker.module.scss'
import { useEventHandler, useLobby, useWS } from 'client/context/list'

export const ClickerCanvas: React.FC = () => {
    const ws = useWS()
    const { lobbyId } = useLobby()
    const canvasRef = useRef<HTMLDivElement>(null)

    const [clickAllowed, setClickAllowed] = useState(false)

    useEventHandler('Game-SessionAction', data => {
        if (data.lobbyId !== lobbyId) {
            return
        }

        if (data.type === 'Click') {
            drawClick(data.result.color, data.payload.x, data.payload.y)
        }
    })

    useEventHandler('Game-SessionAction', data => {
        if (data.lobbyId !== lobbyId) {
            return
        }

        if (data.type === 'ClickAllowed') {
            setClickAllowed(true)
        }
    })

    useEventHandler('Game-SessionEnd', data => {
        if (data.lobbyId !== lobbyId) {
            return
        }

        setClickAllowed(false)
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

    const drawClick = (color: string, x: number, y: number) => {
        const canvas = canvasRef.current

        if (!canvas) {
            return
        }

        const circle = document.createElement('div')

        circle.classList.add(styles.circle)
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

    const handleClick: React.MouseEventHandler<HTMLDivElement> = e => {
        actionHandler(e.clientX, e.clientY)
    }

    const handleTouch: React.TouchEventHandler<HTMLDivElement> = e => {
        actionHandler(e.touches[0].clientX, e.touches[0].clientY)
    }

    return (
        <Box
            ref={canvasRef}
            onMouseDown={handleClick}
            onTouchStart={handleTouch}
            sx={{
                width: '100vw',
                height: 'var(--fullHeight)',
                backgroundColor: '#000024',
                backgroundSize: '10px 10px',
                overflow: 'hidden',
                ...(clickAllowed
                    ? {
                          backgroundImage: 'radial-gradient(#757575 0.5px, #000024 0.5px)'
                      }
                    : {
                          pointerEvents: 'none'
                      })
            }}
        ></Box>
    )
}
