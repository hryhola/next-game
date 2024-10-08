import { Button } from '@mui/material'
import { useLobby, useUser } from 'client/context/list'
import { LobbyControls } from 'client/features/lobby-controls/LobbyControls'
import React from 'react'
import { useActionSender, useJeopardy } from './JeopardyView'

type Props = {}

const JeopardyControls = (props: Props) => {
    const lobby = useLobby()
    const game = useJeopardy()
    const user = useUser()
    const actionSender = useActionSender()

    const gameControls: JSX.Element[] = []

    if (lobby.myRole !== 'spectator') {
        const isMasterView = game.players.some(p => p.id === user.id && p.playerIsMaster)

        if (!isMasterView) {
            const theButtonEnabled =
                game.session?.frame.id === 'question-content' &&
                game.session.frame.answeringStatus !== 'answering' &&
                game.session.frame.answeringStatus !== 'answer-verifying' &&
                !game.session.frame.playersOnCooldown.includes(user.id) &&
                !game.session.frame.playersWhoAnswered.includes(user.id) &&
                game.session.frame.answeringPlayerId !== user.id

            gameControls.push(
                <Button onClick={() => actionSender('$AnswerRequest', null)} disabled={!theButtonEnabled} key="2" fullWidth>
                    THE BUTTON
                </Button>
            )
        } else {
            gameControls.push(
                <Button disabled={!game.session || game.session?.frame.id === 'question-board'} onClick={() => actionSender('$SkipVote', null)} key="1">
                    Skip
                </Button>
            )
            gameControls.push(
                <Button onClick={() => actionSender(game.session?.isPaused ? '$Resume' : '$Pause', null)} key="3">
                    {game.session?.isPaused ? 'Resume' : 'Pause'}
                </Button>
            )
        }
    }

    return <LobbyControls buttons={gameControls} />
}

export default JeopardyControls
