import React, { MutableRefObject, useEffect, useRef, useState } from 'react'
import { JeopardyState } from 'state/games/jeopardy/JeopardySessionState'
import { Box, Button, Grid, List, ListItem, ListItemButton, Slider, TextField } from '@mui/material'
import { useUser } from 'client/context/list'
import { useActionSender, useJeopardy } from '../JeopardyView'
import { useGlobalModal } from 'client/features/global-modal/GlobalModal'
import { JeopardyMedia } from '../utils/jeopardyPackLoading'

const FinalQuestion: React.FC<{ type: string; content: string; Resources: MutableRefObject<JeopardyMedia> }> = props => {
    const playerRef = useRef<HTMLAudioElement | HTMLVideoElement | null>(null)

    switch (props.type) {
        case 'image': {
            return <img src={props.Resources.current.Images[props.content.slice(1)]} alt="Question Image" />
        }
        case 'video': {
            return (
                <video
                    ref={playerRef as React.MutableRefObject<HTMLVideoElement | null>}
                    style={{ maxWidth: '100vw' }}
                    autoPlay
                    src={props.Resources.current.Video[props.content.slice(1)]}
                ></video>
            )
        }
        case 'voice': {
            return (
                <>
                    <audio ref={playerRef} autoPlay src={props.Resources.current.Audio[props.content.slice(1)]}></audio>
                    <img src="/assets/jeopardy/audio.gif" alt="Audio question" />
                </>
            )
        }
        case 'text':
        default: {
            return <>{props.content}</>
        }
    }
}

export const FinalRoundBoard: React.FC<
    JeopardyState.FinalRoundBoardFrame & {
        Resources: MutableRefObject<JeopardyMedia>
    }
> = props => {
    const user = useUser()
    const game = useJeopardy()
    const globalModal = useGlobalModal()
    const sendAction = useActionSender()

    const [betValue, setBetValue] = useState(1)
    const [answer, setAnswer] = useState('')

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

    let content = <></>

    switch (props.status) {
        case 'skipping':
            content = (
                <List>
                    {props.themes.map((t, i) => (
                        <ListItem key={i} disablePadding>
                            <ListItemButton onClick={handleSkip(i)} disabled={t.skipped || (isMasterView ? false : props.skipperId !== user.id)}>
                                {t.skipped ? <s>{t.name}</s> : t.name}
                            </ListItemButton>
                        </ListItem>
                    ))}
                </List>
            )
            break
        case 'answering':
            content = (
                <>
                    <FinalQuestion Resources={props.Resources} content={props.questionContent || ''} type={props.questionType || 'text'} />
                    {props.playersThatAnswered.includes(user.id) || isMasterView ? (
                        <></>
                    ) : (
                        <Box sx={{ mt: 2 }}>
                            <TextField value={answer} onChange={e => setAnswer(e.target.value)} />
                            <br />
                            <Button sx={{ mt: 2 }}>Answer</Button>
                        </Box>
                    )}
                </>
            )
            break
    }

    return (
        <Grid display="grid" justifyContent="center" alignContent="center" width="100vw" minHeight="var(--fullHeight)">
            <Grid sx={{ textAlign: 'center' }} item>
                {content}
            </Grid>
        </Grid>
    )
}
