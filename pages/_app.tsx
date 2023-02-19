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
    },
    components: {
        MuiCssBaseline: {
            styleOverrides: {
                body: {
                    scrollbarColor: '#6b6b6b rgba(0,0,0,0)',
                    '&::-webkit-scrollbar, & *::-webkit-scrollbar': {
                        backgroundColor: 'rgba(0,0,0,0)',
                        height: '5px'
                    },
                    '&::-webkit-scrollbar-thumb, & *::-webkit-scrollbar-thumb': {
                        borderRadius: 8,
                        backgroundColor: '#6b6b6b'
                    }
                }
            }
        }
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
