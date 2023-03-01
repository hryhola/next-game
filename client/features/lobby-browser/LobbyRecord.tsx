import { Button, ListItem, ListItemButton, ListItemText, Theme } from '@mui/material'
import { LobbyBaseInfo } from 'uWebSockets/ws/Lobby-GetList'
import LockIcon from '@mui/icons-material/Lock'
import { LobbyPreview } from './LobbyPreview'
import { MouseEventHandler, useState } from 'react'
import { LobbyData } from 'state'
import { useRequestHandler, useWS } from 'client/context/list'
import ArrowDropUpIcon from '@mui/icons-material/ArrowDropUp'

export const LobbyRecord: React.FC<LobbyBaseInfo> = props => {
    const ws = useWS()

    const [lobbyInfo, setLobbyInfo] = useState<LobbyData | null>(null)

    useRequestHandler('Lobby-GetPublicInfo', data => {
        if (!data.success) {
            return console.log(data.message)
        }

        if (props.id === data.lobbyData.id) {
            setLobbyInfo(data.lobbyData)
        }
    })

    const handleClick: MouseEventHandler<HTMLDivElement> = e => {
        if (lobbyInfo) {
            e.preventDefault()
        } else {
            ws.send('Lobby-GetPublicInfo', {
                id: props.id
            })
        }
    }

    return (
        <ListItem disablePadding>
            {lobbyInfo ? (
                <>
                    <ListItemText
                        sx={(theme: Theme) => ({
                            pt: 0,
                            mt: 0,
                            ':hover': {
                                backgroundColor: theme.palette.grey[900]
                            }
                        })}
                    >
                        <Button sx={{ borderRadius: 0 }} onClick={() => setLobbyInfo(null)} fullWidth>
                            <ArrowDropUpIcon />
                        </Button>
                        <LobbyPreview sx={{ p: 2 }} lobby={lobbyInfo!} />
                    </ListItemText>
                </>
            ) : (
                <ListItemButton onClick={handleClick}>
                    <ListItemText>{props.id}</ListItemText>
                    {props.private && <LockIcon />}
                </ListItemButton>
            )}
        </ListItem>
    )
}
