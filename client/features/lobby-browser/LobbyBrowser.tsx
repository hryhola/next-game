import { useEventHandler, useHome, useI18n, useRequestHandler, useWS } from 'client/context/list'
import { useEffect, useState } from 'react'
import type { LobbyBaseInfo } from 'shared/contracts/lobby'
import { Plus, Search } from 'lucide-react'
import { LobbyRecord } from './LobbyRecord'
import { Button, Input } from 'client/ui/primitives'

export const LobbyBrowser: React.FC = () => {
    const ws = useWS()
    const home = useHome()
    const { t } = useI18n()

    const [lobbiesList, setLobbiesList] = useState<LobbyBaseInfo[]>([])

    const [searchString, setSearchString] = useState('')

    useRequestHandler('Lobby-GetList', data => {
        setLobbiesList(data.lobbies)
    })

    useEventHandler('Lobby-ListUpdated', data => {
        setLobbiesList(data.lobbies)
    })

    useEffect(() => {
        if (ws.isConnected) {
            ws.send('Lobby-GetList')
            ws.send('Universal-Subscription', {
                mode: 'subscribe',
                scope: 'global',
                topic: 'Lobby-ListUpdated'
            })
        }
    }, [ws.isConnected])

    useEffect(() => {
        return () => {
            ws.send('Universal-Subscription', {
                mode: 'unsubscribe',
                scope: 'global',
                topic: 'Lobby-ListUpdated'
            })
        }
    }, [])

    const renderedLobbies = searchString.length ? lobbiesList.filter(lobby => lobby.id.toLowerCase().includes(searchString.toLowerCase())) : lobbiesList

    return (
        <div className="flex h-full flex-col gap-4">
            <div className="flex items-center gap-3">
                <Button
                    variant="ghost"
                    className="size-12 rounded-full border-0 bg-transparent p-0 text-violet-200 shadow-none hover:bg-white/6 lg:hidden"
                    aria-label={t('home.createLobby')}
                    onClick={() => home.setIsCreateLobbyOpen(true)}
                >
                    <Plus className="size-6 text-violet-200" strokeWidth={2.25} />
                </Button>
                <div className="relative flex-1">
                    <Search className="pointer-events-none absolute right-4 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                    <Input placeholder={t('common.search')} value={searchString} onChange={e => setSearchString(e.target.value)} className="pr-10" />
                </div>
            </div>
            <div className="flex flex-1 flex-col gap-3 overflow-y-auto">
                {renderedLobbies.map(lobby => (
                    <LobbyRecord key={lobby.id} {...lobby} />
                ))}
            </div>
        </div>
    )
}
