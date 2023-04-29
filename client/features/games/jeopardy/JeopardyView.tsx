import JSZip from 'jszip'
import { useEffect, useRef, useState } from 'react'
import { Jeopardy } from 'state/games/jeopardy/Jeopardy'
import { PlayersHeader } from '../common/PlayersHeader'
import { LobbyControls } from 'client/features/lobby-controls/LobbyControls'
import { createGame } from '../common/GameFactory'
import { NoSession } from '../common/NoSession'
import { JeopardyCanvas } from './JeopardyCanvas'
import { LoadingOverlay } from 'client/ui/loading-overlay/LoadingOverlay'

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
    const [isPackLoading, setIsPackLoading] = useState(false)

    const Resources = useRef<JeopardyMedia>({
        Audio: {},
        Images: {},
        Video: {}
    })

    const game = useJeopardy()

    useEffect(() => {
        if (!game.initialData?.pack) return

        ;(async () => {
            setIsPackLoading(true)

            const packArchive = await fetchPack(game.initialData.pack.value)

            Resources.current = await getMediaFilesFromPack(packArchive)

            setIsPackLoading(false)
        })()
    }, [game.initialData])

    return (
        <>
            <PlayersHeader members={game.players} isLoading={game.isLoading} />
            <JeopardyCanvas isPackLoading={isPackLoading} />
            {isPackLoading ? <LoadingOverlay isLoading={isPackLoading} text="Pack loading" zIndex="auto" /> : <NoSession game={game} />}
            <LobbyControls />
        </>
    )
})
