import { useLobby, useUser } from 'client/context/list'
import { LobbyControls } from 'client/features/lobby-controls/LobbyControls'
import React from 'react'
import { useActionSender, useJeopardy } from './JeopardyView'
import { Button } from 'client/ui/primitives'

type Props = {}

const JeopardyControls = (props: Props) => {
    const lobby = useLobby()
    const game = useJeopardy()
    const user = useUser()
    const actionSender = useActionSender()

    const gameControls: React.ReactNode[] = []

    if (lobby.myRole !== 'spectator') {
        const isMasterView = game.players.some(p => p.id === user.id && p.playerIsMaster)
        const questionFrame = game.session?.frame.id === 'question-content' ? game.session.frame : null

        if (!isMasterView) {
            const isStandardBuzzerQuestion = questionFrame && (questionFrame.questionType === 'simple' || questionFrame.questionType === 'custom')
            const isEarlyBuzzWindow =
                isStandardBuzzerQuestion && questionFrame.specialPhase === 'showing-question' && questionFrame.answeringStatus === 'too-early'
            const isRegularBuzzWindow = questionFrame?.answeringStatus === 'allowed'
            const theButtonEnabled =
                (isEarlyBuzzWindow || isRegularBuzzWindow) &&
                !questionFrame.playersOnCooldown.includes(user.id) &&
                !questionFrame.playersWhoAnswered.includes(user.id) &&
                questionFrame.answeringPlayerId !== user.id

            gameControls.push(
                <Button className="w-full" onClick={() => actionSender('$AnswerRequest', null)} disabled={!theButtonEnabled} key="2">
                    THE BUTTON
                </Button>
            )
        } else {
            gameControls.push(
                <Button
                    variant="secondary"
                    disabled={!game.session || game.session?.frame.id === 'question-board'}
                    onClick={() => actionSender('$SkipVote', null)}
                    key="1"
                >
                    Skip
                </Button>
            )
            gameControls.push(
                <Button variant="secondary" onClick={() => actionSender(game.session?.isPaused ? '$Resume' : '$Pause', null)} key="3">
                    {game.session?.isPaused ? 'Resume' : 'Pause'}
                </Button>
            )
        }
    }

    return <LobbyControls buttons={gameControls} />
}

export default JeopardyControls
