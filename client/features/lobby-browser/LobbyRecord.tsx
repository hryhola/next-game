import { Alert, Button, ListItem, ListItemButton, ListItemText, Theme } from '@mui/material'
import { LobbyBaseInfo } from 'uWebSockets/ws/Lobby-GetList'
import LockIcon from '@mui/icons-material/Lock'
import { LobbyPreview } from './LobbyPreview'
import { MouseEventHandler, useContext, useEffect, useState } from 'react'
import { LobbyData } from 'state'
import { RequestHandler } from 'uWebSockets/uws.types'
import { WSContext } from 'client/context/list/ws'
import ArrowDropUpIcon from '@mui/icons-material/ArrowDropUp'

export const LobbyRecord: React.FC<LobbyBaseInfo> = props => {
    const ws = useContext(WSContext)

    const [lobbyInfo, setLobbyInfo] = useState<LobbyData | null>(null)

    const handleLoadInfo: RequestHandler<'Lobby-GetPublicInfo'> = data => {
        if (!data.success) {
            return console.log(data.message)
        }

        if (props.id === data.lobbyData.id) {
            setLobbyInfo(data.lobbyData)
        }
    }

    const sendGetRequest = () => {
        ws.send('Lobby-GetPublicInfo', {
            id: props.id
        })
    }

    const handleClick: MouseEventHandler<HTMLDivElement> = e => {
        if (lobbyInfo) {
            e.preventDefault()
        } else {
            sendGetRequest()
        }
    }

    useEffect(() => {
        ws.on('Lobby-GetPublicInfo', handleLoadInfo)
    }, [])

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
