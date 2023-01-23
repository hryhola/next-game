import { Box, Button, Grid, Container, styled, ButtonProps, Typography } from '@mui/material'
import React, { useState, createContext } from 'react'
import CloseIcon from '@mui/icons-material/Close'
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked'

const Cell = styled(Button)<ButtonProps>(({ theme }) => ({
    width: '200px',
    height: '200px',
    borderRadius: 0,
    border: '1px solid black'
}))

export const TicTacToeContext = createContext({})

export const TicTacToe: React.FC = props => {
    const [cellValues, setCellValues] = useState<('x' | 'o' | null)[][]>([
        [null, null, null],
        [null, null, null],
        [null, null, null]
    ])

    const context = {}

    const cellClickHandler: React.MouseEventHandler<HTMLButtonElement> = e => {
        const button = e.target as HTMLButtonElement

        const [x, y] = button.id.split('-')

        setCellValues(value => {
            value[Number(x)][Number(y)] = 'o'

            return value.slice()
        })
    }

    return (
        <TicTacToeContext.Provider value={context}>
            <Container sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
                <Box>
                    {cellValues.map((row, x) => (
                        <Grid key={x} container>
                            {row.map((cell, y) => (
                                <Grid key={y} item>
                                    <Cell id={x + '-' + y} onClick={cellClickHandler} variant="contained" color="primary">
                                        {cell === 'x' && <CloseIcon sx={{ fontSize: 80 }} />}
                                        {cell === 'o' && <RadioButtonUncheckedIcon sx={{ fontSize: 80 }} />}
                                    </Cell>
                                </Grid>
                            ))}
                        </Grid>
                    ))}
                </Box>
            </Container>
        </TicTacToeContext.Provider>
    )
}
