import * as React from 'react'
import { useI18n, useLobby, useUser } from 'client/context/list'
import type { PlayerData } from 'shared/contracts/app'
import { ProfilePicture } from '../../profile-picture/ProfilePicture'
import { PlayerMenu } from './PlayerMenu'
import { Skeleton } from 'client/ui/primitives'
import { cn } from 'client/ui/lib/cn'

export type PlayerHighlightTone = 'blue' | 'cyan' | 'green' | 'red' | 'white'

type Props = {
    highlightTone?: PlayerHighlightTone
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
    const { t } = useI18n()
    const size = props.size || 'small'
    const isClickablePlayerHeader = !props.isLoading && user.userNickname !== props.player.userNickname && lobby.myRole === 'player'

    const sizes = {
        width: size === 'medium' ? 200 * 0.95 : 90,
        maxWidth: '30vw'
    }

    const withBox = (children: React.ReactNode) => (
        <div
            className={cn(
                size === 'medium' ? 'py-1 text-center' : 'rounded-[1.75rem] px-2 py-1 text-center',
                props.player?.userIsOnline === false && 'grayscale brightness-50',
                props.highlightTone && 'player-highlight',
                props.highlightTone === 'blue' && 'player-highlight-blue',
                props.highlightTone === 'cyan' && 'player-highlight-cyan',
                props.highlightTone === 'green' && 'player-highlight-green',
                props.highlightTone === 'red' && 'player-highlight-red',
                props.highlightTone === 'white' && 'player-highlight-white'
            )}
            data-highlight-tone={props.highlightTone}
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
                    <div className="cursor-pointer">
                        <ProfilePicture
                            size={sizes.width}
                            maxSize={sizes.maxWidth}
                            local={false}
                            url={props.player.userAvatarUrl}
                            color={props.player.userColor}
                            plain={size === 'medium'}
                        />
                    </div>
                </PlayerMenu>
            ) : (
                <ProfilePicture
                    size={sizes.width}
                    maxSize={sizes.maxWidth}
                    local={false}
                    url={props.player.userAvatarUrl}
                    color={props.player.userColor}
                    plain={size === 'medium'}
                />
            )}
            <div className="mt-2 block overflow-hidden truncate whitespace-nowrap text-lg font-semibold" style={{ color: props.player.userColor }}>
                {props.player.userNickname}
            </div>
            <div className="truncate text-sm text-slate-300">
                {props.subtitle === 'role' ? (props.player.playerIsMaster ? t('player.role.master') : t('player.role.player')) : props.player.playerScore}
            </div>
        </>
    )
}
