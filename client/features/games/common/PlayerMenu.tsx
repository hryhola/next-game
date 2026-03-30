import { useUser, useLobby, useWS } from 'client/context/list'
import { useGlobalModal } from 'client/features/global-modal/GlobalModal'
import { useRef } from 'react'
import type { PlayerData } from 'shared/contracts/app'
import { v4 } from 'uuid'
import { useGame } from './GameFactory'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from 'client/ui/primitives'

type Props = {
    player: PlayerData
    children: React.ReactNode
}

export const PlayerMenu: React.FC<Props> = props => {
    const globalModal = useGlobalModal()
    const user = useUser()
    const lobby = useLobby()
    const ws = useWS()
    const game = useGame()

    const scoreInputRef = useRef<HTMLInputElement | null>(null)

    const handleOptionClick = (event: React.MouseEvent<HTMLElement>) => {
        const option = event.currentTarget.id

        if (option === 'tip') {
            ws.send('Lobby-Tip', {
                id: v4(),
                lobbyId: lobby.lobbyId,
                from: user.userNickname,
                to: props.player.userNickname
            })
        }

        if (option === 'kick') {
            globalModal.confirm({
                title: 'Kick player',
                content: `Want to kick ${props.player.userNickname}?`,
                onConfirm: () => {
                    ws.send('Lobby-Kick', {
                        lobbyId: lobby.lobbyId,
                        userId: props.player.id
                    })
                }
            })
        }

        if (option === 'set-score') {
            globalModal.confirm({
                title: 'Set score',
                content: (
                    <>
                        <div className="space-y-3">
                            <p className="text-sm text-slate-300">Set score for {props.player.userNickname}</p>
                            <input
                                ref={scoreInputRef}
                                inputMode="numeric"
                                type="number"
                                placeholder="Score value"
                                className="glass-input glass-focus h-12 w-full rounded-2xl px-4 text-sm text-slate-100 placeholder:text-slate-400"
                            />
                        </div>
                    </>
                ),
                onConfirm: () => {
                    if (!scoreInputRef.current) {
                        alert('Cannot find score input element!')
                        return
                    }

                    ws.send('Game-SendAction', {
                        lobbyId: lobby.lobbyId,
                        actionName: '$SetScore',
                        actionPayload: {
                            score: scoreInputRef.current.value,
                            playerID: props.player.id
                        }
                    })

                    scoreInputRef.current.value = ''
                }
            })
        }
    }

    let options: string[][] = []

    if (props.player.userNickname !== user.userNickname && lobby.myRole !== 'spectator') {
        options = [...options, ['tip', 'Tip']]
    }

    const isMasterView = game.players.some(p => p.id === user.id && p.playerIsMaster)

    if (isMasterView) {
        if (props.player.userNickname !== user.userNickname) {
            options = [...options, ['kick', 'Kick']]
        }

        if (game.isSessionStarted) {
            options = [...options, ['set-score', 'Set score']]
        }
    }

    if (options.length === 0) return <></>

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>{props.children}</DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                {options.map(x => (
                    <DropdownMenuItem key={x[0]} id={x[0]} onClick={handleOptionClick}>
                        {x[1]}
                    </DropdownMenuItem>
                ))}
            </DropdownMenuContent>
        </DropdownMenu>
    )
}
