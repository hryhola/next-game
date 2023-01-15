import React from 'react'
import classnames from 'classnames'
import styles from './LoadingOverlay.module.scss'
import { Backdrop, CircularProgress } from '@mui/material'

type Props = {
    isLoading: boolean
}

export const LoadingOverlay: React.FC<Props> = ({ isLoading }) => {
    return (
        <Backdrop sx={{ color: '#fff', zIndex: theme => theme.zIndex.drawer + 1 }} open={isLoading}>
            <CircularProgress color="inherit" />
            &nbsp; connecting...
        </Backdrop>
    )
}
