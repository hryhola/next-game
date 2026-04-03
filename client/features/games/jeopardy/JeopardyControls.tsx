import { useI18n, useLobby, useUser } from 'client/context/list'
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
    const { t } = useI18n()

    const gameControls: React.ReactNode[] = []
    const isPaused = Boolean(game.session?.isPaused)

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
                !isPaused &&
                !questionFrame.playersOnCooldown.includes(user.id) &&
                !questionFrame.playersWhoAnswered.includes(user.id) &&
                questionFrame.answeringPlayerId !== user.id

            gameControls.push(
                <Button className="w-full" onClick={() => actionSender('$AnswerRequest', null)} disabled={!theButtonEnabled} key="2">
                    {t('jeopardy.theButton')}
                </Button>
            )
        } else {
            gameControls.push(
                <Button
                    variant="secondary"
                    disabled={!game.session || game.session?.frame.id === 'question-board' || isPaused}
                    onClick={() => actionSender('$SkipVote', null)}
                    key="1"
                >
                    {t('common.skip')}
                </Button>
            )
            gameControls.push(
                <Button variant="secondary" onClick={() => actionSender(game.session?.isPaused ? '$Resume' : '$Pause', null)} key="3">
                    {game.session?.isPaused ? t('common.resume') : t('common.pause')}
                </Button>
            )
        }
    }

    if (isPaused) {
        gameControls.push(
            <div className="w-full pt-1 text-center text-sm font-semibold uppercase tracking-[0.28em] text-slate-100/74" key="paused-label">
                {t('jeopardy.pause')}
            </div>
        )
    }

    return <LobbyControls buttons={gameControls} />
}

export default JeopardyControls
