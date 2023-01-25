import { Box, Button, Grid, Container, styled, ButtonProps } from '@mui/material'
import React, { useState, createContext, useContext } from 'react'
import CloseIcon from '@mui/icons-material/Close'
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked'
import { TicTacToePlayer, TTicTacToePlayer } from 'state'
import { Player } from '../player/Player'
import { ChatBox, LoadingOverlay } from 'client/ui'
import { LobbyContext } from 'client/context/list/lobby'
import { Chat } from '../chat/Chat'
import { GetServerSideProps, NextPage } from 'next'

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
    isLoading: boolean
}

const Header: React.FC<HeaderProps> = props => {
    return (
        <Grid container justifyContent="center">
            {props.isLoading ? (
                <Grid item>
                    <Player isLoading />
                </Grid>
            ) : (
                props.members.map(m => (
                    <Grid key={m.user.nickname} item>
                        <Player {...m} />
                    </Grid>
                ))
            )}
        </Grid>
    )
}

const TicTacToe = () => {
    const [players, setPlayers] = useState<TTicTacToePlayer[]>([
        {
            char: 'x',
            isCreator: true,
            isPlayer: true,
            score: 0,
            user: {
                nickname: 'asdasd'
            }
        }
    ])
    const [isLoading, setIsLoading] = useState(false)
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
        <>
            <Container sx={{ py: 4 }}>
                <Header members={players} isLoading={isLoading} />
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
            <LoadingOverlay isLoading={isLoading} />
        </>
    )
}

export default TicTacToe
