import * as React from 'react'
import { SxProps, Theme, useTheme } from '@mui/material/styles'
import AppBar from '@mui/material/AppBar'
import Tabs from '@mui/material/Tabs'
import Tab from '@mui/material/Tab'
import Box from '@mui/material/Box'
import ArrowDropUpIcon from '@mui/icons-material/ArrowDropUp'
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown'
import CloseIcon from '@mui/icons-material/Close'
import { IconButton, Toolbar } from '@mui/material'
import { useState } from 'react'

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

type Props = {
    views: { view: (fullscreen: boolean) => JSX.Element; header: string | JSX.Element; onFullscreen?: (value: boolean) => void }[]
    label: string
}

export const overlayedTabsToolbarHeight = '48px'

const OverlayedTabs: React.FC<Props> = props => {
    const theme = useTheme()
    const [value, setValue] = useState<number | false>(false)
    const [fullscreen, setFullscreen] = useState(false)

    const handleChange = (event: React.SyntheticEvent, newValue: number) => {
        setValue(newValue)
    }

    const handleFullscreen = () => {
        if (value !== false) {
            const cb = props.views[value]?.onFullscreen

            cb && cb(!fullscreen)
        }

        setFullscreen(!fullscreen)
    }

    const barMargin = value === false ? '0' : fullscreen ? `calc(var(--fullHeight) - ${overlayedTabsToolbarHeight})` : '50vh'

    return (
        <Box>
            <AppBar sx={{ bottom: barMargin, top: 'auto', display: 'flex' }} position="fixed">
                <Toolbar sx={{ p: 0 }} variant="dense">
                    {value !== false && <IconButton onClick={handleFullscreen}>{fullscreen ? <ArrowDropDownIcon /> : <ArrowDropUpIcon />}</IconButton>}
                    <Tabs value={value} onChange={handleChange} aria-label={props.label + ' navigation'}>
                        {props.views.map(({ header }, key) => (
                            <Tab key={key} label={header} {...a11yProps(key)} />
                        ))}
                    </Tabs>
                    {value !== false && (
                        <IconButton
                            sx={{ ml: 'auto' }}
                            onClick={() => {
                                setValue(false)
                                setFullscreen(false)
                            }}
                        >
                            <CloseIcon />
                        </IconButton>
                    )}
                </Toolbar>
            </AppBar>
            {value !== false && (
                <Box sx={{ position: 'fixed', bottom: 0, height: barMargin, width: '100%', background: theme.palette.background.default }}>
                    {props.views.map(({ view }, key) => (
                        <TabPanel key={key} value={value} index={key} dir={theme.direction}>
                            {view(fullscreen)}
                        </TabPanel>
                    ))}
                </Box>
            )}
        </Box>
    )
}

export default OverlayedTabs
