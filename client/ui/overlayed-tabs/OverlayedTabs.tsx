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
    views: {
        type?: 'default' | 'popover'
        view: (fullscreen: boolean) => JSX.Element
        header: string | JSX.Element
        onFullscreen?: (value: boolean) => void
    }[]
    label: string
}

export const overlayedTabsToolbarHeight = '48px'

type PopoverProps = {
    sx: SxProps<Theme>
    header: string | JSX.Element
    view: (fullscreen: boolean) => JSX.Element
    fullscreen: boolean
}

const PopoverView: React.FC<PopoverProps> = props => {
    const [isOpen, setIsOpen] = useState(false)

    return (
        <Box
            onMouseEnter={() => setIsOpen(true)}
            onMouseLeave={() => setIsOpen(false)}
            sx={{
                ...props.sx,
                borderTopLeftRadius: '30px',
                borderTopRightRadius: '30px',
                width: '46px',
                height: overlayedTabsToolbarHeight,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.2s ease-in-out',
                backgroundColor: '#272727',
                ...(isOpen
                    ? {
                          position: 'relative',
                          bottom: '240px'
                      }
                    : {
                          position: 'relative',
                          bottom: '0'
                      })
            }}
        >
            <Box>{props.header}</Box>
            <Box
                sx={{
                    width: '46px',
                    backgroundColor: '#272727',
                    position: 'absolute',
                    top: 45,
                    visibility: isOpen ? 'visible' : 'hidden',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center'
                }}
            >
                {props.view(props.fullscreen)}
            </Box>
        </Box>
    )
}

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

    const defaultViews = props.views.filter(({ type }) => type !== 'popover')
    const popoverViews = props.views.filter(({ type }) => type === 'popover')

    return (
        <Box>
            <AppBar sx={{ bottom: barMargin, top: 'auto', display: 'flex' }} position="fixed">
                <Toolbar sx={{ p: 0 }} variant="dense">
                    {value !== false && <IconButton onClick={handleFullscreen}>{fullscreen ? <ArrowDropDownIcon /> : <ArrowDropUpIcon />}</IconButton>}
                    <Tabs value={value} onChange={handleChange} aria-label={props.label + ' navigation'}>
                        {defaultViews.map(({ header }, key) => (
                            <Tab key={key} label={header} {...a11yProps(key)} />
                        ))}
                    </Tabs>
                    {popoverViews.map((p, key) => (
                        <PopoverView sx={{ ml: key === 0 ? 'auto' : '' }} key={key} {...p} fullscreen={fullscreen} />
                    ))}
                    {value !== false && (
                        <IconButton
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
