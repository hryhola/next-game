import type { AppProps } from 'next/app'
import { AppContext } from 'client/context/AppContext'
import 'client/ui/globals.scss'

function MyApp({ Component, pageProps }: AppProps) {
    return (
        <AppContext>
            <Component {...pageProps} />
        </AppContext>
    )
}

export default MyApp
