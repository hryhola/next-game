import React from 'react'
import classnames from 'classnames'
import styles from './LoadingOverlay.module.scss'

type Props = {
    isLoading: boolean
    children: React.ReactNode
}

export const LoadingOverlay: React.FC<Props> = ({ children, isLoading }) => {
    return (
        <>
            {isLoading && <div className={styles.loadingOverlay}>loading...</div>}
            <div className={classnames({ [styles.loading]: isLoading })} aria-busy={isLoading}>
                {children}
            </div>
        </>
    )
}
