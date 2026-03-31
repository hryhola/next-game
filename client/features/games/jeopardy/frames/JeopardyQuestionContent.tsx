import { Box, Button, Grid, LinearProgress, Table, TableBody, TableCell, TableHead, TableRow, TextField, Typography } from 'client/ui/mui-shim'
import { useAudio, useLobby, useUser, useWS } from 'client/context/list'
import { isCloudflareRealtimeEnabled } from 'client/network-utils/realtimeMode'
import React, { MutableRefObject, useEffect, useRef, useState } from 'react'
import { useActionSender, useJeopardy, useJeopardyAction } from '../JeopardyView'
import { JeopardyMedia } from '../utils/jeopardyPackLoading'
import type { RealtimeJeopardySessionState, RealtimeJeopardyState } from 'shared/contracts/jeopardy'

type QuestionContentProps = RealtimeJeopardyState.QuestionContentFrame & {
    Resources: MutableRefObject<JeopardyMedia>
    packFetchingTimeMs: number
    useMediaTimestamp: boolean
}

type TimedProgressSource = {
    startedAt: string | null | undefined
    endsAt: string | null | undefined
    fallback: number | null | undefined
}

function getTimedProgress(startedAt: string | null | undefined, endsAt: string | null | undefined, fallback: number | null, nowMs: number): number | null {
    if (!startedAt || !endsAt) {
        return fallback
    }

    const startedAtMs = new Date(startedAt).getTime()
    const endsAtMs = new Date(endsAt).getTime()

    if (!Number.isFinite(startedAtMs) || !Number.isFinite(endsAtMs) || endsAtMs <= startedAtMs) {
        return fallback
    }

    const totalDurationMs = endsAtMs - startedAtMs
    const remainingMs = Math.max(0, endsAtMs - nowMs)

    return Math.max(0, Math.min(100, (remainingMs / totalDurationMs) * 100))
}

const LiveTimedProgressBar: React.FC<{
    color?: 'success' | 'secondary' | 'primary'
    getProgress: (nowMs: number) => number | null
    getIsPaused?: () => boolean
    initialProgress?: number | null
    style?: React.CSSProperties
}> = ({ color, getProgress, getIsPaused, initialProgress = null, style }) => {
    const [progress, setProgress] = useState<number | null>(initialProgress)

    useEffect(() => {
        let pausedAtMs: number | null = null

        const updateProgress = () => {
            const isPaused = getIsPaused?.() ?? false

            if (isPaused) {
                pausedAtMs ??= Date.now()
                setProgress(getProgress(pausedAtMs))
                return
            }

            pausedAtMs = null
            setProgress(getProgress(Date.now()))
        }

        updateProgress()

        const intervalId = window.setInterval(updateProgress, 100)

        return () => {
            window.clearInterval(intervalId)
        }
    }, [getIsPaused, getProgress])

    if (progress === null) {
        return null
    }

    return (
        <Box style={style}>
            <LinearProgress variant="determinate" value={progress} color={color} />
        </Box>
    )
}

