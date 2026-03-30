import * as React from 'react'
import { useLobby, useUser } from 'client/context/list'
import type { PlayerData } from 'shared/contracts/app'
import { ProfilePicture } from '../../profile-picture/ProfilePicture'
import { PlayerMenu } from './PlayerMenu'
import { Skeleton } from 'client/ui/primitives'
import { cn } from 'client/ui/lib/cn'

type Props = {
    isHighlighted?: boolean
    size?: 'medium' | 'small'
    subtitle?: 'score' | 'role'
} & (PlayerProps | LoadingData)

type PlayerProps = {
    player: PlayerData
    isLoading?: false
}

type LoadingData = {
    player?: PlayerData
    isLoading: true
}

export const Player: React.FC<Props> = props => {
    const user = useUser()
    const lobby = useLobby()
    const size = props.size || 'small'

    const sizes = {
        width: size === 'medium' ? 200 * 0.95 : 90,
        maxWidth: '30vw'
    }

    const withBox = (children: React.ReactNode) => (
        <div
            className={cn(
                'rounded-[1.75rem] px-2 py-1 text-center',
                props.player?.userIsOnline === false && 'grayscale brightness-50',
                props.isHighlighted && 'bg-gradient-to-t from-cyan-300/25 to-transparent'
            )}
            style={{ width: sizes.width, maxWidth: sizes.maxWidth }}
        >
            {children}
        </div>
    )

    if (props.isLoading) {
        return withBox(
            <>
                <Skeleton style={{ ...sizes, maxHeight: sizes.maxWidth, height: sizes.width * 0.95 }} />
                <Skeleton className="my-2" style={{ ...sizes, height: sizes.width * 0.14 }} />
                <Skeleton style={{ ...sizes, height: sizes.width * 0.1 }} />
            </>
        )
    }

    return withBox(
        <>
            {user.userNickname !== props.player.userNickname && lobby.myRole === 'player' ? (
                <PlayerMenu player={props.player}>
                    <div>
                        <ProfilePicture
                            size={sizes.width}
                            maxSize={sizes.maxWidth}
                            local={false}
                            url={props.player.userAvatarUrl}
                            color={props.player.userColor}
                        />
                    </div>
                </PlayerMenu>
            ) : (
                <ProfilePicture size={sizes.width} maxSize={sizes.maxWidth} local={false} url={props.player.userAvatarUrl} color={props.player.userColor} />
            )}
            <div className="mt-2 block overflow-auto truncate text-lg font-semibold" style={{ color: props.player.userColor }}>
                {props.player.userNickname}
            </div>
            <div className="truncate text-sm text-slate-300">
                {props.subtitle === 'role' ? (props.player.playerIsMaster ? 'Master' : 'Player') : props.player.playerScore}
            </div>
        </>
    )
}
