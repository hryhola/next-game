import { Dialog, Box } from '@mui/material'
import IconButton from '@mui/material/IconButton'
import Toolbar from '@mui/material/Toolbar'
import Typography from '@mui/material/Typography'
import React, { useEffect } from 'react'
import CloseIcon from '@mui/icons-material/Close'
import { TransitionProps } from '@mui/material/transitions'
import Slide from '@mui/material/Slide'

// const getTransition = (dir: "left" | "right" | "up" | "down") => React.forwardRef(function Transition(
//     props: TransitionProps & {
//       children: React.ReactElement;
//     },
//     ref: React.Ref<unknown>,
//   ) {
//     return <Slide direction={dir} ref={ref} {...props} />;
//   });

const Transition = React.forwardRef(function Transition(
    props: TransitionProps & {
        children: React.ReactElement
    },
    ref: React.Ref<unknown>
) {
    return <Slide direction="up" ref={ref} {...props} />
})

const FullScreenModal: React.FC<{
    isOpen: boolean
    setIsOpen: (value: boolean) => void
    children: JSX.Element
    label: string
    transition?: 'left' | 'right' | 'up' | 'down'
}> = props => {
    return (
        <Dialog
            fullScreen
            open={props.isOpen}
            onClose={() => props.setIsOpen(false)}
            // {...props.transition ? {TransitionComponent: Transition } : {}}
        >
            <Box sx={{ display: 'flex', px: 4, pt: 4 }}>
                <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
                    {props.label}
                </Typography>
                <IconButton onClick={() => props.setIsOpen(false)}>
                    <CloseIcon />
                </IconButton>
            </Box>
            {props.children}
        </Dialog>
    )
}

export default FullScreenModal
