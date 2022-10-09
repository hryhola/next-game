import classNames from 'classnames'
import { MouseEventHandler, useRef } from 'react'

import styles from './Modal.module.scss'

interface Props {
    isOpen: boolean
    setIsOpen: (value: boolean) => void
    content: React.FC
    closeOnEscape?: boolean
}

export const Modal: React.FC<Props> = props => {
    const closeOnEscape = props.closeOnEscape ?? true

    const containerRef = useRef<HTMLDivElement | null>(null)

    const handleEscapeClick: MouseEventHandler<HTMLDivElement> = event => {
        if (!closeOnEscape) return

        if (event.target === containerRef.current) {
            props.setIsOpen(false)
        }
    }

    return (
        <div
            ref={containerRef}
            onClick={handleEscapeClick}
            className={classNames(styles.background, {
                [styles.open]: props.isOpen,
                [styles.closed]: !props.isOpen
            })}
        >
            <div className={styles.modal}>
                <props.content />
            </div>
        </div>
    )
}
