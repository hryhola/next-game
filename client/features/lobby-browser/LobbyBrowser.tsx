import { Box, FormControl, IconButton, InputAdornment, List, ListItem, ListItemButton, ListItemIcon, ListItemText, TextField, Toolbar } from '@mui/material'
import { WSContext } from 'client/context/list/ws'
import { useContext, useEffect, useState } from 'react'
import { LobbyBaseInfo } from 'uWebSockets/ws/Lobby-GetList'
import { RequestData, RequestHandler } from 'uWebSockets/uws.types'
import AddIcon from '@mui/icons-material/Add'
import { styled, alpha } from '@mui/material/styles'
import { Input, OutlinedInput } from '@mui/material'
import InputBase from '@mui/material/InputBase'
import SearchIcon from '@mui/icons-material/Search'
import LockIcon from '@mui/icons-material/Lock'
import { HomeContext } from 'client/context/list/home'
import { LobbyRecord } from './LobbyRecord'

export const LobbyBrowser: React.FC = () => {
    const ws = useContext(WSContext)
    const home = useContext(HomeContext)

    const [lobbiesList, setLobbiesList] = useState<LobbyBaseInfo[]>([])

    const [searchString, setSearchString] = useState('')

    const getListHandler: RequestHandler<'Lobby-GetList'> = data => {
        setLobbiesList(data.lobbies)
    }

    useEffect(() => {
        ws.on('Lobby-GetList', getListHandler)
    }, [])

    useEffect(() => {
        if (ws.isConnected) {
            ws.send('Lobby-GetList')
        }
    }, [ws.isConnected])

    const renderedLobbies = searchString.length ? lobbiesList.filter(lobby => lobby.id.toLowerCase().includes(searchString.toLowerCase())) : lobbiesList

    return (
        <>
            <Toolbar>
                <IconButton size="large" edge="start" color="inherit" aria-label="menu" sx={{ mr: 2 }} onClick={() => home.setIsCreateLobbyOpen(true)}>
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
