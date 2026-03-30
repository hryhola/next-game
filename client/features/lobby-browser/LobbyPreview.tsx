import { useLobby } from 'client/context/list'
import { useClientRouter } from 'client/route/ClientRouter'
import { FormEventHandler, useState } from 'react'
import { LoadingOverlay } from 'client/ui'
import type { LobbyData, LobbyMemberRole } from 'shared/contracts/app'
import { api } from 'client/network-utils/api'
import { Button, Card, CardContent, Input } from 'client/ui/primitives'
import { cn } from 'client/ui/lib/cn'

interface Props {
    lobby: LobbyData
    className?: string
}

export const LobbyPreview: React.FC<Props> = props => {
    const router = useClientRouter()
    const lobby = useLobby()

    const [password, setPassword] = useState('')
    const [error, setError] = useState('')
    const [isLoading, setIsLoading] = useState(false)

    const handleSubmit: FormEventHandler<HTMLFormElement> = async event => {
        event.preventDefault()

        const role = (event.nativeEvent as SubmitEvent).submitter?.getAttribute('data-role')

        if (role !== 'player' && role !== 'spectator') {
            return setError('Invalid role')
        }

        setIsLoading(true)

        const [response, postError] = await api
            .post('lobby-join', {
                lobbyId: props.lobby.id,
                joinAs: role as LobbyMemberRole,
                password: password || undefined
            })
            .finally(() => setIsLoading(false))

        if (!response) {
            return setError(String(postError))
        }

        if (!response.success) {
            return setError(response.message)
        }

        lobby.setGameName(props.lobby.gameName)
        lobby.setLobbyId(props.lobby.id)
        router.setFrame('Lobby')
    }

    return (
        <>
            <Card className={cn('w-full', props.className)}>
                <CardContent>
                    <form className="flex h-full flex-col gap-4" onSubmit={handleSubmit}>
                        {error ? <div className="rounded-2xl border border-rose-300/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">{error}</div> : null}
                        <div className="flex items-center justify-between gap-4 text-sm">
                            <span className="font-semibold text-white">{props.lobby.id}</span>
                            <span className="text-violet-200">
                                {props.lobby.members.length} {props.lobby.members.length === 1 ? 'member' : 'members'}
                            </span>
                        </div>
                        <div className="flex items-center justify-between gap-4 text-xs uppercase tracking-[0.3em] text-slate-400">
                            <span>{props.lobby.gameName}</span>
                            <span>by {props.lobby.creator.userNickname}</span>
                        </div>
                        {props.lobby.private && (
                            <Input
                                placeholder="Password"
                                name="password"
                                required
                                value={password}
                                onChange={e => setPassword(e.target.value.split('\\').pop()!)}
                            />
                        )}
                        <div className="mt-auto grid grid-cols-2 gap-3">
                            <Button variant="secondary" type="submit" data-role="player">
                                Play
                            </Button>
                            <Button variant="outline" type="submit" data-role="spectator">
                                Watch
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>
            <LoadingOverlay isLoading={isLoading} />
        </>
    )
}
