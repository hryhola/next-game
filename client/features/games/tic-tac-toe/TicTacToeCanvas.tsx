import React, { useEffect, useRef } from 'react'
import { Box, Grid } from 'client/ui/mui-shim'
import { useEventHandler, useUser } from 'client/context/list'
import { useToast } from 'client/ui/toast/ToastProvider'
import styles from './TicTacToe.module.css'
import { useActionSender, useTicTacToe, useTicTacToeAction } from './TicTacToeView'
import { Button, Skeleton } from 'client/ui/primitives'
import { Circle, X } from 'lucide-react'

type Props = {
    isPlayable?: boolean
    isLoading?: boolean
}

export const TicTacToeCanvas: React.FC<Props> = ({ isLoading }) => {
    const { push } = useToast()
    const sendAction = useActionSender()

    const user = useUser()
    const game = useTicTacToe()
    const gameRef = useRef(game)

    const winLineBoxRef = useRef<HTMLDivElement>(null)
    const boardRef = useRef<HTMLDivElement>(null)

    const [turn, setTurn] = React.useState<string | null>(game.session?.turn || null)

    const [cellValues, setCellValues] = React.useState<('x' | 'o' | null)[][]>([
        [null, null, null],
        [null, null, null],
        [null, null, null]
    ])

    useEffect(() => {
        gameRef.current = game
    }, [game.players])

    useEffect(() => {
        // This mirrors server state into local animation state for the current board.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        game.session?.board && setCellValues(game.session?.board)
    }, [game.session?.board])

    useEffect(() => {
        if (!game.session) return

        // eslint-disable-next-line react-hooks/set-state-in-effect
        setTurn(game.session.turn)
    }, [game.session?.turn])

    useTicTacToeAction('$Move', action => {
        if (action.result.status !== 'Success') return

        const by = gameRef.current.players.find(p => p.id === action.actor.id)

        if (!by) {
            console.error('Player not found')
            return
        }

        const {
            cell: [x, y]
        } = action.payload

        if (action.result.nextTurn) {
            setTurn(action.result.nextTurn)
        }

        setCellValues(value => {
            value[x][y] = by.playerChar

            return value.slice()
        })

        if (action.result.winner) {
            const winner = gameRef.current.players.find(p => p.id === action.result.winner)
            const {
                winLine: [startCell, , endCell]
            } = action.result

            const winCell1 = boardRef.current?.querySelector<HTMLDivElement>(`[id='${startCell[0]}-${startCell[1]}']`)
            const winCell2 = boardRef.current?.querySelector<HTMLDivElement>(`[id='${endCell[0]}-${endCell[1]}']`)

            if (winCell1 && winCell2) {
                const div1CenterX = winCell1.offsetLeft + winCell1.offsetWidth / 2
                const div1CenterY = winCell1.offsetTop + winCell1.offsetHeight / 2

                const div2CenterX = winCell2.offsetLeft + winCell2.offsetWidth / 2
                const div2CenterY = winCell2.offsetTop + winCell2.offsetHeight / 2

                const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')

                svg.setAttribute('width', window.innerWidth.toString())
                svg.setAttribute('height', window.innerHeight.toString())
                svg.classList.add(styles['win-line'])
                svg.style.position = 'absolute'
                svg.style.top = '0'
                svg.style.left = '0'
                svg.style.zIndex = '1000'
                svg.style.pointerEvents = 'none'

                winLineBoxRef.current!.appendChild(svg)

                const line = document.createElementNS('http://www.w3.org/2000/svg', 'line')
                line.setAttribute('x1', div1CenterX.toString())
                line.setAttribute('y1', div1CenterY.toString())
                line.setAttribute('x2', div2CenterX.toString())
                line.setAttribute('y2', div2CenterY.toString())
                line.setAttribute('stroke', 'black')
                line.style.stroke = winner!.userColor

                svg.appendChild(line)
            }

            push({
                content: `${winner?.userNickname} won!`
            })
        }

        if (action.result.isDraw) {
            push({
                content: 'Draw!'
            })
        }
    })

    useEventHandler('Game-SessionStart', () => {
        winLineBoxRef.current!.innerHTML = ''

        setCellValues([
            [null, null, null],
            [null, null, null],
            [null, null, null]
        ])
    })

    const cellClickHandler: React.MouseEventHandler<HTMLButtonElement> = e => {
        const button = e.target as HTMLButtonElement

        const [x, y] = button.id.split('-')

        sendAction('$Move', {
            cell: [Number(x), Number(y)]
        })
    }

    const isMyTurn = turn === user.id

    return (
        <>
            <Box sx={{ pt: 'calc(var(--playersHeaderHeight) + 10px)' }} ref={boardRef}>
                {cellValues.map((row, x) => (
                    <Grid key={x} justifyContent="center" wrap="nowrap" container>
                        {row.map((cell, y) => (
                            <Grid justifyContent="center" key={y} item>
                                {isLoading ? (
                                    <Skeleton
                                        style={{ width: 200, maxWidth: '29vw', height: 200, maxHeight: '29vw', margin: '1px', boxSizing: 'border-box' }}
                                    />
                                ) : (
                                    <Button
                                        className="max-h-[200px] max-w-[200px] rounded-none border border-white/20 bg-violet-500/18 px-0 shadow-none"
                                        style={{ width: '30vw', height: '30vw', pointerEvents: isMyTurn && cell === null ? 'auto' : 'none' }}
                                        disabled={!game.isSessionStarted}
                                        id={x + '-' + y}
                                        onClick={cellClickHandler}
                                    >
                                        {cell === 'x' && <X className="size-20" />}
                                        {cell === 'o' && <Circle className="size-20" />}
                                    </Button>
                                )}
                            </Grid>
                        ))}
                    </Grid>
                ))}
            </Box>
            <Box ref={winLineBoxRef}></Box>
        </>
    )
}
