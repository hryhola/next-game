import { useContext } from 'react'
import AppBar from '@mui/material/AppBar'
import Box from '@mui/material/Box'
import Toolbar from '@mui/material/Toolbar'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import IconButton from '@mui/material/IconButton'
import MenuIcon from '@mui/icons-material/Menu'
import { UserContext } from 'client/context/list/user.context'
import { ProfilePreview } from './ProfilePreview'
import { Container } from '@mui/material'
import { GetProps } from 'react-redux'
import { HomeContext } from 'client/context/list/home.context'

export const headerHeight = '84px'

export const Header: React.FC<GetProps<typeof AppBar>> = props => {
    const home = useContext(HomeContext)

    return (
        <AppBar position="static" sx={{ height: headerHeight }} {...props}>
            <Toolbar>
                <IconButton onClick={() => home.setIsNavigationOpen(true)} size="large" edge="start" color="inherit" aria-label="menu" sx={{ mr: 2 }}>
                    <MenuIcon />
                </IconButton>
                <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
                    Game Club
                </Typography>
                <ProfilePreview sx={{ marginY: 2 }} onClick={() => home.setIsProfileEditModalOpen(true)} />
            </Toolbar>
        </AppBar>
    )
}
