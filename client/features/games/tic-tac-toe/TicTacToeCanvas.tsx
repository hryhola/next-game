import React, { useEffect, useRef } from 'react'
import { Box, Button, ButtonProps, Grid, Skeleton, styled } from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked'
import { useEventHandler, useLobby, useUser, useWS } from 'client/context/list'
import { useGame, withGameCtx } from '../common/GameCtx'
import { TicTacToePlayerData } from 'state/games/tic-tac-toe/TicTacToePlayer'
import { useSnackbar } from 'notistack'

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

export const TicTacToeCanvas: React.FC<Props> = withGameCtx(({ isLoading, isSessionStarted, session }) => {
    const { enqueueSnackbar } = useSnackbar()
    const { lobbyId } = useLobby()
    const ws = useWS()

    const user = useUser()
    const game = useGame()
    const gameRef = useRef(game)

    const [turn, setTurn] = React.useState<string | null>(session?.turn || null)

    const [cellValues, setCellValues] = React.useState<('x' | 'o' | null)[][]>([
        [null, null, null],
        [null, null, null],
        [null, null, null]
    ])

    useEffect(() => {
        gameRef.current = game
    }, [game.players])

    useEffect(() => {
        if (!session) return

        setTurn(session.turn)
    }, [session?.turn])

    useEventHandler('Game-SessionAction', data => {
        if (data.lobbyId !== lobbyId) return

        if (data.type !== 'Move') return

        if (data.result.status !== 'Success') return

        const by = (gameRef.current.players as TicTacToePlayerData[]).find(p => p.id === data.by.id)

        if (!by) {
            console.error('Player not found')
            return
        }

        const {
            cell: [x, y]
        } = data.payload

        setTurn(data.result.nextTurn)

        setCellValues(value => {
            value[x][y] = by.char

            return value.slice()
        })

        if (data.result.winner) {
            const winner = (gameRef.current.players as TicTacToePlayerData[]).find(p => p.id === data.result.winner)

            enqueueSnackbar(`${winner?.nickname} won!`, {
                anchorOrigin: {
                    vertical: 'bottom',
                    horizontal: 'center'
                }
            })
        }

        if (data.result.isDraw) {
            enqueueSnackbar(`Draw!`, {
                anchorOrigin: {
                    vertical: 'bottom',
                    horizontal: 'center'
                }
            })
        }
    })

    useEventHandler('Game-SessionStart', () => {
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
            actionName: 'Move',
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
        <Box sx={{ paddingTop: 20 }}>
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
                                    disabled={!isSessionStarted}
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
    )
})
