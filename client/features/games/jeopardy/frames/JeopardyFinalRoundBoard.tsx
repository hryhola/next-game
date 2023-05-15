import React from 'react'
import { JeopardyState } from 'state/games/jeopardy/JeopardySessionState'
import { Grid, List, ListItem, ListItemButton } from '@mui/material'
import { useUser } from 'client/context/list'
import { useActionSender, useJeopardy } from '../JeopardyView'

export const FinalRoundBoard: React.FC<JeopardyState.FinalRoundBoardFrame> = props => {
    const user = useUser()
    const game = useJeopardy()

    const sendAction = useActionSender()

    const isMasterView = game.players.some(p => p.id === user.id && p.playerIsMaster)

    const handleSkip = (id: number) => () => {
        sendAction('$SkipFinalTheme', {
            themeIndex: id
        })
    }

    return (
        <Grid display="grid" justifyContent="center" alignContent="center" width="100vw" minHeight="var(--fullHeight)">
            <Grid sx={{ textAlign: 'center' }} item>
                <List>
                    {props.themes.map((t, i) => (
                        <ListItem key={i} disablePadding>
                            <ListItemButton onClick={handleSkip(i)} disabled={t.skipped || (isMasterView ? false : props.skipperId !== user.id)}>
                                {t.skipped ? <s>{t.name}</s> : t.name}
                            </ListItemButton>
                        </ListItem>
                    ))}
                </List>
            </Grid>
        </Grid>
    )
}
