import { Dialog, Box } from '@mui/material'
import IconButton from '@mui/material/IconButton'
import Toolbar from '@mui/material/Toolbar'
import Typography from '@mui/material/Typography'
import React, { useEffect } from 'react'
import CloseIcon from '@mui/icons-material/Close'
import { TransitionProps } from '@mui/material/transitions'
import Slide from '@mui/material/Slide'
import { SxProps } from '@mui/system'

// const getTransition = (dir: "left" | "right" | "up" | "down") => React.forwardRef(function Transition(
//     props: TransitionProps & {
//       children: React.ReactElement;
//     },
//     ref: React.Ref<unknown>,
//   ) {
//     return <Slide direction={dir} ref={ref} {...props} />;
//   });

const LeftTransition = React.forwardRef(function Transition(
    props: TransitionProps & {
        children: React.ReactElement
    },
    ref: React.Ref<unknown>
) {
    return <Slide direction="left" ref={ref} {...props} />
})

const RightTransition = React.forwardRef(function Transition(
    props: TransitionProps & {
        children: React.ReactElement
    },
    ref: React.Ref<unknown>
) {
    return <Slide direction="right" ref={ref} {...props} />
})

const UpTransition = React.forwardRef(function Transition(
    props: TransitionProps & {
        children: React.ReactElement
    },
    ref: React.Ref<unknown>
) {
    return <Slide direction="up" ref={ref} {...props} />
})

const DownTransition = React.forwardRef(function Transition(
    props: TransitionProps & {
        children: React.ReactElement
    },
    ref: React.Ref<unknown>
) {
    return <Slide direction="down" ref={ref} {...props} />
})

const transitionMap = {
    left: LeftTransition,
    right: RightTransition,
    up: UpTransition,
    down: DownTransition
}

const FullScreenModal: React.FC<{
    isOpen: boolean
    setIsOpen: (value: boolean) => void
    children: JSX.Element
    label: string
    transition?: 'left' | 'right' | 'up' | 'down'
    padding?: boolean
}> = props => {
    let headerHeight = '66px'
    let headerPadding: SxProps = {
        px: 4,
        pt: 4
    }

    if (props.padding) {
        headerHeight = '98px'
        headerPadding = {
            px: 4,
            py: 4
        }
    }

    return (
        <Dialog
            fullScreen
            open={props.isOpen}
            onClose={() => props.setIsOpen(false)}
            {...(props.transition ? { TransitionComponent: transitionMap[props.transition] } : {})}
        >
            <Box sx={{ display: 'flex', ...headerPadding }}>
                <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
                    {props.label}
                </Typography>
                <IconButton edge="end" size="small" sx={{ position: 'relative', left: '8px' }} onClick={() => props.setIsOpen(false)}>
                    <CloseIcon />
                </IconButton>
            </Box>
            <Box sx={{ ...(props.padding ? { px: 4 } : {}), minHeight: `calc(100vh - ${headerHeight})` }}>{props.children}</Box>
        </Dialog>
    )
}

export default FullScreenModal
