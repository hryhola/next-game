import { useEffect } from 'react'
import dotsGrid from './scripts/dots-grid'
import matrix from './scripts/matrix'

import styles from './AnimatedBackground.module.scss'

export type AnimationType = 'dot-grid' | 'matrix'

const scriptMap: Record<AnimationType, Function> = {
    'dot-grid': dotsGrid,
    matrix: matrix
}

interface Props {
    type: AnimationType
}

export const AnimatedBackground: React.FC<Props> = props => {
    useEffect(() => {
        scriptMap[props.type]()
    }, [])

    return (
        <div id="animated-container" className={styles.container}>
            <canvas id="animated-background" className={styles.canvas}></canvas>
        </div>
    )
}
