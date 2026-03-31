import { useEffect, useRef } from 'react'
import type { PlayerData } from 'shared/contracts/app'
import { Player } from './Player'

interface HeaderProps {
    members: PlayerData[]
    highlightedPlayedIds?: string[]
    isLoading: boolean
    masterLabel?: 'role' | 'score'
}

export const PlayersHeader: React.FC<HeaderProps> = props => {
    const boxRef = useRef<HTMLDivElement | null>(null)

    function setPlayersHeaderHeight() {
        const header = boxRef.current

        if (!header) return

        document.documentElement.style.setProperty('--playersHeaderHeight', `${Math.ceil(header.getBoundingClientRect().height)}px`)
    }

    useEffect(() => {
        setPlayersHeaderHeight()

        const header = boxRef.current
        const resizeObserver = typeof ResizeObserver !== 'undefined' && header ? new ResizeObserver(() => setPlayersHeaderHeight()) : null

        if (header && resizeObserver) {
            resizeObserver.observe(header)
        }

        addEventListener('resize', setPlayersHeaderHeight)
        addEventListener('orientationchange', setPlayersHeaderHeight)

        return () => {
            removeEventListener('resize', setPlayersHeaderHeight)
            removeEventListener('orientationchange', setPlayersHeaderHeight)
            resizeObserver?.disconnect()
        }
    }, [])

    useEffect(() => {
        setPlayersHeaderHeight()
    }, [props.isLoading, props.members.length])

    return (
        <div
            className="pointer-events-none fixed left-0 right-0 z-20 flex justify-center bg-gradient-to-b from-[#000024] to-transparent"
            id="players-header"
            ref={boxRef}
        >
            <div className="pointer-events-none flex max-w-full flex-nowrap overflow-x-auto overflow-y-hidden">
                {props.isLoading ? (
                    <div className="pointer-events-auto">
                        <Player isLoading size="medium" />
                    </div>
                ) : (
                    props.members
                        .sort((a, b) => a.memberPosition - b.memberPosition)
                        .map(p => (
                            <div key={p.id} className="pointer-events-auto">
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