export const QuestionContent: React.FC<QuestionContentProps> = props => {
    const user = useUser()
    const lobby = useLobby()
    const ws = useWS()
    const game = useJeopardy()
    const sendAction = useActionSender()
    const playerRef = useRef<HTMLAudioElement | HTMLVideoElement | null>(null)
    const audio = useAudio()
    const isWorkerMode = isCloudflareRealtimeEnabled()
    const [timerNowMs, setTimerNowMs] = useState(() => Date.now())
    const session = game.session as RealtimeJeopardySessionState | null
    const isMasterView = game.players.some(p => p.id === user.id && p.playerIsMaster)
    const setActiveBottomDock = lobby.setActiveBottomDock

    const answerInputRef = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null)
    const isPausedRef = useRef(game.session?.isPaused ?? false)
    const answerGivingProgressSourceRef = useRef<TimedProgressSource>({
        startedAt: props.answerGivingStartedAt,
        endsAt: props.answerGivingEndsAt,
        fallback: props.answerGivingTimeLeft
    })
    const answerVerifyingProgressSourceRef = useRef<TimedProgressSource>({
        startedAt: props.answerVerifyingStartedAt,
        endsAt: props.answerVerifyingEndsAt,
        fallback: props.answerVerifyingTimeLeft
    })

    useEffect(() => {
        answerGivingProgressSourceRef.current = {
            startedAt: props.answerGivingStartedAt,
            endsAt: props.answerGivingEndsAt,
            fallback: props.answerGivingTimeLeft
        }
    }, [props.answerGivingEndsAt, props.answerGivingStartedAt, props.answerGivingTimeLeft])

    useEffect(() => {
        answerVerifyingProgressSourceRef.current = {
            startedAt: props.answerVerifyingStartedAt,
            endsAt: props.answerVerifyingEndsAt,
            fallback: props.answerVerifyingTimeLeft
        }
    }, [props.answerVerifyingEndsAt, props.answerVerifyingStartedAt, props.answerVerifyingTimeLeft])

    useEffect(() => {
        isPausedRef.current = game.session?.isPaused ?? false
    }, [game.session?.isPaused])

    const answerRequestProgress = getTimedProgress(props.answerRequestStartedAt, props.answerRequestEndsAt, props.answerRequestTimeLeft, timerNowMs)
    const answerGivingProgress = getTimedProgress(props.answerGivingStartedAt, props.answerGivingEndsAt, props.answerGivingTimeLeft, timerNowMs)
    const answerVerifyingProgress = getTimedProgress(props.answerVerifyingStartedAt, props.answerVerifyingEndsAt, props.answerVerifyingTimeLeft, timerNowMs)
    const progressBarPositionClassName = 'fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom,0px)+148px)] md:bottom-0'
    const bottomDockPositionClassName =
        'pointer-events-none fixed inset-x-0 z-40 flex justify-center px-4 bottom-[calc(env(safe-area-inset-bottom,0px)+88px)] md:bottom-6'
    const bottomDockPanelClassName = 'glass-card pointer-events-auto w-full max-w-xl rounded-[2rem] p-3'
    const answerDockVisible = props.answeringStatus === 'answering' && props.answeringPlayerId === user.id
    const verifyDockVisible = props.answeringStatus === 'answer-verifying' && isMasterView && Boolean(session?.internal?.currentAnsweringPlayerId)
    const showAnswerGivingProgressBar = props.answeringStatus === 'answering' && answerGivingProgress !== null && !answerDockVisible
    const showAnswerVerifyingProgressBar = props.answeringStatus === 'answer-verifying' && answerVerifyingProgress !== null && !verifyDockVisible

    function updatePlayerVolume() {
        if (!playerRef.current) return

        playerRef.current.volume = audio.volume / 100
    }

    useEffect(() => {
        updatePlayerVolume()
    }, [audio.volume])

    useEffect(() => {
        updatePlayerVolume()
    }, [])

    useEffect(() => {
        if (!props.useMediaTimestamp || typeof props.elapsedMediaTimeMs !== 'number' || !playerRef.current) {
            return
        }

        playerRef.current.currentTime = (props.packFetchingTimeMs + props.elapsedMediaTimeMs) / 1000
    }, [props.elapsedMediaTimeMs, props.packFetchingTimeMs, props.questionId, props.useMediaTimestamp])

    useEffect(() => {
        const hasLiveWorkerTimer =
            (props.answeringStatus === 'allowed' && props.answerRequestStartedAt && props.answerRequestEndsAt) ||
            (props.answeringStatus === 'answering' && props.answerGivingStartedAt && props.answerGivingEndsAt) ||
            (props.answeringStatus === 'answer-verifying' && props.answerVerifyingStartedAt && props.answerVerifyingEndsAt)

        if (!hasLiveWorkerTimer) {
            return
        }

        if (game.session?.isPaused) {
            return
        }

        const intervalId = window.setInterval(() => setTimerNowMs(Date.now()), 100)

        return () => {
            window.clearInterval(intervalId)
        }
    }, [
        props.answerGivingEndsAt,
        props.answerGivingStartedAt,
        props.answerRequestEndsAt,
        props.answerRequestStartedAt,
        props.answerVerifyingEndsAt,
        props.answerVerifyingStartedAt,
        props.answeringStatus,
        game.session?.isPaused,
        props.questionId
    ])

    useEffect(() => {
        if (answerDockVisible) {
            answerInputRef.current?.focus()
        }
    }, [answerDockVisible])

    useEffect(() => {
        setActiveBottomDock(answerDockVisible ? 'jeopardy-answer' : verifyDockVisible ? 'jeopardy-verify' : null)
    }, [answerDockVisible, setActiveBottomDock, verifyDockVisible])

    useEffect(() => {
        return () => {
            setActiveBottomDock(null)
        }
    }, [setActiveBottomDock])

    useJeopardyAction('$Pause', data => {
        if (!data.result.success) return

        playerRef.current?.pause()
    })

    useJeopardyAction('$Resume', data => {
        if (!data.result.success) return

        playerRef.current?.play()
    })

    const handleMediaEnded = () => {
        if (!isWorkerMode) {
            return
        }

        ws.send('Game-SendAction', {
            actionName: '$MediaEnded',
            actionPayload: null,
            lobbyId: lobby.lobbyId
        })
    }

    const verifyingAnswerText = session?.internal?.currentAnsweringPlayerAnswerText
    const correctAnswers = session?.internal?.correctAnswers || []
    const incorrectAnswers = session?.internal?.incorrectAnswers || []
    const mostAnswersList: string[] = correctAnswers.length > incorrectAnswers.length ? correctAnswers : incorrectAnswers

    let content!: React.ReactNode

    switch (props.type) {
        case 'image': {
            content = <img src={props.Resources.current.Images[props.content.slice(1)]} alt="Question Image" />
            break
        }
        case 'video': {
            content = (
                <video
                    ref={playerRef as React.MutableRefObject<HTMLVideoElement | null>}
                    style={{ maxWidth: '100vw' }}
                    autoPlay
                    onEnded={handleMediaEnded}
                    src={props.Resources.current.Video[props.content.slice(1)]}
                ></video>
            )
            break
        }
        case 'voice': {
            content = (
                <>
                    <audio ref={playerRef} autoPlay onEnded={handleMediaEnded} src={props.Resources.current.Audio[props.content.slice(1)]}></audio>
                    <img src="/assets/jeopardy/audio.gif" alt="Audio question" />
                </>
            )
            break
        }
        case 'text':
        default: {
            content = <>{props.content}</>
        }
    }

    return (
        <>
            <Grid display="grid" justifyContent="center" alignContent="center" width="100vw" height="var(--fullHeight)" overflow="hidden">
                <Grid sx={{ textAlign: 'center' }} item>
                    {content}
                </Grid>
            </Grid>
            {verifyDockVisible ? (
                <div className={bottomDockPositionClassName}>
                    <div className={bottomDockPanelClassName}>
                        <div className="text-xs font-semibold uppercase tracking-[0.28em] text-violet-200/60">Verify Answer</div>
                        <Typography sx={{ pt: 2, pb: 3 }}>Answer: {verifyingAnswerText ? verifyingAnswerText : <i>no answer</i>}</Typography>
                        {mostAnswersList.length ? (
                            <Table aria-label="Answers" size="small">
                                <TableHead>
                                    <TableRow>
                                        <TableCell>Correct</TableCell>
                                        <TableCell>Wrong</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {mostAnswersList.map((_, i) => (
                                        <TableRow key={i}>
                                            <TableCell sx={{ color: theme => theme.palette.success.light }}>
                                                {correctAnswers[i] ? correctAnswers[i] : ''}
                                            </TableCell>
                                            <TableCell sx={{ color: theme => theme.palette.error.light }}>
                                                {incorrectAnswers[i] ? incorrectAnswers[i] : ''}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        ) : null}
                        <LiveTimedProgressBar
                            color="success"
                            initialProgress={answerVerifyingProgress}
                            getIsPaused={() => isPausedRef.current}
                            style={{ marginTop: '16px' }}
                            getProgress={nowMs => {
                                const { startedAt, endsAt, fallback } = answerVerifyingProgressSourceRef.current

                                return getTimedProgress(startedAt, endsAt, fallback ?? null, nowMs)
                            }}
                        />
                        <div className="mt-3 flex flex-wrap justify-end gap-3">
                            <Button color="error" onClick={() => sendAction('$RateAnswer', { rating: 'declined' })}>
                                Decline
                            </Button>
                            <Button color="success" onClick={() => sendAction('$RateAnswer', { rating: 'approved' })}>
                                Approve
                            </Button>
                        </div>
                    </div>
                </div>
            ) : null}
            {answerDockVisible ? (
                <div className={bottomDockPositionClassName}>
                    <div className={bottomDockPanelClassName}>
                        <div className="text-xs font-semibold uppercase tracking-[0.28em] text-violet-200/60">Your Answer</div>
                        <div className="mt-3">
                            <TextField multiline inputRef={answerInputRef} />
                        </div>
                        <LiveTimedProgressBar
                            color="secondary"
                            initialProgress={answerGivingProgress}
                            getIsPaused={() => isPausedRef.current}
                            style={{ marginTop: '16px' }}
                            getProgress={nowMs => {
                                const { startedAt, endsAt, fallback } = answerGivingProgressSourceRef.current

                                return getTimedProgress(startedAt, endsAt, fallback ?? null, nowMs)
                            }}
                        />
                        <div className="mt-3 flex justify-end">
                            <Button
                                onClick={() =>
                                    sendAction('$GiveAnswer', {
                                        text: answerInputRef.current?.value
                                    })
                                }
                            >
                                Confirm
                            </Button>
                        </div>
                    </div>
                </div>
            ) : null}
            {showAnswerVerifyingProgressBar && (
                <Box className={progressBarPositionClassName}>
                    <LinearProgress variant="determinate" value={answerVerifyingProgress} color="success" />
                </Box>
            )}
            {showAnswerGivingProgressBar && (
                <Box className={progressBarPositionClassName}>
                    <LinearProgress variant="determinate" value={answerGivingProgress} color="secondary" />
                </Box>
            )}
            {props.answeringStatus === 'allowed' && answerRequestProgress !== null && (
                <Box className={progressBarPositionClassName}>
                    <LinearProgress variant="determinate" value={answerRequestProgress} />
                </Box>
            )}
        </>
    )
}
