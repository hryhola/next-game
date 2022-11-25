import { useEffect } from 'react'
import dotsGrid from './scripts/dots-grid'
import matrix from './scripts/matrix'
import ghostMouse from './scripts/ghost-mouse'

import styles from './AnimatedBackground.module.scss'

export type AnimationType = 'dot-grid' | 'matrix' | 'ghost-mouse'

const scriptMap: Record<AnimationType, Function> = {
    'dot-grid': dotsGrid,
    matrix: matrix,
    'ghost-mouse': ghostMouse
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
