import { FormEventHandler, useContext, useState, useRef, useEffect } from 'react'
import { useLobby } from 'client/context/list'
import { useClientRouter } from 'client/route/ClientRouter'
import { LoadingOverlay } from 'client/ui'
import { api } from 'client/network-utils/api'
import { HomeContext } from 'client/context/list/homeCtx'
import type { GameName, InitialGameDataSchema } from 'shared/contracts/app'
import { Button, Input, Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, VisuallyHidden } from 'client/ui/primitives'

export const LobbyCreator: React.FC = () => {
    const home = useContext(HomeContext)
    const router = useClientRouter()
    const lobby = useLobby()

    const formRef = useRef<HTMLFormElement | null>(null)

    const [lobbyId, setLobbyId] = useState('')
    const [password, setPassword] = useState('')
    const [error, setError] = useState('')
    const [gameName, setGameName] = useState<GameName>('Clicker')
    const [isLoading, setIsLoading] = useState(false)
    const [initialDataScheme, setInitialDataScheme] = useState<InitialGameDataSchema>([])

    const handleSubmit: FormEventHandler<HTMLFormElement> = async event => {
        event.preventDefault()

        const data = new FormData(formRef.current!)

        setIsLoading(true)

        const [response, postError] = await api.post('lobby-create', data).finally(() => setIsLoading(false))

        if (!response) {
            return setError(String(postError))
        }

        if (!response.success) {
            setError(response.message)

            return
        }

        lobby.setLobbyId(lobbyId)
        lobby.setGameName(gameName)

        home.setIsCreateLobbyOpen(false)

        router.setFrame('Lobby')
    }

    useEffect(() => {
        let isCancelled = false

        const loadGameSchema = async () => {
            const [response, postError] = await api.post('game-get-schema', { gameName })

            if (isCancelled) {
                return
            }

            if (!response) {
                setError(String(postError))
                return
            }

            if (!response.success) {
                setError(response.message)
                return
            }

            setError('')
            setInitialDataScheme(response.initialDataScheme || [])
        }

        void loadGameSchema()

        return () => {
            isCancelled = true
        }
    }, [gameName])

    return (
        <>
            <form className="flex h-full flex-col gap-4" onSubmit={handleSubmit} ref={formRef}>
                {error ? <div className="rounded-2xl border border-rose-300/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">{error}</div> : null}
                <Input required placeholder="Lobby name" name="lobbyId" value={lobbyId} onChange={e => setLobbyId(e.target.value)} />
                <div>
                    <VisuallyHidden asChild>
                        <Label htmlFor="game-type-selector">Game</Label>
                    </VisuallyHidden>
                    <Select value={gameName} onValueChange={value => setGameName(value as GameName)}>
                        <SelectTrigger id="game-type-selector">
                            <SelectValue placeholder="Select a game" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="TicTacToe">Tic Tac Toe</SelectItem>
                            <SelectItem value="Clicker">Clicker</SelectItem>
                            <SelectItem value="Jeopardy">Jeopardy</SelectItem>
                        </SelectContent>
                    </Select>
                    <input type="hidden" name="gameName" value={gameName} />
                </div>

                {initialDataScheme.map(field => (
                    <div key={field.name} className="space-y-2">
                        {field.type === 'field' && <Input placeholder={field.label} name={'initialData-' + field.name} required={field.required} />}
                        {field.type === 'file' && (
                            <div className="space-y-2">
                                <Label>{field.label}</Label>
                                <input
                                    className="glass-input block w-full rounded-2xl px-4 py-3 text-sm"
                                    required={field.required}
                                    multiple={false}
                                    accept={field.accept.join(',')}
                                    name={'initialData-' + field.name}
                                    type="file"
                                />
                            </div>
                        )}
                    </div>
                ))}

                <Input placeholder="Password" name="password" value={password} onChange={e => setPassword(e.target.value.split('\\').pop()!)} />
                <div className="mt-auto pb-2">
                    <Button className="w-full" type="submit" size="lg">
                        Create
                    </Button>
                </div>
            </form>
            <LoadingOverlay isLoading={isLoading} />
        </>
    )
}
