import React from 'react'
import { Box, Button, Divider } from 'client/ui/mui-shim'
import { useLobby, useUser } from 'client/context/list'
import { useActionSender, useJeopardy } from '../JeopardyView'
import type { RealtimeJeopardyState } from 'shared/contracts/jeopardy'

export const QuestionBoard: React.FC<RealtimeJeopardyState.QuestionBoardFrame> = props => {
    const sendAction = useActionSender()
    const user = useUser()
    const lobby = useLobby()
    const game = useJeopardy()

    const isMyTurn = props.pickerId === user.id
    const isMasterView = game.players.some(p => p.id === user.id && p.playerIsMaster)

    const handleQuestionPick: React.MouseEventHandler<HTMLButtonElement> = event => {
        const questionId = event.currentTarget.id as `${number}-${number}-${number}`

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
                            {t.question.map(q => (
                                <Button
                                    fullWidth
                                    size="large"
                                    variant="text"
                                    key={q.questionId}
                                    id={q.questionId}
                                    className="h-[90px] border-0 bg-white/4 text-violet-100 shadow-none hover:bg-gradient-to-r hover:from-violet-500 hover:via-purple-500 hover:to-fuchsia-500 hover:text-slate-950 hover:shadow-[0_18px_40px_rgba(139,92,246,0.35)] disabled:bg-white/4 disabled:text-violet-100/45"
                                    sx={{
                                        background: t => (props.pickedQuestion === q.questionId ? t.palette.success.main + '!important' : undefined),
                                        color: t => (props.pickedQuestion === q.questionId ? t.palette.success.contrastText + '!important' : undefined)
                                    }}
                                    disabled={lobby.myRole === 'spectator' || (isMasterView ? false : !isMyTurn) || q.isAnswered}
                                    onClick={handleQuestionPick}
                                >
                                    {!q.isAnswered ? q.price : ''}
                                </Button>
                            ))}
                        </Box>
                    </Box>
                ))}
            </Box>
        </Box>
    )
}
