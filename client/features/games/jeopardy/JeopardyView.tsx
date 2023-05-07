import JSZip from 'jszip'
import { useEffect, useRef, useState } from 'react'
import { Jeopardy } from 'state/games/jeopardy/Jeopardy'
import { PlayersHeader } from '../common/PlayersHeader'
import { LobbyControls } from 'client/features/lobby-controls/LobbyControls'
import { createGame } from '../common/GameFactory'
import { NoSession } from '../common/NoSession'
import { JeopardyCanvas } from './JeopardyCanvas'
import { LoadingOverlay } from 'client/ui/loading-overlay/LoadingOverlay'
import { Button } from '@mui/material'
import { useLobby, useUser } from 'client/context/list'

export type JeopardyMedia = {
    Audio: Record<string, string>
    Images: Record<string, string>
    Video: Record<string, string>
}

async function fetchPack(url: string) {
    const response = await fetch(url)

    const data = await response.arrayBuffer()

    return new Uint8Array(data)
}

async function processFile(file: JSZip.JSZipObject, prefix: 'Audio' | 'Images' | 'Video', container: JeopardyMedia): Promise<void> {
    if (!file.name.startsWith(prefix + '/')) return

    const fileBlob = await file.async('blob')

    const fileUrl = URL.createObjectURL(fileBlob)

    const fileName = decodeURI(file.name.slice(prefix.length + 1))

    container[prefix][fileName] = fileUrl
}

async function getMediaFilesFromPack(jeopardyPack: Uint8Array): Promise<JeopardyMedia> {
    const zip = new JSZip()
    const contents = await zip.loadAsync(jeopardyPack)

    const mediaFiles: JeopardyMedia = {
        Audio: {},
        Images: {},
        Video: {}
    }

    const filePromises: Promise<void>[] = []

    for (const [, file] of Object.entries(contents.files)) {
        filePromises.push(processFile(file, 'Images', mediaFiles))
        filePromises.push(processFile(file, 'Audio', mediaFiles))
        filePromises.push(processFile(file, 'Video', mediaFiles))
    }

    await Promise.all(filePromises)

    return mediaFiles
}

export const [JeopardyView, useJeopardy, useJeopardyAction, useActionSender] = createGame<Jeopardy>(() => {
    const lobby = useLobby()
    const game = useJeopardy()
    const user = useUser()

    const actionSender = useActionSender()

    const [isPackLoading, setIsPackLoading] = useState(true)

    const Resources = useRef<JeopardyMedia>({
        Audio: {},
        Images: {},
        Video: {}
    })

    useEffect(() => {
        if (!game.initialData?.pack) return
        ;(async () => {
            setIsPackLoading(true)

            const packArchive = await fetchPack(game.initialData.pack.value)

            Resources.current = await getMediaFilesFromPack(packArchive)

            setIsPackLoading(false)
        })()
    }, [game.initialData])

    const highlightedPlayedId = game.session?.frame.id === 'question-board' ? game.session.frame.pickerId : undefined

    const gameControls: JSX.Element[] = []

    if (lobby.myRole !== 'spectator') {
        const isMasterView = game.players.some(p => p.id === user.id && p.playerIsMaster)

        gameControls.push(
            <Button
                disabled={
                    !game.session ||
                    (isMasterView
                        ? game.session?.frame.id === 'question-board'
                        : game.session?.frame.id !== 'question-content' || game.session.frame.skipVoted.includes(user.id))
                }
                onClick={() => actionSender('$SkipVote', null)}
                key="1"
            >
                Skip
            </Button>
        )

        if (!isMasterView) {
            const answerAllowed = game.session?.frame.id === 'question-content' && game.session.frame.answeringStatus === 'allowed'

            gameControls.push(
                <Button disabled={!answerAllowed} key="2" sx={{ minWidth: '50%' }}>
                    THE BUTTON
                </Button>
            )
        }
    }

    return (
        <>
            <PlayersHeader members={game.players} isLoading={game.isLoading} highlightedPlayedId={highlightedPlayedId} />
            <JeopardyCanvas isPackLoading={isPackLoading} Resources={Resources} />
            {isPackLoading ? <LoadingOverlay isLoading={isPackLoading} text="Pack loading" zIndex="auto" /> : <NoSession game={game} />}
            <LobbyControls buttons={gameControls} />
        </>
    )
})
