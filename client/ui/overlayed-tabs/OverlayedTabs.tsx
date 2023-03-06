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
import { useEffect, useState } from 'react'

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

export const overlayedTabsToolbarHeight = '48px'

type View = (opts: { fullscreen: boolean; isOpen: boolean; direction?: 'up' | 'down' }) => JSX.Element

type PopoverProps = {
    sx: SxProps<Theme>
    header: React.ReactNode
    view: View
    fullscreen: boolean
    direction: 'up' | 'down'
    height: string
    hideIconOnOpen?: boolean
}

const PopoverView: React.FC<PopoverProps> = props => {
    const [isOpen, setIsOpen] = useState(false)

    const icon = <Box sx={{ display: 'flex' }}>{props.header}</Box>

    const hiddenIcon = isOpen && props.hideIconOnOpen

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
                          bottom: props.direction === 'up' ? props.height : '0'
                      }
                    : {
                          position: 'relative',
                          bottom: '0'
                      })
            }}
        >
            {hiddenIcon ? null : icon}
            <Box
                sx={{
                    position: 'absolute',
                    top: hiddenIcon ? 0 : 45,
                    visibility: isOpen ? 'visible' : 'hidden',
                    overflow: 'hidden',
                    ...(hiddenIcon
                        ? {
                              borderTopLeftRadius: '30px',
                              borderTopRightRadius: '30px'
                          }
                        : {})
                }}
            >
                {props.view({
                    fullscreen: props.fullscreen,
                    isOpen,
                    direction: props.direction
                })}
            </Box>
        </Box>
    )
}

type Props = {
    views: {
        type?: 'default' | 'popover'
        view: View
        hideIconOnOpen?: boolean
        header: React.ReactNode
        onFullscreen?: (value: boolean) => void
        height?: string
    }[]
    onViewOpen?: () => void
    onViewClose?: () => void
    label: string
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

    useEffect(() => {
        if (value === false) {
            props.onViewClose && props.onViewClose()
        } else {
            props.onViewOpen && props.onViewOpen()
        }
    }, [value])

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
                        <PopoverView
                            sx={{ ml: key === 0 ? 'auto' : '' }}
                            key={key}
                            {...p}
                            fullscreen={fullscreen}
                            direction={value === false ? 'up' : 'down'}
                            height={p.height!}
                            hideIconOnOpen={p.hideIconOnOpen}
                        />
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
                <Box sx={{ position: 'fixed', bottom: 0, height: barMargin, width: '100%', background: theme.palette.background.default, zIndex: 10 }}>
                    {props.views.map((vs, key) => (
                        <TabPanel key={key} value={value} index={key} dir={theme.direction}>
                            {vs.view({
                                fullscreen,
                                isOpen: true
                            })}
                        </TabPanel>
                    ))}
                </Box>
            )}
        </Box>
    )
}

export default OverlayedTabs
