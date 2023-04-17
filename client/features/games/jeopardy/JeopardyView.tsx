import { PlayersHeader } from '../common/PlayersHeader'
import { LobbyControls } from 'client/features/lobby-controls/LobbyControls'
import { Jeopardy } from 'state/games/jeopardy/Jeopardy'
import { createGame } from '../common/GameFactory'
import { NoSession } from '../common/NoSession'
import { JeopardyCanvas } from './JeopardyCanvas'

export const [JeopardyView, useJeopardy, useJeopardyAction, useActionSender] = createGame<Jeopardy>(() => {
    const game = useJeopardy()

    return (
        <>
            <PlayersHeader members={game.players} isLoading={game.isLoading} />
            <JeopardyCanvas />
            <NoSession game={game} />
            <LobbyControls />
        </>
    )
})
