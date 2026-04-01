import { useI18n, useLobby } from 'client/context/list'
import { useClientRouter } from 'client/route/ClientRouter'
import { FormEventHandler, useState } from 'react'
import { LoadingOverlay } from 'client/ui'
import type { LobbyData, LobbyMemberRole } from 'shared/contracts/app'
import { api } from 'client/network-utils/api'
import { Button, Input } from 'client/ui/primitives'
import { cn } from 'client/ui/lib/cn'

interface Props {
    lobby: LobbyData
    className?: string
}

export const LobbyPreview: React.FC<Props> = props => {
    const router = useClientRouter()
    const lobby = useLobby()
    const { t, tGameName, tMemberCount, translateErrorMessage } = useI18n()

    const [password, setPassword] = useState('')
    const [error, setError] = useState('')
    const [isLoading, setIsLoading] = useState(false)

    const handleSubmit: FormEventHandler<HTMLFormElement> = async event => {
        event.preventDefault()

        const role = (event.nativeEvent as SubmitEvent).submitter?.getAttribute('data-role')

        if (role !== 'player' && role !== 'spectator') {
            return setError(t('lobby.invalidRole'))
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
            return setError(translateErrorMessage(String(postError)))
        }

        if (!response.success) {
            return setError(translateErrorMessage(response.message))
        }

        lobby.setGameName(props.lobby.gameName)
        lobby.setLobbyId(props.lobby.id)
        router.setFrame('Lobby')
    }

    return (
        <>
            <form className={cn('flex h-full flex-col gap-4', props.className)} onSubmit={handleSubmit}>
                {error ? (
                    <div className="rounded-2xl border border-rose-300/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">{translateErrorMessage(error)}</div>
                ) : null}
                <div className="flex items-center justify-between gap-4 text-sm">
                    <span className="font-semibold text-white">{props.lobby.id}</span>
                    <span className="text-violet-200">{tMemberCount(props.lobby.members.length)}</span>
                </div>
                <div className="flex items-center justify-between gap-4 text-xs uppercase tracking-[0.3em] text-slate-400">
                    <span>{tGameName(props.lobby.gameName)}</span>
                    <span>{t('lobby.byCreator', { name: props.lobby.creator.userNickname })}</span>
                </div>
                {props.lobby.private && (
                    <Input
                        placeholder={t('lobbyPreview.password')}
                        name="password"
                        required
                        value={password}
                        onChange={e => setPassword(e.target.value.split('\\').pop()!)}
                    />
                )}
                <div className="mt-auto grid grid-cols-2 gap-3">
                    <Button variant="secondary" type="submit" data-role="player">
                        {t('common.play')}
                    </Button>
                    <Button variant="outline" type="submit" data-role="spectator">
                        {t('common.watch')}
                    </Button>
                </div>
            </form>
            <LoadingOverlay isLoading={isLoading} />
        </>
    )
}
