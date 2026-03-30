import type { LobbyBaseInfo } from 'shared/contracts/lobby'
import { LobbyPreview } from './LobbyPreview'
import { MouseEventHandler, useState } from 'react'
import type { LobbyData } from 'shared/contracts/app'
import { useRequestHandler, useWS } from 'client/context/list'
import { Button, Card, CardContent } from 'client/ui/primitives'
import { ChevronUp, Lock } from 'lucide-react'

export const LobbyRecord: React.FC<LobbyBaseInfo> = props => {
    const ws = useWS()

    const [lobbyInfo, setLobbyInfo] = useState<LobbyData | null>(null)

    useRequestHandler('Lobby-GetPublicInfo', data => {
        if (!data.success) {
            return console.log(data.message)
        }

        if (props.id === data.lobbyData.id) {
            setLobbyInfo(data.lobbyData)
        }
    })

    const handleClick: MouseEventHandler<HTMLButtonElement> = e => {
        if (lobbyInfo) {
            e.preventDefault()
        } else {
            ws.send('Lobby-GetPublicInfo', {
                id: props.id
            })
        }
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
                <button className="flex w-full items-center justify-between px-5 py-4 text-left transition hover:bg-white/6" onClick={handleClick}>
                    <span className="font-medium text-white">{props.id}</span>
                    {props.private ? <Lock className="size-4 text-violet-200" /> : null}
                </button>
            )}
        </Card>
    )
}
