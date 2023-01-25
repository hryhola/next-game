import { Box, Button, Grid, Container, styled, ButtonProps } from '@mui/material'
import React, { useState, createContext, useContext } from 'react'
import CloseIcon from '@mui/icons-material/Close'
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked'
import { TTicTacToePlayer } from 'state'
import { Player } from '../player/Player'
import { ChatBox } from 'client/ui'
import { LobbyContext } from 'client/context/list/lobby'
import { Chat } from '../chat/Chat'

const Cell = styled(Button)<ButtonProps>(({ theme }) => ({
    maxWidth: '200px',
    maxHeight: '200px',
    width: '30vw',
    height: '30vw',
    borderRadius: 0,
    border: '1px solid'
}))

interface HeaderProps {
    members: TTicTacToePlayer[]
}

const Header: React.FC<HeaderProps> = props => {
    return (
        <Grid container justifyContent="space-around">
            {props.members.map(m => (
                <Grid key={m.user.nickname} item>
                    <Player {...m} />
                </Grid>
            ))}
        </Grid>
    )
}

const initialContext = {
    players: [] as TTicTacToePlayer[]
}

export const TicTacToeContext = createContext(initialContext)

export const TicTacToe: React.FC = props => {
    const lobby = useContext(LobbyContext)

    const [cellValues, setCellValues] = useState<('x' | 'o' | null)[][]>([
        [null, null, null],
        [null, null, null],
        [null, null, null]
    ])

    const cellClickHandler: React.MouseEventHandler<HTMLButtonElement> = e => {
        const button = e.target as HTMLButtonElement

        const [x, y] = button.id.split('-')

        setCellValues(value => {
            value[Number(x)][Number(y)] = 'o'

            return value.slice()
        })
    }

    return (
        <TicTacToeContext.Provider value={initialContext}>
            <Container sx={{ py: 4 }}>
                <TicTacToeContext.Consumer>{c => <Header members={c.players} />}</TicTacToeContext.Consumer>
                <Box sx={{ pt: 4 }}>
                    {cellValues.map((row, x) => (
                        <Grid key={x} justifyContent="center" wrap="nowrap" container>
                            {row.map((cell, y) => (
                                <Grid justifyContent="center" key={y} item>
                                    <Cell id={x + '-' + y} onClick={cellClickHandler} variant="contained" color="primary">
                                        {cell === 'x' && <CloseIcon sx={{ fontSize: 80 }} />}
                                        {cell === 'o' && <RadioButtonUncheckedIcon sx={{ fontSize: 80 }} />}
                                    </Cell>
                                </Grid>
                            ))}
                        </Grid>
                    ))}
                </Box>
                <Chat scope="lobby" lobbyId={lobby.lobbyId} />
            </Container>
        </TicTacToeContext.Provider>
    )
}
