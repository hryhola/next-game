import { Box, Button, Grid, Container } from '@mui/material'
import React, { useState, createContext } from 'react'
import styles from './TicTacToe.module.scss'

export const TicTacToeContext = createContext({})

export const TicTacToe: React.FC = props => {
    const [cellValues, setCellValues] = useState<(string | null)[][]>([
        [null, null, null],
        [null, null, null],
        [null, null, null]
    ])

    const context = {}

    const cellClickHandler: React.MouseEventHandler<HTMLButtonElement> = e => {
        const button = e.target as HTMLButtonElement

        const [x, y] = button.id.split('-')

        setCellValues(value => {
            value[Number(x)][Number(y)] = 'value'

            console.log(value)

            return value.slice()
        })
    }

    console.log(cellValues)

    return (
        <TicTacToeContext.Provider value={context}>
            <Container sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
                <Box>
                    <Grid container>
                        <Grid item>
                            <Button id="0-0" className={styles.cell} onClick={cellClickHandler}>
                                {cellValues[0][0]}
                            </Button>
                        </Grid>
                        <Grid item>
                            <Button id="0-1" className={styles.cell} onClick={cellClickHandler}>
                                {cellValues[0][1]}
                            </Button>
                        </Grid>
                        <Grid item>
                            <Button id="0-2" className={styles.cell} onClick={cellClickHandler}>
                                {cellValues[0][2]}
                            </Button>
                        </Grid>
                    </Grid>
                    <Grid container>
                        <Grid item>
                            <Button id="1-0" className={styles.cell} onClick={cellClickHandler}>
                                {cellValues[1][0]}
                            </Button>
                        </Grid>
                        <Grid item>
                            <Button id="1-1" className={styles.cell} onClick={cellClickHandler}>
                                {cellValues[1][1]}
                            </Button>
                        </Grid>
                        <Grid item>
                            <Button id="1-2" className={styles.cell} onClick={cellClickHandler}>
                                {cellValues[1][2]}
                            </Button>
                        </Grid>
                    </Grid>
                    <Grid container>
                        <Grid item>
                            <Button id="2-0" className={styles.cell} onClick={cellClickHandler}>
                                {cellValues[2][0]}
                            </Button>
                        </Grid>
                        <Grid item>
                            <Button id="2-1" className={styles.cell} onClick={cellClickHandler}>
                                {cellValues[2][1]}
                            </Button>
                        </Grid>
                        <Grid item>
                            <Button id="2-2" className={styles.cell} onClick={cellClickHandler}>
                                {cellValues[2][2]}
                            </Button>
                        </Grid>
                    </Grid>
                </Box>
            </Container>
        </TicTacToeContext.Provider>
    )
}
