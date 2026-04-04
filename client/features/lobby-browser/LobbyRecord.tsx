import type { LobbyBaseInfo } from 'shared/contracts/lobby'
import { LobbyPreview } from './LobbyPreview'
import { MouseEventHandler, useState } from 'react'
import type { LobbyData } from 'shared/contracts/app'
import { useRequestHandler, useWS } from 'client/context/list'
import { Button, Card, CardContent, Spinner } from 'client/ui/primitives'
import { ChevronUp, Lock } from 'lucide-react'

export const LobbyRecord: React.FC<LobbyBaseInfo> = props => {
    const ws = useWS()

    const [lobbyInfo, setLobbyInfo] = useState<LobbyData | null>(null)
    const [isLoading, setIsLoading] = useState(false)

    useRequestHandler('Lobby-GetPublicInfo', data => {
        if (!data.success) {
            setIsLoading(false)
            return console.log(data.message)
        }

        if (props.id === data.lobbyData.id) {
            setLobbyInfo(data.lobbyData)
            setIsLoading(false)
        }
    })

    const handleClick: MouseEventHandler<HTMLButtonElement> = e => {
        if (lobbyInfo) {
            e.preventDefault()
            return
        }

        if (isLoading) {
            return
        }

        setIsLoading(true)
        ws.send('Lobby-GetPublicInfo', {
            id: props.id
        })
    }

    return (
        <Card className="overflow-hidden">
            {lobbyInfo ? (
                <CardContent className="p-0">
                    <Button className="w-full rounded-none" variant="ghost" onClick={() => setLobbyInfo(null)}>
                        <ChevronUp className="size-4" />
                    </Button>
                    <div className="p-4">
                        <LobbyPreview lobby={lobbyInfo} />
                    </div>
                </CardContent>
            ) : (
                <button
                    className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left transition hover:bg-white/6"
                    disabled={isLoading}
                    onClick={handleClick}
                >
                    <span className="min-w-0 flex-1 font-medium text-white">{props.id}</span>
                    <div className="flex items-center gap-2">
                        {isLoading ? <Spinner className="size-4 text-violet-200" /> : null}
                        {props.private ? <Lock className="size-4 text-violet-200" /> : null}
                    </div>
                </button>
            )}
        </Card>
    )
}
