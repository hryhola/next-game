import React, { MutableRefObject, useEffect, useRef, useState } from 'react'
import { JeopardySessionState, JeopardyState } from 'state/games/jeopardy/JeopardySessionState'
import { Box, Button, Grid, List, ListItem, ListItemButton, Slider, Table, TableBody, TableCell, TableHead, TableRow, TextField } from '@mui/material'
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
                    controls
                    src={props.Resources.current.Video[props.content.slice(1)]}
                ></video>
            )
        }
        case 'voice': {
            return (
                <>
                    <audio ref={playerRef} controls src={props.Resources.current.Audio[props.content.slice(1)]}></audio>
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
    const betValueRef = useRef(1)
    const [answer, setAnswer] = useState('')

    const isMasterView = game.players.some(p => p.id === user.id && p.playerIsMaster)

    const handleSkip = (id: number) => () => {
        sendAction('$SkipFinalTheme', {
            themeIndex: id
        })
    }

    useEffect(() => {
        betValueRef.current = betValue
    }, [betValue])

    const showBettingModal = () => {
        const player = game.players.find(p => p.id === user.id)

        if (!player || player.playerIsMaster || player.playerScore <= 0 || props.playersThatMadeBet.includes(player.id)) return

        globalModal.confirm({
            header: 'Make your bet',
            content: (
                <Box minWidth="200px" display="flex" justifyContent="center" alignItems="center" overflow="hidden">
                    <Slider
                        sx={{ mt: 4, mx: 3, mb: 2 }}
                        defaultValue={betValue}
                        valueLabelDisplay="on"
                        onChange={(_, n) => setBetValue(n as number)}
                        min={1}
                        max={player.playerScore}
                        step={1}
                    />
                </Box>
            ),
            inContainer: false,
            actionRequired: 'confirm',
            onConfirm: () => {
                sendAction('$MakeFinalBet', {
                    value: betValueRef.current
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

    const internal = (game.session as JeopardySessionState).internal

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
        case 'answer-verifying':
        case 'answering':
            content = (
                <Grid sx={{ pt: 25 }} display="flex" flexDirection="column" spacing={3} container>
                    {isMasterView && props.status === 'answer-verifying' && (
                        <>
                            {internal.finalAnswers && Object.values(internal.finalAnswers).every(a => a.rate) && (
                                <Grid item>
                                    <Button onClick={() => sendAction('$ShowFinalScores', null)}>End</Button>
                                </Grid>
                            )}
                            <Grid item>
                                Correct: {internal.correctAnswers?.join(',')}
                                <br />
                                Incorrect: {internal.incorrectAnswers?.join(',')}
                                <Table aria-label="Final Answers" size="small">
                                    <TableHead>
                                        <TableRow>
                                            <TableCell>Player</TableCell>
                                            <TableCell>Answer</TableCell>
                                            <TableCell>Action</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {Object.entries(internal.finalAnswers).map(([playerId, answer]) => (
                                            <TableRow key={playerId}>
                                                <TableCell>{game.players.find(p => p.id === playerId)?.userNickname || playerId}</TableCell>
                                                <TableCell>{answer.value}</TableCell>
                                                <TableCell>
                                                    {!answer.rate && (
                                                        <>
                                                            <Button
                                                                color="success"
                                                                onClick={() =>
                                                                    sendAction('$RateFinalAnswer', { answeringPlayerId: playerId, rate: 'approved' })
                                                                }
                                                            >
                                                                Approve
                                                            </Button>
                                                            <Button
                                                                color="error"
                                                                onClick={() =>
                                                                    sendAction('$RateFinalAnswer', { answeringPlayerId: playerId, rate: 'declined' })
                                                                }
                                                            >
                                                                Decline
                                                            </Button>
                                                        </>
                                                    )}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </Grid>
                        </>
                    )}
                    {props.questionAtoms?.map((q, i) => (
                        <Grid item key={i}>
                            <FinalQuestion Resources={props.Resources} content={q.content || ''} type={q.type || 'text'} />
                        </Grid>
                    ))}
                    {!isMasterView && !props.playersThatAnswered.includes(user.id) && (
                        <Grid item>
                            <TextField value={answer} onChange={e => setAnswer(e.target.value)} />
                            <br />
                            <Button onClick={() => sendAction('$GiveFinalAnswer', { answer })} sx={{ mt: 2 }}>
                                Answer
                            </Button>
                        </Grid>
                    )}
                </Grid>
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
