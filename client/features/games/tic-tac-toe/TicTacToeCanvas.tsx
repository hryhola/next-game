import React, { useEffect, useRef } from 'react'
import { Box, Button, ButtonProps, Grid, Skeleton, styled } from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked'
import { useEventHandler, useLobby, useUser, useWS } from 'client/context/list'
import { TicTacToePlayerData } from 'state/games/tic-tac-toe/TicTacToePlayer'
import { useSnackbar } from 'notistack'
import styles from './TicTacToe.module.scss'
import { useTicTacToe, useTicTacToeAction } from './TicTacToeView'

const Cell = styled(Button)<ButtonProps>(({ theme }) => ({
    maxWidth: '200px',
    maxHeight: '200px',
    width: '30vw',
    height: '30vw',
    borderRadius: 0,
    border: '1px solid'
}))

type Props = {
    isPlayable?: boolean
    isLoading?: boolean
}

export const TicTacToeCanvas: React.FC<Props> = ({ isLoading }) => {
    const { enqueueSnackbar } = useSnackbar()
    const { lobbyId } = useLobby()
    const ws = useWS()

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
        if (!game.session) return

        setTurn(game.session.turn)
    }, [game.session?.turn])

    useTicTacToeAction('$Move', action => {
        if (action.result.status !== 'Success') return

        const by = gameRef.current.players.find(p => p.id === action.actor.id) as TicTacToePlayerData

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
            value[x][y] = by.char

            return value.slice()
        })

        if (action.result.winner) {
            const winner = (gameRef.current.players as TicTacToePlayerData[]).find(p => p.id === action.result.winner)
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

                svg.appendChild(line)
            }

            enqueueSnackbar(`${winner?.nickname} won!`, {
                anchorOrigin: {
                    vertical: 'bottom',
                    horizontal: 'center'
                }
            })
        }

        if (action.result.isDraw) {
            enqueueSnackbar(`Draw!`, {
                anchorOrigin: {
                    vertical: 'bottom',
                    horizontal: 'center'
                }
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

        ws.send('Game-SendAction', {
            lobbyId,
            actionName: '$Move',
            actionPayload: {
                cell: [Number(x), Number(y)]
            }
        })
    }

    console.log({
        turn,
        user: user.id
    })

    const isMyTurn = turn === user.id

    return (
        <>
            <Box sx={{ paddingTop: 20 }} ref={boardRef}>
                {cellValues.map((row, x) => (
                    <Grid key={x} justifyContent="center" wrap="nowrap" container>
                        {row.map((cell, y) => (
                            <Grid justifyContent="center" key={y} item>
                                {isLoading ? (
                                    <Skeleton
                                        variant="rectangular"
                                        sx={{
                                            width: 200,
                                            maxWidth: '29vw',
                                            height: 200,
                                            maxHeight: '29vw',
                                            m: 0.2,
                                            boxSizing: 'border-box'
                                        }}
                                    />
                                ) : (
                                    <Cell
                                        sx={{ pointerEvents: isMyTurn && cell === null ? 'auto' : 'none' }}
                                        disabled={!game.isSessionStarted}
                                        id={x + '-' + y}
                                        onClick={cellClickHandler}
                                        variant="contained"
                                        color="primary"
                                    >
                                        {cell === 'x' && <CloseIcon sx={{ fontSize: 80 }} />}
                                        {cell === 'o' && <RadioButtonUncheckedIcon sx={{ fontSize: 80 }} />}
                                    </Cell>
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
