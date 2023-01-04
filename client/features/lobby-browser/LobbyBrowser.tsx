import { Box, IconButton, Toolbar } from '@mui/material'
import { WSContext } from 'client/context/list/ws.context'
import { useContext, useEffect, useState } from 'react'
import { LobbyInfo } from 'uws/api/Lobby-GetList'
import { RequestData, RequestHandler } from 'uws/uws.types'
import AddIcon from '@mui/icons-material/Add'
import { styled, alpha } from '@mui/material/styles'
import InputBase from '@mui/material/InputBase'
import SearchIcon from '@mui/icons-material/Search'

const Search = styled('div')(({ theme }) => ({
    position: 'relative',
    borderRadius: theme.shape.borderRadius,
    backgroundColor: alpha(theme.palette.common.white, 0.15),
    '&:hover': {
        backgroundColor: alpha(theme.palette.common.white, 0.25)
    },
    marginRight: theme.spacing(2),
    marginLeft: 0,
    width: '100%'
    // [theme.breakpoints.up('sm')]: {
    //     marginLeft: theme.spacing(3),
    //     width: 'auto',
    // },
}))

const SearchIconWrapper = styled('div')(({ theme }) => ({
    padding: theme.spacing(0, 2),
    height: '100%',
    position: 'absolute',
    pointerEvents: 'none',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
}))

const StyledInputBase = styled(InputBase)(({ theme }) => ({
    color: 'inherit',
    '& .MuiInputBase-input': {
        padding: theme.spacing(1, 1, 1, 0),
        // vertical padding + font size from searchIcon
        paddingLeft: `calc(1em + ${theme.spacing(4)})`,
        transition: theme.transitions.create('width'),
        width: '100%',
        [theme.breakpoints.up('md')]: {
            width: '20ch'
        }
    }
}))

const LobbyRecord: React.FC<LobbyInfo> = props => (
    <li>
        {props.id}
        {props.private ? <button>Enter password</button> : <button>Join</button>}
    </li>
)

export const LobbyBrowser: React.FC = () => {
    const ws = useContext(WSContext)

    const [lobbiesList, setLobbiesList] = useState<LobbyInfo[]>([])

    const getListHandler: RequestHandler<'Lobby-GetList'> = data => {
        setLobbiesList(data.lobbies)
    }

    useEffect(() => {
        ws.on('Lobby-GetList', getListHandler)
        ws.send('Lobby-GetList')
    }, [])

    return (
        <>
            <Toolbar>
                <IconButton size="large" edge="start" color="inherit" aria-label="menu" sx={{ mr: 2 }}>
                    <AddIcon />
                </IconButton>
                <Search>
                    <SearchIconWrapper>
                        <SearchIcon />
                    </SearchIconWrapper>
                    <StyledInputBase placeholder="Search…" inputProps={{ 'aria-label': 'search' }} />
                </Search>
            </Toolbar>
            <ul>{lobbiesList.map(LobbyRecord)}</ul>
        </>
    )
}
