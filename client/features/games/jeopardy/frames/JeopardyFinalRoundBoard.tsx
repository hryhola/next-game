import React, { MutableRefObject, useEffect, useRef, useState } from 'react'
import {
    Box,
    Button,
    Grid,
    LinearProgress,
    List,
    ListItem,
    ListItemButton,
    Slider,
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableRow,
    TextField
} from 'client/ui/mui-shim'
import { useUser } from 'client/context/list'
import { useActionSender, useJeopardy } from '../JeopardyView'
import { useGlobalModal } from 'client/features/global-modal/GlobalModal'
import { JeopardyMedia } from '../utils/jeopardyPackLoading'
import type { RealtimeJeopardySessionState, RealtimeJeopardyState } from 'shared/contracts/jeopardy'

function resolveFinalContent(Resources: MutableRefObject<JeopardyMedia>, type: string, content: string, isRef: boolean | undefined) {
    if (!isRef) {
        return content
    }

    switch (type) {
        case 'image':
            return Resources.current.Images[content] || content
        case 'video':
            return Resources.current.Video[content] || content
        case 'voice':
            return Resources.current.Audio[content] || content
        default:
            return content
    }
}

function getTimedProgress(startedAt: string | null | undefined, endsAt: string | null | undefined, fallback: number | null | undefined, nowMs: number) {
    if (!startedAt || !endsAt) {
        return fallback ?? null
    }

    const startedAtMs = new Date(startedAt).getTime()
    const endsAtMs = new Date(endsAt).getTime()

    if (!Number.isFinite(startedAtMs) || !Number.isFinite(endsAtMs) || endsAtMs <= startedAtMs) {
        return fallback ?? null
    }

    return Math.max(0, Math.min(100, ((endsAtMs - nowMs) / (endsAtMs - startedAtMs)) * 100))
}

const FinalQuestion: React.FC<{ type: string; content: string; isRef?: boolean; Resources: MutableRefObject<JeopardyMedia> }> = props => {
    const playerRef = useRef<HTMLAudioElement | HTMLVideoElement | null>(null)
    const resolvedContent = resolveFinalContent(props.Resources, props.type, props.content, props.isRef)

    switch (props.type) {
        case 'image': {
            return <img src={resolvedContent} alt="Question Image" />
        }
        case 'video': {
            return (
                <video ref={playerRef as React.MutableRefObject<HTMLVideoElement | null>} style={{ maxWidth: '100vw' }} controls src={resolvedContent}></video>
            )
        }
        case 'voice': {
            return (
                <>
                    <audio ref={playerRef} controls src={resolvedContent}></audio>
                    <img src="/assets/jeopardy/audio.gif" alt="Audio question" />
                </>
            )
        }
        case 'html': {
            return <div dangerouslySetInnerHTML={{ __html: resolvedContent }} />
        }
        case 'text':
        default: {
            return <>{props.content}</>
        }
    }
}

export const FinalRoundBoard: React.FC<
    RealtimeJeopardyState.FinalRoundBoardFrame & {
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
    const [timerNowMs, setTimerNowMs] = useState(() => Date.now())

    const isMasterView = game.players.some(p => p.id === user.id && p.playerIsMaster)
    const phaseProgress = getTimedProgress(props.phaseStartedAt, props.phaseEndsAt, props.phaseTimeLeft, timerNowMs)

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
            title: 'Make your bet',
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

    useEffect(() => {
        if (!props.phaseStartedAt || !props.phaseEndsAt) {
            return
        }

        const intervalId = window.setInterval(() => setTimerNowMs(Date.now()), 100)

        return () => {
            window.clearInterval(intervalId)
        }
    }, [props.phaseEndsAt, props.phaseStartedAt, props.status])

    const internal = (game.session as RealtimeJeopardySessionState).internal

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
                            <FinalQuestion Resources={props.Resources} content={q.content || ''} isRef={q.isRef} type={q.type || 'text'} />
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
                {phaseProgress !== null && ['answering', 'betting', 'skipping'].includes(props.status) ? (
                    <Box sx={{ mt: 3 }}>
                        <LinearProgress variant="determinate" value={phaseProgress} />
                    </Box>
                ) : null}
            </Grid>
        </Grid>
    )
}
