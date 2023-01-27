import * as React from 'react'
import SwipeableViews from 'react-swipeable-views'
import { SxProps, Theme, useTheme } from '@mui/material/styles'
import AppBar from '@mui/material/AppBar'
import Tabs from '@mui/material/Tabs'
import Tab from '@mui/material/Tab'
import Box from '@mui/material/Box'

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

type Props = {
    views: { view: JSX.Element; header: string | JSX.Element }[]
    label: string
}

export const SwipeTabs: React.FC<Props> = props => {
    const theme = useTheme()
    const [value, setValue] = React.useState(0)

    const handleChange = (event: React.SyntheticEvent, newValue: number) => {
        setValue(newValue)
    }

    const handleChangeIndex = (index: number) => {
        setValue(index)
    }

    return (
        <Box {...props}>
            <AppBar sx={{ height: tabsHeaderHeight }} position="static">
                <Tabs value={value} onChange={handleChange} indicatorColor="primary" textColor="inherit" aria-label={props.label + ' navigation'}>
                    {props.views.map(({ header }, key) => (
                        <Tab key={key} label={header} {...a11yProps(key)} />
                    ))}
                </Tabs>
            </AppBar>
            <SwipeableViews
                id={props.label + '-container'}
                style={{ flexGrow: 1 }}
                axis={theme.direction === 'rtl' ? 'x-reverse' : 'x'}
                index={value}
                onChangeIndex={handleChangeIndex}
            >
                {props.views.map(({ view }, key) => (
                    <TabPanel key={key} value={value} index={key} dir={theme.direction}>
                        {view}
                    </TabPanel>
                ))}
            </SwipeableViews>
        </Box>
    )
}
