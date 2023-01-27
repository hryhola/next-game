import { useContext } from 'react'
import AppBar, { AppBarProps } from '@mui/material/AppBar'
import Toolbar from '@mui/material/Toolbar'
import Typography from '@mui/material/Typography'
import IconButton from '@mui/material/IconButton'
import MenuIcon from '@mui/icons-material/Menu'
import { ProfilePreview } from './ProfilePreview'
import { HomeContext } from 'client/context/list/home'

export const headerHeight = '84px'

export const Header: React.FC<AppBarProps> = props => {
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
                <ProfilePreview sx={{ marginY: 2 }} onClick={() => home.setIsProfileEditOpen(true)} />
            </Toolbar>
        </AppBar>
    )
}
