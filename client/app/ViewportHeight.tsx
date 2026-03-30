'use client'

import { useEffect } from 'react'

export const ViewportHeight: React.FC = () => {
    useEffect(() => {
        const setOneVh = () => {
            const oneVh = `${window.innerHeight / 100}px`

            document.documentElement.style.setProperty('--vh', oneVh)
            document.documentElement.style.setProperty('--fullHeight', `calc(var(--vh, 1vh) * 100)`)
        }

        setOneVh()

        window.addEventListener('resize', setOneVh)
        window.addEventListener('orientationchange', setOneVh)

        return () => {
            window.removeEventListener('resize', setOneVh)
            window.removeEventListener('orientationchange', setOneVh)
        }
    }, [])

    return null
}
