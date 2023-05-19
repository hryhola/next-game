import React, { useEffect, useState } from 'react'
import { JeopardyState } from 'state/games/jeopardy/JeopardySessionState'
import { Grid, List, ListItem, ListItemButton, Slider } from '@mui/material'
import { useUser } from 'client/context/list'
import { useActionSender, useJeopardy } from '../JeopardyView'
import { useGlobalModal } from 'client/features/global-modal/GlobalModal'

export const FinalRoundBoard: React.FC<JeopardyState.FinalRoundBoardFrame> = props => {
    const user = useUser()
    const game = useJeopardy()
    const globalModal = useGlobalModal()
    const sendAction = useActionSender()

    const [betValue, setBetValue] = useState(1)

    const isMasterView = game.players.some(p => p.id === user.id && p.playerIsMaster)

    const handleSkip = (id: number) => () => {
        sendAction('$SkipFinalTheme', {
            themeIndex: id
        })
    }

    const showBettingModal = () => {
        const player = game.players.find(p => p.id === user.id)

        if (!player || player.playerIsMaster || player.playerScore <= 0 || props.playersThatMadeBet.includes(player.id)) return

        globalModal.confirm({
            header: 'Make your bet',
            content: (
                <Slider
                    sx={{ mt: 4.5 }}
                    defaultValue={betValue}
                    valueLabelDisplay="on"
                    onChange={(_, n) => setBetValue(n as number)}
                    min={1}
                    max={player.playerScore}
                    step={1}
                />
            ),
            actionRequired: 'confirm',
            onConfirm: () => {
                sendAction('$MakeFinalBet', {
                    value: betValue
                })
            }
        })
    }

    useEffect(() => {
        if (props.status === 'betting') showBettingModal()
    }, [])

    useEffect(() => {
        if (props.status === 'betting') showBettingModal()
    }, [props.status])

    return (
        <Grid display="grid" justifyContent="center" alignContent="center" width="100vw" minHeight="var(--fullHeight)">
            <Grid sx={{ textAlign: 'center' }} item>
                <List>
                    {props.themes.map((t, i) => (
                        <ListItem key={i} disablePadding>
                            <ListItemButton
                                onClick={handleSkip(i)}
                                disabled={t.skipped || props.status !== 'skipping' || (isMasterView ? false : props.skipperId !== user.id)}
                            >
                                {t.skipped ? <s>{t.name}</s> : t.name}
                            </ListItemButton>
                        </ListItem>
                    ))}
                </List>
            </Grid>
        </Grid>
    )
}
