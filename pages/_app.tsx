import type { AppProps } from 'next/app'
import { AppContext } from 'client/context/AppContext'
import { ThemeProvider, createTheme } from '@mui/material/styles'
import CssBaseline from '@mui/material/CssBaseline'

const darkTheme = createTheme({
    palette: {
        mode: 'dark'
    }
})

function MyApp({ Component, pageProps }: AppProps) {
    return (
        <ThemeProvider theme={darkTheme}>
            <CssBaseline />
            <AppContext>
                <Component {...pageProps} />
            </AppContext>
        </ThemeProvider>
    )
}

export default MyApp
