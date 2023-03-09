import { Menu, MenuItem } from '@mui/material'
import { useUser, useLobby, useWS } from 'client/context/list'
import { useGlobalModal } from 'client/features/global-modal/GlobalModal'
import { AbstractPlayerData } from 'state'
import { v4 } from 'uuid'
import { useGame } from './GameCtx'

type Props = {
    playerMenuAnchor: Element | null
    isPlayerMenuOpen: boolean
    handleClose: () => void
    player: AbstractPlayerData
}

export const PlayerMenu: React.FC<Props> = props => {
    const globalModal = useGlobalModal()
    const user = useUser()
    const lobby = useLobby()
    const ws = useWS()
    const game = useGame()

    const handleOptionClick = (event: React.MouseEvent<HTMLElement>) => {
        const option = event.currentTarget.id

        if (option === 'tip') {
            ws.send('Lobby-Tip', {
                id: v4(),
                lobbyId: lobby.lobbyId,
                from: user.nickname,
                to: props.player.nickname
            })
        }

        if (option === 'kick') {
            globalModal.confirm({
                content: `Want to kick ${props.player.nickname}?`,
                onConfirm: () => {
                    ws.send('Lobby-Kick', {
                        lobbyId: lobby.lobbyId,
                        memberNickname: props.player.nickname
                    })
                }
            })
        }
    }

    let options: string[][] = []

    if (props.player.nickname !== user.nickname) {
        options = [...options, ['tip', 'Tip']]
    }

    const isMasterView = game.players.some(p => p.nickname === user.nickname && p.isMaster)

    if (isMasterView) {
        options = [...options, ['set-score', 'Set score']]

        if (props.player.nickname !== user.nickname) {
            options = [...options, ['kick', 'Kick']]
        }
    }

    return (
        <>
            <Menu
                anchorEl={props.playerMenuAnchor}
                id="account-menu"
                open={props.isPlayerMenuOpen}
                onClose={props.handleClose}
                onClick={props.handleClose}
                PaperProps={{
                    elevation: 0,
                    sx: {
                        overflow: 'visible',
                        filter: 'drop-shadow(0px 2px 8px rgba(0,0,0,0.32))',
                        mt: 1.5,
                        '& .MuiAvatar-root': {
                            width: 32,
                            height: 32,
                            ml: -0.5,
                            mr: 1
                        },
                        '&:before': {
                            content: '""',
                            display: 'block',
                            position: 'absolute',
                            top: 0,
                            right: 14,
                            width: 10,
                            height: 10,
                            bgcolor: 'background.paper',
                            transform: 'translateY(-50%) rotate(45deg)',
                            zIndex: 0
                        }
                    }
                }}
                transformOrigin={{ horizontal: 'right', vertical: 'top' }}
                anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
            >
                {options.map(x => (
                    <MenuItem key={x[0]} id={x[0]} onClick={handleOptionClick}>
                        {x[1]}
                    </MenuItem>
                ))}
            </Menu>
        </>
    )
}
