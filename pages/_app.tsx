import type { AppProps } from 'next/app'
import { AppContext } from 'client/context/AppContext'
import { ThemeProvider, createTheme } from '@mui/material/styles'
import CssBaseline from '@mui/material/CssBaseline'
import 'client/ui/globals.scss'
import 'client/global'
import { useEffect } from 'react'

const darkTheme = createTheme({
    palette: {
        mode: 'dark'
    }
})

function MyApp({ Component, pageProps }: AppProps) {
    useEffect(() => {
        function setOneVh() {
            const oneVh = `${window.innerHeight / 100}px`
            document.documentElement.style.setProperty('--vh', oneVh)
        }

        document.documentElement.style.setProperty('--fullHeight', `calc(var(--vh, 1vh) * 100)`)

        addEventListener('resize', setOneVh)
        addEventListener('orientationchange', setOneVh)
    }, [])

    return (
        <ThemeProvider theme={darkTheme}>
            <CssBaseline />
            <Component {...pageProps} />
        </ThemeProvider>
    )
}

export default MyApp
