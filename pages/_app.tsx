import type { AppProps } from 'next/app'
import { AppContext } from 'client/context/AppContext'
import { ThemeProvider, createTheme } from '@mui/material/styles'
import CssBaseline from '@mui/material/CssBaseline'
import 'client/ui/globals.scss'

const darkTheme = createTheme({
    palette: {
        mode: 'dark'
    }
})

function MyApp({ Component, pageProps }: AppProps) {
    return (
        <ThemeProvider theme={darkTheme}>
            <CssBaseline />
            <Component {...pageProps} />
        </ThemeProvider>
    )
}

export default MyApp
