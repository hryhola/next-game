import { DialogContentText, Menu, MenuItem, TextField } from '@mui/material'
import { useUser, useLobby, useWS } from 'client/context/list'
import { useGlobalModal } from 'client/features/global-modal/GlobalModal'
import { useRef } from 'react'
import { PlayerData } from 'state'
import { v4 } from 'uuid'
import { useGame } from './GameFactory'

type Props = {
    playerMenuAnchor: Element | null
    isPlayerMenuOpen: boolean
    handleClose: () => void
    player: PlayerData
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

        if (option === 'set-score') {
            globalModal.confirm({
                content: (
                    <>
                        <DialogContentText sx={{ pb: 2 }}>Set score for {props.player.nickname}</DialogContentText>
                        <TextField inputRef={scoreInputRef} label="Score value" type="number" />
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

    if (props.player.nickname !== user.nickname && lobby.myRole !== 'spectator') {
        options = [...options, ['tip', 'Tip']]
    }

    const isMasterView = game.players.some(p => p.nickname === user.nickname && p.isMaster)

    if (isMasterView) {
        if (props.player.nickname !== user.nickname) {
            options = [...options, ['kick', 'Kick']]
        }

        if (game.isSessionStarted) {
            options = [...options, ['set-score', 'Set score']]
        }
    }

    if (options.length === 0) return <></>

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
