import { useEffect, useRef } from 'react'
import { PlayerData } from 'state'
import { Player } from './Player'

interface HeaderProps {
    members: PlayerData[]
    highlightedPlayedIds?: string[]
    isLoading: boolean
    masterLabel?: 'role' | 'score'
}

export const PlayersHeader: React.FC<HeaderProps> = props => {
    const boxRef = useRef<HTMLElement | null>(null)

    function setPlayersHeaderHeight() {
        const header = document.getElementById('players-header')

        if (!header) return

        document.documentElement.style.setProperty('--playersHeaderHeight', header.offsetHeight + 'px')
    }

    useEffect(() => {
        setPlayersHeaderHeight()

        addEventListener('resize', setPlayersHeaderHeight)
        addEventListener('orientationchange', setPlayersHeaderHeight)
    }, [])

    useEffect(() => {
        setPlayersHeaderHeight()
    }, [props.isLoading, props.members.length])

    return (
        <div className="fixed left-0 right-0 z-20 flex justify-center bg-gradient-to-b from-[#000024] to-transparent" id="players-header" ref={boxRef as never}>
            <div className="flex w-auto flex-nowrap overflow-auto">
                {props.isLoading ? (
                    <div>
                        <Player isLoading size="medium" />
                    </div>
                ) : (
                    props.members
                        .sort((a, b) => a.memberPosition - b.memberPosition)
                        .map(p => (
                            <div key={p.id}>
                                <Player
                                    player={p}
                                    isHighlighted={props.highlightedPlayedIds?.includes(p.id)}
                                    size="medium"
                                    subtitle={p.playerIsMaster ? props.masterLabel : 'score'}
                                />
                            </div>
                        ))
                )}
            </div>
        </div>
    )
}
