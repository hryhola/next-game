import React from 'react'
import { JeopardyState } from 'state/games/jeopardy/JeopardySessionState'
import { Box, Button, Divider } from '@mui/material'

export const QuestionBoard: React.FC<JeopardyState.PickQuestionFrame> = props => {
    return (
        <Box sx={{ paddingTop: 20, paddingBottom: 7 }} width="100vw">
            {props.themes.map(t => (
                <Box key={t.themeId}>
                    <Divider>{t.name}</Divider>
                    <Box display="flex" justifyContent="space-evenly">
                        {t.question.map(q => (
                            <Button fullWidth size="large" key={q.questionId} sx={{ height: '90px' }} disabled={q.isAnswered}>
                                {!q.isAnswered ? q.price : ''}
                            </Button>
                        ))}
                    </Box>
                </Box>
            ))}
        </Box>
    )
}
