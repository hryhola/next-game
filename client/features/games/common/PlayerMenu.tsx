import { PersonAdd, Settings, Logout } from '@mui/icons-material'
import { Menu, MenuItem, Avatar, Divider, ListItemIcon } from '@mui/material'
import { LobbyContext } from 'client/context/list/lobby'
import { UserContext } from 'client/context/list/user'
import { WSContext } from 'client/context/list/ws'
import { useContext } from 'react'
import { AbstractPlayerData } from 'state'
import { ClickerContext } from '../clicker/ClickerGame'

type Props = {
    playerMenuAnchor: Element | null
    isPlayerMenuOpen: boolean
    handleClose: () => void
    player: AbstractPlayerData
}

export const PlayerMenu: React.FC<Props> = props => {
    const user = useContext(UserContext)
    const lobby = useContext(LobbyContext)
    const game = useContext(ClickerContext)
    const ws = useContext(WSContext)

    const handleOptionClick = (event: React.MouseEvent<HTMLElement>) => {
        const option = event.currentTarget.id

        if (option === 'tip') {
            ws.send('Lobby-Tip', {
                lobbyId: lobby.lobbyId,
                from: user.nickname,
                to: props.player.nickname
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
