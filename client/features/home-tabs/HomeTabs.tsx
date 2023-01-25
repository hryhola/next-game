import * as React from 'react'
import SwipeableViews from 'react-swipeable-views'
import { SxProps, Theme, useTheme } from '@mui/material/styles'
import AppBar from '@mui/material/AppBar'
import Tabs from '@mui/material/Tabs'
import Tab from '@mui/material/Tab'
import Typography from '@mui/material/Typography'
import Box from '@mui/material/Box'
import { LobbyBrowser } from '../lobby-browser/LobbyBrowser'
import { Chat } from '../chat/Chat'
import { GetProps } from 'react-redux'
import { headerHeight } from '../header/Header'
import { chatInputHeight } from 'client/ui'
import ListItemText from '@mui/material/ListItemText'
import { CircularProgress, List, ListItem } from '@mui/material'
import { GlobalUsersList } from '../global-users-list/GlobalUsersList'
import { GlobalUsersListTitle } from '../global-users-list/GlobalUsersListTitle'

interface TabPanelProps {
    children?: React.ReactNode
    dir?: string
    index: number
    value: number
    sx?: SxProps<Theme>
}

function TabPanel(props: TabPanelProps) {
    const { children, value, index, ...other } = props

    return (
        <Box role="tabpanel" hidden={value !== index} id={`full-width-tabpanel-${index}`} aria-labelledby={`full-width-tab-${index}`} {...other}>
            {value === index && children}
        </Box>
    )
}

function a11yProps(index: number) {
    return {
        id: `home-tab-${index}`,
        'aria-controls': `home-tabpanel-${index}`
    }
}

export const tabsHeaderHeight = '48px'

export const HomeTabs: React.FC<GetProps<typeof Box>> = props => {
    const theme = useTheme()
    const [value, setValue] = React.useState(0)

    const handleChange = (event: React.SyntheticEvent, newValue: number) => {
        setValue(newValue)
    }

    const handleChangeIndex = (index: number) => {
        setValue(index)
    }

    const sx: SxProps<Theme> = {
        bgcolor: 'background.paper',
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        ...(props.sx || {})
    }

    const headersHeight = `(${tabsHeaderHeight} + ${headerHeight})`

    return (
        <Box {...props} sx={sx}>
            <AppBar sx={{ height: tabsHeaderHeight }} position="static">
                <Tabs value={value} onChange={handleChange} indicatorColor="primary" textColor="inherit" variant="fullWidth" aria-label="Home page navigation">
                    <Tab label="Lobbies" {...a11yProps(0)} />
                    <Tab label="chat" {...a11yProps(1)} />
                    <Tab label={<GlobalUsersListTitle />} {...a11yProps(2)} />
                </Tabs>
            </AppBar>
            <SwipeableViews
                id="home-tab-swipe-container"
                style={{ flexGrow: 1 }}
                axis={theme.direction === 'rtl' ? 'x-reverse' : 'x'}
                index={value}
                onChangeIndex={handleChangeIndex}
            >
                <TabPanel sx={{ height: `calc(100vh - ${headersHeight})` }} value={value} index={0} dir={theme.direction}>
                    <LobbyBrowser />
                </TabPanel>
                <TabPanel sx={{ height: `calc(100vh - ${headersHeight})` }} value={value} index={1} dir={theme.direction}>
                    <Chat scope="global" messagesWrapperBoxSx={{ height: `calc(100vh - ${headersHeight} - ${chatInputHeight})` }} />
                </TabPanel>
                <TabPanel sx={{ height: `calc(100vh - ${headersHeight})` }} value={value} index={2} dir={theme.direction}>
                    <GlobalUsersList />
                </TabPanel>
            </SwipeableViews>
        </Box>
    )
}
