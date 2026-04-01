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

const FinalBetDock: React.FC<{
    initialValue: number
    maxValue: number
    onConfirm: (value: number) => void
}> = ({ initialValue, maxValue, onConfirm }) => {
    const [betValue, setBetValue] = useState(initialValue)

    return (
        <>
            <div className="text-xs font-semibold uppercase tracking-[0.28em] text-violet-200/60">Final Bet</div>
            <div className="mt-3 text-4xl font-semibold tabular-nums text-white">{betValue}</div>
            <Box minWidth="260px" display="flex" justifyContent="center" alignItems="center">
                <Slider
                    sx={{ mt: 4, mx: 2, mb: 2 }}
                    value={betValue}
                    onChange={(_, nextValue) => setBetValue(nextValue as number)}
                    min={1}
                    max={maxValue}
                    step={1}
                />
            </Box>
            <div className="mt-3 flex justify-end">
                <Button onClick={() => onConfirm(betValue)}>Confirm Bet</Button>
            </div>
        </>
    )
}

const FinalAnswerDock: React.FC<{
    onSubmit: (answer: string) => void
}> = ({ onSubmit }) => {
    const [answer, setAnswer] = useState('')

    return (
        <>
            <div className="text-xs font-semibold uppercase tracking-[0.28em] text-violet-200/60">Final Answer</div>
            <div className="mt-3">
                <TextField value={answer} onChange={event => setAnswer(event.target.value)} />
            </div>
            <div className="mt-3 flex justify-end">
                <Button onClick={() => onSubmit(answer)}>Submit Answer</Button>
            </div>
        </>
    )
}

export const FinalRoundBoard: React.FC<
    RealtimeJeopardyState.FinalRoundBoardFrame & {
        Resources: MutableRefObject<JeopardyMedia>
    }
