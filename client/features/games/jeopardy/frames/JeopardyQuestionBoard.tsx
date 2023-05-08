import React from 'react'
import { JeopardyState } from 'state/games/jeopardy/JeopardySessionState'
import { Box, Button, Divider } from '@mui/material'
import { useLobby, useUser } from 'client/context/list'
import { useActionSender, useJeopardy } from '../JeopardyView'

export const QuestionBoard: React.FC<JeopardyState.ShowQuestionBoardFrame> = props => {
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
        <Box sx={{ pt: 'calc(var(--playersHeaderHeight) + 10px)', paddingBottom: 7, transition: '0.5s' }} width="100%">
            {props.themes.map(t => (
                <Box key={t.themeId}>
                    <Divider>{t.name}</Divider>
                    <Box display="flex" justifyContent="space-evenly">
                        {t.question.map(q => (
                            <Button
                                fullWidth
                                size="large"
                                key={q.questionId}
                                id={q.questionId}
                                sx={{
                                    height: '90px',
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
    )
}
