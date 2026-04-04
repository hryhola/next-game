import { useI18n, useLobby } from 'client/context/list'
import { useClientRouter } from 'client/route/ClientRouter'
import { FormEventHandler, useEffect, useState } from 'react'
import { LoadingOverlay } from 'client/ui'
import type { LobbyData, LobbyMemberRole } from 'shared/contracts/app'
import { api } from 'client/network-utils/api'
import { Button, Input, Spinner } from 'client/ui/primitives'
import { cn } from 'client/ui/lib/cn'

interface Props {
    lobby: LobbyData
    className?: string
    onLoadingChange?: (isLoading: boolean) => void
}

export const LobbyPreview: React.FC<Props> = props => {
    const router = useClientRouter()
    const lobby = useLobby()
    const { t, tGameName, tMemberCount, translateErrorMessage } = useI18n()
    const onLoadingChange = props.onLoadingChange

    const [password, setPassword] = useState('')
    const [error, setError] = useState('')
    const [isLoading, setIsLoading] = useState(false)
    const [pendingRole, setPendingRole] = useState<LobbyMemberRole | null>(null)

    useEffect(() => {
        onLoadingChange?.(isLoading)

        return () => {
            onLoadingChange?.(false)
        }
    }, [isLoading, onLoadingChange])

    const handleSubmit: FormEventHandler<HTMLFormElement> = async event => {
        event.preventDefault()

        if (isLoading) {
            return
        }

        const role = (event.nativeEvent as SubmitEvent).submitter?.getAttribute('data-role')

        if (role !== 'player' && role !== 'spectator') {
            return setError(t('lobby.invalidRole'))
        }

        setError('')
        setPendingRole(role as LobbyMemberRole)
        setIsLoading(true)

        const [response, postError] = await api.post('lobby-join', {
            lobbyId: props.lobby.id,
            joinAs: role as LobbyMemberRole,
            password: password || undefined
        })

        if (!response) {
            setIsLoading(false)
            setPendingRole(null)
            return setError(translateErrorMessage(String(postError)))
        }

        if (!response.success) {
            setIsLoading(false)
            setPendingRole(null)
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
                        disabled={isLoading}
                        placeholder={t('lobbyPreview.password')}
                        name="password"
                        required
                        value={password}
                        onChange={e => setPassword(e.target.value.split('\\').pop()!)}
                    />
                )}
                <div className="mt-auto grid grid-cols-2 gap-3">
                    <Button variant="secondary" type="submit" data-role="player" disabled={isLoading}>
                        {isLoading && pendingRole === 'player' ? (
                            <>
                                <Spinner className="size-4 text-slate-100" />
                                <span>{t('lobby.joining')}</span>
                            </>
                        ) : (
                            t('common.play')
                        )}
                    </Button>
                    <Button variant="outline" type="submit" data-role="spectator" disabled={isLoading}>
                        {isLoading && pendingRole === 'spectator' ? (
                            <>
                                <Spinner className="size-4 text-slate-100" />
                                <span>{t('lobby.joining')}</span>
                            </>
                        ) : (
                            t('common.watch')
                        )}
                    </Button>
                </div>
            </form>
            <LoadingOverlay isLoading={isLoading} text={t('lobby.joining')} zIndex={60} />
        </>
    )
}