> = props => {
    const user = useUser()
    const game = useJeopardy()
    const sendAction = useActionSender()
    const [timerNowMs, setTimerNowMs] = useState(() => Date.now())

    const isMasterView = game.players.some(p => p.id === user.id && p.playerIsMaster)
    const phaseProgress = getTimedProgress(props.phaseStartedAt, props.phaseEndsAt, props.phaseTimeLeft, timerNowMs)
    const session = game.session as RealtimeJeopardySessionState | null
    const internal = session?.internal
    const currentPlayer = game.players.find(player => player.id === user.id)
    const activeThemeName = props.themes.find(theme => !theme.skipped)?.name || null
    const bettingDockVisible =
        props.status === 'betting' &&
        Boolean(
            currentPlayer &&
            currentPlayer.memberIsPlayer &&
            !currentPlayer.playerIsMaster &&
            currentPlayer.playerScore > 0 &&
            !props.playersThatMadeBet.includes(currentPlayer.id)
        )
    const answeringDockVisible =
        props.status === 'answering' &&
        Boolean(
            currentPlayer &&
            currentPlayer.memberIsPlayer &&
            !currentPlayer.playerIsMaster &&
            currentPlayer.playerScore > 0 &&
            !props.playersThatAnswered.includes(currentPlayer.id)
        )
    const verifyDockVisible = isMasterView && props.status === 'answer-verifying' && Boolean(internal)
    const hasBottomDock = bettingDockVisible || answeringDockVisible || verifyDockVisible
    const progressBarPositionClassName = hasBottomDock
        ? 'fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom,0px)+148px)] md:bottom-0'
        : 'fixed inset-x-0 bottom-0'
    const bottomDockPositionClassName =
        'pointer-events-none fixed inset-x-0 z-40 flex justify-center px-4 bottom-[calc(env(safe-area-inset-bottom,0px)+88px)] md:bottom-6'
    const bottomDockPanelClassName = 'glass-card pointer-events-auto w-full max-w-xl rounded-[2rem] p-3'
    const verifyDockPanelClassName = 'glass-card pointer-events-auto w-full max-w-4xl rounded-[2rem] p-3'

    const handleSkip = (id: number) => () => {
        sendAction('$SkipFinalTheme', {
            themeIndex: id
        })
    }

    useEffect(() => {
        if (!props.phaseStartedAt || !props.phaseEndsAt) {
            return
        }

        const intervalId = window.setInterval(() => setTimerNowMs(Date.now()), 100)

        return () => {
            window.clearInterval(intervalId)
        }
    }, [props.phaseEndsAt, props.phaseStartedAt, props.status])

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
        case 'betting':
            content = (
                <div className="mx-auto flex max-w-3xl flex-col items-center gap-4 px-6 text-center">
                    <div className="text-xs font-semibold uppercase tracking-[0.28em] text-violet-200/60">Final Theme</div>
                    <div className="text-3xl font-semibold text-white">{activeThemeName || 'Final Question'}</div>
                </div>
            )
            break
        case 'answer-verifying':
        case 'answering':
            content = (
                <Grid display="flex" flexDirection="column" spacing={3} container>
                    {props.questionAtoms?.map((q, i) => (
                        <Grid item key={i}>
                            <FinalQuestion Resources={props.Resources} content={q.content || ''} isRef={q.isRef} type={q.type || 'text'} />
                        </Grid>
                    ))}
                </Grid>
            )
            break
    }

    return (
        <>
            <Grid display="grid" justifyContent="center" alignContent="center" width="100vw" minHeight="var(--fullHeight)">
                <Grid sx={{ textAlign: 'center' }} item>
                    {content}
                </Grid>
            </Grid>
            {bettingDockVisible && currentPlayer ? (
                <div className={bottomDockPositionClassName}>
                    <div className={bottomDockPanelClassName}>
                        <FinalBetDock
                            key={`final-bet:${currentPlayer.id}:${currentPlayer.playerScore}:${props.playersThatMadeBet.join(',')}`}
                            initialValue={Math.min(Math.max(1, internal?.finalBets?.[currentPlayer.id] || 1), currentPlayer.playerScore)}
                            maxValue={currentPlayer.playerScore}
                            onConfirm={value => sendAction('$MakeFinalBet', { value })}
                        />
                    </div>
                </div>
            ) : null}
            {answeringDockVisible ? (
                <div className={bottomDockPositionClassName}>
                    <div className={bottomDockPanelClassName}>
                        <FinalAnswerDock
                            key={`final-answer:${user.id}:${props.playersThatAnswered.join(',')}`}
                            onSubmit={answer => sendAction('$GiveFinalAnswer', { answer })}
                        />
                    </div>
                </div>
            ) : null}
            {verifyDockVisible && internal ? (
                <div className={bottomDockPositionClassName}>
                    <div className={verifyDockPanelClassName}>
                        <div className="text-xs font-semibold uppercase tracking-[0.28em] text-violet-200/60">Verify Final Answers</div>
                        <div className="mt-3 text-sm text-white/80">Correct: {internal.correctAnswers?.join(', ') || 'None'}</div>
                        <div className="text-sm text-white/65">Incorrect: {internal.incorrectAnswers?.join(', ') || 'None'}</div>
                        <div className="mt-4 max-h-[40vh] overflow-auto">
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
                                            <TableCell>{game.players.find(player => player.id === playerId)?.userNickname || playerId}</TableCell>
                                            <TableCell>{answer.value}</TableCell>
                                            <TableCell>
                                                {!answer.rate ? (
                                                    <div className="flex flex-wrap gap-2">
                                                        <Button
                                                            color="success"
                                                            onClick={() => sendAction('$RateFinalAnswer', { answeringPlayerId: playerId, rate: 'approved' })}
                                                        >
                                                            Approve
                                                        </Button>
                                                        <Button
                                                            color="error"
                                                            onClick={() => sendAction('$RateFinalAnswer', { answeringPlayerId: playerId, rate: 'declined' })}
                                                        >
                                                            Decline
                                                        </Button>
                                                    </div>
                                                ) : (
                                                    <span className="text-sm capitalize text-white/70">{answer.rate}</span>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                        {Object.values(internal.finalAnswers).length > 0 && Object.values(internal.finalAnswers).every(answer => answer.rate) ? (
                            <div className="mt-4 flex justify-end">
                                <Button onClick={() => sendAction('$ShowFinalScores', null)}>End</Button>
                            </div>
                        ) : null}
                    </div>
                </div>
            ) : null}
            {phaseProgress !== null && ['answering', 'betting', 'skipping'].includes(props.status) ? (
                <Box className={progressBarPositionClassName}>
                    <LinearProgress variant="determinate" value={phaseProgress} />
                </Box>
            ) : null}
        </>
    )
}
