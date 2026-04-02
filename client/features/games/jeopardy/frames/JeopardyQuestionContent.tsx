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
    TextField,
    Typography
} from 'client/ui/mui-shim'
import { useAudio, useI18n, useLobby, useUser, useWS } from 'client/context/list'
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

function resolvePackContent(
    Resources: MutableRefObject<JeopardyMedia>,
    type: 'html' | 'image' | 'text' | 'video' | 'voice',
    content: string,
    isRef: boolean | undefined
): string {
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

const QuestionValueDock: React.FC<{
    initialValue: number
    maxValue: number
    minValue: number
    onConfirm: (value: number) => void
    title: string
}> = ({ initialValue, maxValue, minValue, onConfirm, title }) => {
    const [selectedValue, setSelectedValue] = useState(initialValue)
    const { t } = useI18n()

    return (
        <>
            <div className="text-xs font-semibold uppercase tracking-[0.28em] text-violet-200/60">{title}</div>
            <div className="mt-3 text-center text-2xl font-semibold text-white">{selectedValue}</div>
            <Box minWidth="260px" display="flex" justifyContent="center" alignItems="center">
                <Slider
                    sx={{ mt: 4, mx: 2, mb: 2 }}
                    value={selectedValue}
                    onChange={(_, value) => setSelectedValue(value as number)}
                    min={minValue}
                    max={maxValue}
                    step={1}
                />
            </Box>
            <div className="mt-3 flex justify-end">
                <Button onClick={() => onConfirm(selectedValue)}>{t('common.confirmShort')}</Button>
            </div>
        </>
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
    const { t } = useI18n()
    const isWorkerMode = isCloudflareRealtimeEnabled()
    const [timerNowMs, setTimerNowMs] = useState(() => Date.now())
    const session = game.session as RealtimeJeopardySessionState | null
    const isMasterView = game.players.some(p => p.id === user.id && p.playerIsMaster)
    const setActiveBottomDock = lobby.setActiveBottomDock

    const answerInputRef = useRef<HTMLInputElement | null>(null)

    const answerRequestProgress = getTimedProgress(props.answerRequestStartedAt, props.answerRequestEndsAt, props.answerRequestTimeLeft, timerNowMs)
    const answerGivingProgress = getTimedProgress(props.answerGivingStartedAt, props.answerGivingEndsAt, props.answerGivingTimeLeft, timerNowMs)
    const answerVerifyingProgress = getTimedProgress(props.answerVerifyingStartedAt, props.answerVerifyingEndsAt, props.answerVerifyingTimeLeft, timerNowMs)
    const bottomDockPositionClassName =
        'pointer-events-none fixed inset-x-0 z-40 flex justify-center px-4 bottom-[calc(env(safe-area-inset-bottom,0px)+88px)] md:bottom-6'
    const bottomDockPanelClassName = 'glass-card pointer-events-auto w-full max-w-xl rounded-[2rem] p-3'
    const isMultiAnswerQuestion = props.questionType === 'forAll' || props.questionType === 'stakeAll'
    const answerDockVisible =
        props.answeringStatus === 'answering' &&
        ((props.answeringPlayerId === user.id && !isMultiAnswerQuestion) ||
            (!isMasterView && isMultiAnswerQuestion && Boolean(props.eligiblePlayerIds?.includes(user.id)) && !props.playersWhoAnswered.includes(user.id)))
    const selectionDockVisible = props.specialPhase === 'selecting-player' && (isMasterView || props.answeringPlayerId === user.id)
    const valueDockVisible =
        (props.specialPhase === 'choosing-price' || props.specialPhase === 'making-stake') && (isMasterView || props.answeringPlayerId === user.id)
    const hiddenStakeDockVisible =
        props.specialPhase === 'making-hidden-stakes' &&
        !isMasterView &&
        Boolean(props.eligiblePlayerIds?.includes(user.id)) &&
        !Boolean(props.playersThatMadeBet?.includes(user.id))
    const verifyDockVisible = props.answeringStatus === 'answer-verifying' && isMasterView && Boolean(session?.internal?.currentAnsweringPlayerId)
    const progressBarPositionClassName = 'fixed inset-x-0 bottom-0'
    const showAnswerProgressBar =
        (props.answeringStatus === 'allowed' && answerRequestProgress !== null) || (props.answeringStatus === 'answering' && answerGivingProgress !== null)
    const answerProgressValue = props.answeringStatus === 'answering' ? answerGivingProgress : answerRequestProgress
    const showAnswerVerifyingProgressBar = props.answeringStatus === 'answer-verifying' && answerVerifyingProgress !== null
    const showInlineAnswerProgressBar = answerDockVisible && props.answeringStatus === 'answering' && answerGivingProgress !== null
    const showInlineVerifyProgressBar = verifyDockVisible && showAnswerVerifyingProgressBar
    const showBottomAnswerProgressBar = showAnswerProgressBar && !showInlineAnswerProgressBar
    const showBottomVerifyProgressBar = showAnswerVerifyingProgressBar && !showInlineVerifyProgressBar

    const submitAnswer = () => {
        sendAction('$GiveAnswer', {
            text: answerInputRef.current?.value
        })
    }

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
            actionPayload: {
                content: props.content,
                mediaStartedAt: props.mediaStartedAt || null,
                questionId: props.questionId,
                type: props.type === 'video' || props.type === 'voice' ? props.type : undefined
            },
            lobbyId: lobby.lobbyId
        })
    }

    const verifyingAnswerText = session?.internal?.currentAnsweringPlayerAnswerText
    const questionAnswers = session?.internal?.currentQuestionAnswers || {}
    const correctAnswers = session?.internal?.correctAnswers || []
    const incorrectAnswers = session?.internal?.incorrectAnswers || []
    const mostAnswersList: string[] = correctAnswers.length > incorrectAnswers.length ? correctAnswers : incorrectAnswers
    const currentPlayer = game.players.find(player => player.id === user.id)
    const resolvedContent = resolvePackContent(props.Resources, props.type, props.content, props.isRef)
    const valueSelectionKey = `${props.questionId}:${props.specialPhase || 'none'}:${(props.priceOptions || []).join(',')}:${props.questionPrice || ''}:${
        currentPlayer?.playerScore || ''
    }`

    let content!: React.ReactNode

    switch (props.type) {
        case 'image': {
            content = <img src={resolvedContent} alt={t('image.alt.questionImage')} />
            break
        }
        case 'video': {
            content = (
                <video
                    ref={playerRef as React.MutableRefObject<HTMLVideoElement | null>}
                    style={{ maxWidth: '100vw' }}
                    autoPlay
                    onEnded={handleMediaEnded}
                    src={resolvedContent}
                ></video>
            )
            break
        }
        case 'voice': {
            content = (
                <>
                    <audio ref={playerRef} autoPlay onEnded={handleMediaEnded} src={resolvedContent}></audio>
                    <img src="/assets/jeopardy/audio.gif" alt={t('image.alt.audioQuestion')} />
                </>
            )
            break
        }
        case 'html': {
            content = <div dangerouslySetInnerHTML={{ __html: resolvedContent }} />
            break
        }
        case 'text':
        default: {
            content =
                props.contentPlacement === 'replic' ? (
                    <div className="mx-auto max-w-3xl rounded-[1.5rem] border border-white/10 bg-blue-950/70 px-6 py-4 text-lg">{props.content}</div>
                ) : (
                    <>{props.content}</>
                )
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
                        <div className="text-xs font-semibold uppercase tracking-[0.28em] text-violet-200/60">{t('jeopardy.verifyAnswer')}</div>
                        <Typography sx={{ pt: 2, pb: 3 }}>{t('jeopardy.answerLabel', { answer: verifyingAnswerText || t('jeopardy.noAnswer') })}</Typography>
                        {mostAnswersList.length ? (
                            <Table aria-label={t('common.answer')} size="small">
                                <TableHead>
                                    <TableRow>
                                        <TableCell>{t('common.correct')}</TableCell>
                                        <TableCell>{t('common.incorrect')}</TableCell>
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
                        {Object.keys(questionAnswers).length > 1 ? (
                            <div className="mt-4">
                                <Table aria-label={t('jeopardy.submittedAnswers')} size="small">
                                    <TableHead>
                                        <TableRow>
                                            <TableCell>{t('common.player')}</TableCell>
                                            <TableCell>{t('common.answer')}</TableCell>
                                            <TableCell>{t('common.wager')}</TableCell>
                                            <TableCell>{t('common.rate')}</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {Object.entries(questionAnswers).map(([playerId, answer]) => (
                                            <TableRow key={playerId}>
                                                <TableCell>{game.players.find(player => player.id === playerId)?.userNickname || playerId}</TableCell>
                                                <TableCell>{answer.value}</TableCell>
                                                <TableCell>{answer.wager ?? props.questionPrice ?? ''}</TableCell>
                                                <TableCell>
                                                    {answer.rate === 'approved'
                                                        ? t('jeopardy.answerStatus.approved')
                                                        : answer.rate === 'declined'
                                                          ? t('jeopardy.answerStatus.declined')
                                                          : session?.internal?.currentAnsweringPlayerId === playerId
                                                            ? t('jeopardy.answerStatus.current')
                                                            : ''}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        ) : null}
                        {showInlineVerifyProgressBar ? (
                            <div className="mt-4">
                                <LinearProgress variant="determinate" value={answerVerifyingProgress} color="success" />
                            </div>
                        ) : null}
                        <div className="mt-3 flex flex-wrap justify-end gap-3">
                            <Button color="error" onClick={() => sendAction('$RateAnswer', { rating: 'declined' })}>
                                {t('common.decline')}
                            </Button>
                            <Button color="success" onClick={() => sendAction('$RateAnswer', { rating: 'approved' })}>
                                {t('common.approve')}
                            </Button>
                        </div>
                    </div>
                </div>
            ) : null}
            {selectionDockVisible ? (
                <div className={bottomDockPositionClassName}>
                    <div className={bottomDockPanelClassName}>
                        <div className="text-xs font-semibold uppercase tracking-[0.28em] text-violet-200/60">{t('jeopardy.choosePlayer')}</div>
                        <div className="mt-2">
                            <List>
                                {(props.eligiblePlayerIds || []).map(playerId => (
                                    <ListItem key={playerId} disablePadding>
                                        <ListItemButton onClick={() => sendAction('$SelectQuestionPlayer', { playerId })}>
                                            {game.players.find(player => player.id === playerId)?.userNickname || playerId}
                                        </ListItemButton>
                                    </ListItem>
                                ))}
                            </List>
                        </div>
                    </div>
                </div>
            ) : null}
            {valueDockVisible || hiddenStakeDockVisible ? (
                <div className={bottomDockPositionClassName}>
                    <div className={bottomDockPanelClassName}>
                        <QuestionValueDock
                            key={valueSelectionKey}
                            title={props.specialPhase === 'making-hidden-stakes' ? t('jeopardy.hiddenStake') : t('jeopardy.questionValue')}
                            initialValue={props.questionPrice || props.priceOptions?.[0] || 1}
                            minValue={props.specialPhase === 'making-hidden-stakes' ? 1 : props.priceOptions?.[0] || 1}
                            maxValue={
                                props.specialPhase === 'making-hidden-stakes'
                                    ? Math.max(currentPlayer?.playerScore || 1, 1)
                                    : props.priceOptions?.[props.priceOptions.length - 1] || props.questionPrice || 1
                            }
                            onConfirm={value => sendAction('$SetQuestionValue', { value })}
                        />
                    </div>
                </div>
            ) : null}
            {answerDockVisible ? (
                <div className={bottomDockPositionClassName}>
                    <div className={bottomDockPanelClassName}>
                        <div className="text-xs font-semibold uppercase tracking-[0.28em] text-violet-200/60">{t('jeopardy.yourAnswer')}</div>
                        <div className="mt-3">
                            <TextField
                                inputRef={answerInputRef}
                                onKeyDown={event => {
                                    if (event.key === 'Enter') {
                                        event.preventDefault()
                                        submitAnswer()
                                    }
                                }}
                            />
                        </div>
                        {showInlineAnswerProgressBar ? (
                            <div className="mt-4">
                                <LinearProgress variant="determinate" value={answerGivingProgress} color="secondary" />
                            </div>
                        ) : null}
                        <div className="mt-3 flex justify-end">
                            <Button onClick={submitAnswer}>{t('common.confirmShort')}</Button>
                        </div>
                    </div>
                </div>
            ) : null}
            {showBottomVerifyProgressBar && (
                <Box className={progressBarPositionClassName}>
                    <LinearProgress variant="determinate" value={answerVerifyingProgress} color="success" />
                </Box>
            )}
            {showBottomAnswerProgressBar && answerProgressValue !== null && (
                <Box className={progressBarPositionClassName}>
                    <LinearProgress variant="determinate" value={answerProgressValue} color="secondary" />
                </Box>
            )}
        </>
    )
}
