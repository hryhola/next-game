import { FormControl, IconButton, InputAdornment, List, Toolbar } from '@mui/material'
import { useHome, useWS, useWSHandler } from 'client/context/list'
import { useEffect, useState } from 'react'
import { LobbyBaseInfo } from 'uWebSockets/ws/Lobby-GetList'
import { RequestHandler } from 'uWebSockets/uws.types'
import AddIcon from '@mui/icons-material/Add'
import { OutlinedInput } from '@mui/material'
import SearchIcon from '@mui/icons-material/Search'
import { LobbyRecord } from './LobbyRecord'

export const LobbyBrowser: React.FC = () => {
    const ws = useWS()
    const home = useHome()

    const [lobbiesList, setLobbiesList] = useState<LobbyBaseInfo[]>([])

    const [searchString, setSearchString] = useState('')

    const getListHandler: RequestHandler<'Lobby-GetList'> = data => {
        setLobbiesList(data.lobbies)
    }

    useWSHandler('Lobby-GetList', getListHandler)

    useEffect(() => {
        if (ws.isConnected) {
            ws.send('Lobby-GetList')
        }
    }, [ws.isConnected])

    const renderedLobbies = searchString.length ? lobbiesList.filter(lobby => lobby.id.toLowerCase().includes(searchString.toLowerCase())) : lobbiesList

    return (
        <>
            <Toolbar sx={{ pt: 2 }}>
                <IconButton size="large" edge="start" color="inherit" aria-label="menu" onClick={() => home.setIsCreateLobbyOpen(true)}>
                    <AddIcon />
                </IconButton>
                <FormControl fullWidth variant="filled">
                    <OutlinedInput
                        size="small"
                        fullWidth
                        placeholder="Search..."
                        value={searchString}
                        onChange={e => setSearchString(e.target.value)}
                        endAdornment={
                            <InputAdornment position="end">
                                <SearchIcon />
                            </InputAdornment>
                        }
                    />
                </FormControl>
            </Toolbar>
            <List>
                {renderedLobbies.map(lobby => (
                    <LobbyRecord key={lobby.id} {...lobby} />
                ))}
            </List>
        </>
    )
}
