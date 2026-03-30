import { useEffect } from 'react'
import dotsGrid from './scripts/dots-grid'
import matrix from './scripts/matrix'
import stars from './scripts/stars'

import styles from './AnimatedBackground.module.css'

export type AnimationType = 'dot-grid' | 'matrix' | 'stars'

const scriptMap: Record<AnimationType, Function> = {
    'dot-grid': dotsGrid,
    matrix: matrix,
    stars: stars
}

interface Props {
    type: AnimationType
}

export const AnimatedBackground: React.FC<Props> = props => {
    useEffect(() => {
        const cleanup = scriptMap[props.type]()

        return typeof cleanup === 'function' ? cleanup : undefined
    }, [props.type])

    return (
        <div id="animated-container" className={styles.container}>
            {props.type === 'stars' ? <div className={styles.gradient} /> : null}
            <canvas id="animated-background" className={styles.canvas}></canvas>
        </div>
    )
}
