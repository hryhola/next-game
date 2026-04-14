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
import { useI18n, useLobby, useUser, useWS } from 'client/context/list'
import { isCloudflareRealtimeEnabled } from 'client/network-utils/realtimeMode'
import { cn } from 'client/ui/lib/cn'
import React, { MutableRefObject, useEffect, useRef, useState } from 'react'
import { useActionSender, useJeopardy, useJeopardyAction } from '../JeopardyView'
import { JeopardyMedia } from '../utils/jeopardyPackLoading'
import { useTimedProgress } from '../utils/timedProgress'
import { JeopardyContentAtom } from './JeopardyContentAtom'
import type { RealtimeJeopardySessionState, RealtimeJeopardyState } from 'shared/contracts/jeopardy'

type QuestionContentProps = RealtimeJeopardyState.QuestionContentFrame & {
    Resources: MutableRefObject<JeopardyMedia>
    packFetchingTimeMs: number
    useMediaTimestamp: boolean
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

const QuestionReferenceAnswersWidget: React.FC<{
    correctAnswers: string[]
    correctLabel: string
    incorrectAnswers: string[]
    incorrectLabel: string
    title: string
}> = ({ correctAnswers, correctLabel, incorrectAnswers, incorrectLabel, title }) => {
    return (
        <div className="jeopardy-floating-widget glass-card p-4">
            <div className="text-xs font-semibold uppercase tracking-[0.28em] text-violet-200/60">{title}</div>
            <div className="mt-3 space-y-3 text-sm">
                {correctAnswers.length ? (
                    <div>
                        <div className="text-[0.72em] font-semibold uppercase tracking-[0.22em] text-emerald-300">{correctLabel}</div>
                        <div className="mt-1 text-emerald-100">{correctAnswers.join(', ')}</div>
                    </div>
                ) : null}
                {incorrectAnswers.length ? (
                    <div>
                        <div className="text-[0.72em] font-semibold uppercase tracking-[0.22em] text-rose-300">{incorrectLabel}</div>
                        <div className="mt-1 text-rose-100">{incorrectAnswers.join(', ')}</div>
                    </div>
                ) : null}
            </div>
        </div>
    )
}

const AnimatedSideWidget: React.FC<{
    children: React.ReactNode
    visible: boolean
}> = ({ children, visible }) => {
    const [shouldRender, setShouldRender] = useState(visible)

    useEffect(() => {
        if (visible) {
            setShouldRender(true)
            return
        }

        const timeoutId = window.setTimeout(() => {
            setShouldRender(false)
        }, 220)

        return () => {
            window.clearTimeout(timeoutId)
        }
    }, [visible])

    if (!shouldRender) {
        return null
    }

    return (
        <div
            className={cn(
                'origin-top overflow-hidden transition-[max-height,opacity,transform] duration-200 ease-out',
                visible ? 'max-h-[24rem] translate-y-0 opacity-100' : 'pointer-events-none max-h-0 -translate-y-2 opacity-0'
            )}
        >
            {children}
        </div>
    )
}

export const QuestionContent: React.FC<QuestionContentProps> = props => {
    const user = useUser()
    const lobby = useLobby()
    const ws = useWS()
    const game = useJeopardy()
    const sendAction = useActionSender()
    const playerRef = useRef<HTMLAudioElement | HTMLVideoElement | null>(null)
    const { t } = useI18n()
    const isWorkerMode = isCloudflareRealtimeEnabled()
    const session = game.session as RealtimeJeopardySessionState | null
    const isMasterView = game.players.some(p => p.id === user.id && p.playerIsMaster)
    const setActiveBottomDock = lobby.setActiveBottomDock

    const answerInputRef = useRef<HTMLInputElement | null>(null)

    const answerRequestProgress = useTimedProgress({
        debugLabel: `question:${props.questionId}:answer-request`,
        endsAt: props.answerRequestEndsAt,
        fallbackProgress: props.answerRequestTimeLeft,
        isPaused: Boolean(game.session?.isPaused),
        startedAt: props.answerRequestStartedAt,
        trackingKey: `${props.questionId}:answer-request:${props.answeringStatus}`
    })
    const answerGivingProgress = useTimedProgress({
        debugLabel: `question:${props.questionId}:answer-giving`,
        endsAt: props.answerGivingEndsAt,
        fallbackProgress: props.answerGivingTimeLeft,
        isPaused: Boolean(game.session?.isPaused),
        startedAt: props.answerGivingStartedAt,
        trackingKey: `${props.questionId}:answer-giving:${props.answeringPlayerId || 'none'}:${props.answeringStatus}`
    })
    const answerVerifyingProgress = useTimedProgress({
        debugLabel: `question:${props.questionId}:answer-verifying`,
        endsAt: props.answerVerifyingEndsAt,
        fallbackProgress: props.answerVerifyingTimeLeft,
        isPaused: Boolean(game.session?.isPaused),
        startedAt: props.answerVerifyingStartedAt,
        trackingKey: `${props.questionId}:answer-verifying:${props.answeringStatus}`
    })
    const questionMetaDockVisible = Boolean(props.questionTheme || typeof props.questionPrice === 'number')
    const bottomDockPositionClassName =
        'pointer-events-none fixed inset-x-0 z-40 flex justify-center px-4 bottom-[calc(env(safe-area-inset-bottom,0px)+88px)] md:bottom-6'
    const rightWidgetStackStyle = { top: 'calc(var(--playersHeaderHeight, 0px) + 16px + var(--lobbyControlsRightHeight, 0px) + 12px)' }
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

    useEffect(() => {
        if (!props.useMediaTimestamp || typeof props.elapsedMediaTimeMs !== 'number' || !playerRef.current) {
            return
        }

        playerRef.current.currentTime = (props.packFetchingTimeMs + props.elapsedMediaTimeMs) / 1000
    }, [props.elapsedMediaTimeMs, props.packFetchingTimeMs, props.questionId, props.useMediaTimestamp])

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
    const referenceAnswersVisible =
        isMasterView &&
        !verifyDockVisible &&
        (props.specialPhase === 'showing-question' || props.answeringStatus === 'allowed' || props.answeringStatus === 'answering') &&
        (correctAnswers.length > 0 || incorrectAnswers.length > 0)
    const rightWidgetStackVisible = questionMetaDockVisible || referenceAnswersVisible
    const mostAnswersList: string[] = correctAnswers.length > incorrectAnswers.length ? correctAnswers : incorrectAnswers
    const currentPlayer = game.players.find(player => player.id === user.id)
    const valueSelectionKey = `${props.questionId}:${props.specialPhase || 'none'}:${(props.priceOptions || []).join(',')}:${props.questionPrice || ''}:${
        currentPlayer?.playerScore || ''
    }`
    const getRatedAnswerStatusLabel = (answer: { approvalMode?: 'full' | 'half' | 'third'; rate?: 'approved' | 'declined' }, playerId: string) => {
        if (answer.rate === 'approved') {
            if (answer.approvalMode === 'half') {
                return t('jeopardy.answerStatus.approvedHalf')
            }

            if (answer.approvalMode === 'third') {
                return t('jeopardy.answerStatus.approvedThird')
            }

            return t('jeopardy.answerStatus.approved')
        }

        if (answer.rate === 'declined') {
            return t('jeopardy.answerStatus.declined')
        }

        if (session?.internal?.currentAnsweringPlayerId === playerId) {
            return t('jeopardy.answerStatus.current')
        }

        return ''
    }

    return (
        <>
            <Grid
                display="grid"
                justifyContent="center"
                alignContent="center"
                width="100vw"
                height="calc(var(--fullHeight) - var(--playersHeaderHeight, 0px))"
                mt="var(--playersHeaderHeight, 0px)"
                overflow="hidden"
            >
                <Grid sx={{ textAlign: 'center' }} item>
                    <JeopardyContentAtom
                        Resources={props.Resources}
                        content={props.content}
                        contentPlacement={props.contentPlacement}
                        fullscreenCollapseButtonPosition="top"
                        isRef={props.isRef}
                        mediaAutoPlay
                        mediaControls={props.type === 'voice'}
                        mediaElementRef={playerRef}
                        onMediaEnded={handleMediaEnded}
                        type={props.type}
                    />
                </Grid>
            </Grid>
            {rightWidgetStackVisible ? (
                <div
                    className="pointer-events-none fixed right-4 z-30 flex w-[min(22rem,calc(100vw-2rem))] flex-col gap-3"
                    data-testid="jeopardy-side-widgets"
                    style={rightWidgetStackStyle}
                >
                    <AnimatedSideWidget visible={questionMetaDockVisible}>
                        <div className="glass-card pointer-events-auto p-4" data-testid="jeopardy-question-meta-dock">
                            <div className="flex items-center justify-between gap-4">
                                <div className="min-w-0">
                                    {props.questionTheme ? <div className="truncate text-sm font-semibold text-slate-100">{props.questionTheme}</div> : null}
                                </div>
                                {typeof props.questionPrice === 'number' ? (
                                    <div className="shrink-0 rounded-full border border-violet-300/30 bg-violet-500/14 px-4 py-1 text-lg font-semibold text-violet-50">
                                        {props.questionPrice}
                                    </div>
                                ) : null}
                            </div>
                        </div>
                    </AnimatedSideWidget>
                    <AnimatedSideWidget visible={referenceAnswersVisible}>
                        <QuestionReferenceAnswersWidget
                            correctAnswers={correctAnswers}
                            correctLabel={t('common.correct')}
                            incorrectAnswers={incorrectAnswers}
                            incorrectLabel={t('common.incorrect')}
                            title={t('jeopardy.referenceAnswers')}
                        />
                    </AnimatedSideWidget>
                </div>
            ) : null}
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
                                                <TableCell>{getRatedAnswerStatusLabel(answer, playerId)}</TableCell>
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
                            <Button color="success" variant="outlined" onClick={() => sendAction('$RateAnswer', { approvalMode: 'third', rating: 'approved' })}>
                                {t('jeopardy.approveThird')}
                            </Button>
                            <Button color="success" variant="outlined" onClick={() => sendAction('$RateAnswer', { approvalMode: 'half', rating: 'approved' })}>
                                {t('jeopardy.approveHalf')}
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
