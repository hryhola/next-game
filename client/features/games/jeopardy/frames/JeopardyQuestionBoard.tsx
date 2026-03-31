import React from 'react'
import { Box, Button, Divider } from 'client/ui/mui-shim'
import { useLobby, useRequestHandler, useUser } from 'client/context/list'
import { useActionSender, useJeopardy } from '../JeopardyView'
import type { RealtimeJeopardyQuestionId, RealtimeJeopardyState } from 'shared/contracts/jeopardy'

export const QuestionBoard: React.FC<RealtimeJeopardyState.QuestionBoardFrame> = props => {
    const sendAction = useActionSender()
    const user = useUser()
    const lobby = useLobby()
    const game = useJeopardy()

    const isMyTurn = props.pickerId === user.id
    const isMasterView = game.players.some(p => p.id === user.id && p.playerIsMaster)
    const [pendingPickedQuestionId, setPendingPickedQuestionId] = React.useState<RealtimeJeopardyQuestionId | null>(null)
    const pendingPickedQuestionIdRef = React.useRef<RealtimeJeopardyQuestionId | null>(null)
    const activePickedQuestionId = props.pickedQuestion || pendingPickedQuestionId
    const canPickQuestions = lobby.myRole !== 'spectator' && (isMasterView || isMyTurn)
    const isBoardLocked = Boolean(activePickedQuestionId)

    React.useEffect(() => {
        pendingPickedQuestionIdRef.current = pendingPickedQuestionId
    }, [pendingPickedQuestionId])

    React.useEffect(() => {
        if (props.pickedQuestion) {
            setPendingPickedQuestionId(null)
        }
    }, [props.pickedQuestion])

    useRequestHandler('Game-SendAction', data => {
        if (
            !data.success &&
            pendingPickedQuestionIdRef.current &&
            ['already_picked', 'invalid_frame', 'invalid_payload', 'not_picker', 'question_answered', 'question_not_found'].includes(
                'code' in data && typeof data.code === 'string' ? data.code : ''
            )
        ) {
            setPendingPickedQuestionId(null)
        }
    })

    const handleQuestionPick: React.MouseEventHandler<HTMLButtonElement> = event => {
        const questionId = event.currentTarget.id as `${number}-${number}-${number}`

        if (activePickedQuestionId) {
            return
        }

        setPendingPickedQuestionId(questionId)
        sendAction('$PickQuestion', {
            questionId
        })
    }

    return (
        <Box
            sx={{
                pt: 'calc(var(--playersHeaderHeight) + 10px)',
                pb: '64px',
                transition: '0.5s',
                height: 'var(--fullHeight)',
                overflowY: 'auto',
                overflowX: 'hidden',
                boxSizing: 'border-box'
            }}
            width="100%"
        >
            <Box className="mx-auto w-full px-4 lg:max-w-[1080px] xl:max-w-[1240px]">
                {props.themes.map(t => (
                    <Box key={t.themeId}>
                        <Divider>{t.name}</Divider>
                        <Box display="flex" justifyContent="space-evenly">
                            {t.question.map(q => {
                                const isActiveQuestion = activePickedQuestionId === q.questionId
                                const isDisabled = !canPickQuestions || q.isAnswered || isBoardLocked

                                return (
                                    <Button
                                        fullWidth
                                        size="large"
                                        variant="text"
                                        key={q.questionId}
                                        id={q.questionId}
                                        className={[
                                            'h-[90px] border-0 shadow-none',
                                            isActiveQuestion
                                                ? 'bg-gradient-to-r from-violet-500 via-purple-500 to-fuchsia-500 text-slate-950 shadow-[0_18px_40px_rgba(139,92,246,0.35)] disabled:opacity-100'
                                                : 'bg-white/4 text-violet-100 disabled:bg-white/4 disabled:text-violet-100/45',
                                            canPickQuestions && !isBoardLocked && !q.isAnswered
                                                ? 'hover:bg-gradient-to-r hover:from-violet-500 hover:via-purple-500 hover:to-fuchsia-500 hover:text-slate-950 hover:shadow-[0_18px_40px_rgba(139,92,246,0.35)]'
                                                : ''
                                        ].join(' ')}
                                        disabled={isDisabled}
                                        onClick={handleQuestionPick}
                                    >
                                        {!q.isAnswered ? q.price : ''}
                                    </Button>
                                )
                            })}
                        </Box>
                    </Box>
                ))}
            </Box>
        </Box>
    )
}
