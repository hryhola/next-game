import { Box, DialogContentText, Grid, LinearProgress, Table, TableBody, TableCell, TableHead, TableRow, TextField, Typography } from '@mui/material'
import { useAudio, useUser } from 'client/context/list'
import { useGlobalModal } from 'client/features/global-modal/GlobalModal'
import { overlayedTabsToolbarHeight } from 'client/ui/overlayed-tabs/OverlayedTabs'
import React, { MutableRefObject, useEffect, useRef } from 'react'
import { JeopardySessionState, JeopardyState } from 'state/games/jeopardy/JeopardySessionState'
import { useActionSender, useJeopardy, useJeopardyAction } from '../JeopardyView'
import { JeopardyMedia } from '../utils/jeopardyPackLoading'

export const QuestionContent: React.FC<
    JeopardyState.QuestionContentFrame & {
        Resources: MutableRefObject<JeopardyMedia>
        packFetchingTimeMs: number
        useMediaTimestamp: boolean
    }
> = props => {
    const user = useUser()
    const game = useJeopardy()
    const globalModal = useGlobalModal()
    const actionSender = useActionSender()
    const playerRef = useRef<HTMLAudioElement | HTMLVideoElement | null>(null)
    const audio = useAudio()
    const sendAction = useActionSender()

    const answerInputRef = useRef<HTMLInputElement>(null)
    const closeAnswerModal = useRef<{ close: (() => void) | null }>({ close: null })
    const closeVerifyModal = useRef<{ close: (() => void) | null }>({ close: null })

    function updatePlayerVolume() {
        if (!playerRef.current) return

        playerRef.current.volume = audio.volume / 100
    }

    useEffect(() => {
        updatePlayerVolume()
    }, [audio.volume, playerRef.current])

    useEffect(() => {
        updatePlayerVolume()
    }, [])

    useEffect(() => {
        if (!props.useMediaTimestamp || typeof props.packFetchingTimeMs !== 'number' || typeof props.elapsedMediaTimeMs !== 'number' || !playerRef.current)
            return

        playerRef.current.currentTime = (props.packFetchingTimeMs + props.elapsedMediaTimeMs) / 1000
    }, [props.useMediaTimestamp])

    useEffect(() => {
        if (props.answeringPlayerId === user.id) {
            closeAnswerModal.current.close = globalModal.confirm({
                header: 'Your answer',
                actionRequired: true,
                content: <TextField multiline inputRef={answerInputRef} />,
                onConfirm: () =>
                    actionSender('$GiveAnswer', {
                        text: answerInputRef.current?.value
                    })
            })
        } else if (closeAnswerModal.current.close) {
            closeAnswerModal.current.close()
        }
    }, [props.answeringPlayerId])

    useEffect(() => {
        const session = game.session as JeopardySessionState

        if (session?.internal?.currentAnsweringPlayerId) {
            showVerifyModal(session.internal)
        }
    }, [(game.session as JeopardySessionState)?.internal?.currentAnsweringPlayerId])

    const showVerifyModal = (data: {
        currentAnsweringPlayerId: string | null
        currentAnsweringPlayerAnswerText?: string | null
        correctAnswers?: string[] | null
        incorrectAnswers?: string[] | null
    }) => {
        const correctAnswers = data.correctAnswers || []
        const incorrectAnswers = data.incorrectAnswers || []

        const mostAnswersList: string[] = correctAnswers.length > incorrectAnswers.length ? correctAnswers : incorrectAnswers

        closeVerifyModal.current.close = globalModal.confirm({
            header: 'Verify answer',
            actionRequired: true,
            inContainer: false,
            content: (
                <Box>
                    <Typography sx={{ pt: 2, pb: 3, pl: 2, pr: 2 }}>
                        Answer: {data.currentAnsweringPlayerAnswerText ? data.currentAnsweringPlayerAnswerText : <i>no answer</i>}
                    </Typography>
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
                                        <TableCell sx={{ color: theme => theme.palette.success.light }}>{correctAnswers[i] ? correctAnswers[i] : ''}</TableCell>
                                        <TableCell sx={{ color: theme => theme.palette.error.light }}>
                                            {incorrectAnswers[i] ? incorrectAnswers[i] : ''}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    ) : (
                        <></>
                    )}
                </Box>
            ),
            onConfirm: () => sendAction('$RateAnswer', { rating: 'approved' }),
            onCancel: () => sendAction('$RateAnswer', { rating: 'declined' })
        })
    }

    useJeopardyAction('$Pause', data => {
        if (!data.result.success) return

        playerRef.current?.pause()
    })

    useJeopardyAction('$Resume', data => {
        if (!data.result.success) return

        playerRef.current?.play()
    })

    let content!: JSX.Element

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
                    src={props.Resources.current.Video[props.content.slice(1)]}
                ></video>
            )
            break
        }
        case 'voice': {
            content = (
                <>
                    <audio ref={playerRef} autoPlay src={props.Resources.current.Audio[props.content.slice(1)]}></audio>
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
            {props.answeringStatus === 'answer-verifying' && props.answerVerifyingTimeLeft && (
                <Box sx={{ position: 'fixed', width: '100vw', bottom: overlayedTabsToolbarHeight }}>
                    <LinearProgress variant="determinate" value={props.answerVerifyingTimeLeft} color="success" />
                </Box>
            )}
            {props.answeringStatus === 'answering' && props.answerGivingTimeLeft && (
                <Box sx={{ position: 'fixed', width: '100vw', bottom: overlayedTabsToolbarHeight }}>
                    <LinearProgress variant="determinate" value={props.answerGivingTimeLeft} color="secondary" />
                </Box>
            )}
            {props.answeringStatus === 'allowed' && props.answerRequestTimeLeft && (
                <Box sx={{ position: 'fixed', width: '100vw', bottom: overlayedTabsToolbarHeight }}>
                    <LinearProgress variant="determinate" value={props.answerRequestTimeLeft} />
                </Box>
            )}
        </>
    )
}
