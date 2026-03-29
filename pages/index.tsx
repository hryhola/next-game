import { GetServerSideProps, NextPage } from 'next'
import Head from 'next/head'
import { AppContext } from 'client/context/AppContext'
import { ClientRouterProvider, FrameName } from 'client/route/ClientRouter'
import { deleteCookie } from 'cookies-next'
import logger from 'logger'
import { LobbyData, UserData } from 'state'
import type { NextApiResponseUWS } from 'util/universalTypes'
import { SnackbarProvider } from 'notistack'
import { getCloudflareRealtimeApiUrl, isCloudflareRealtimeEnabled } from 'client/network-utils/realtimeMode'

type Props = {
    initialFrame: FrameName
    user?: UserData
    lobby?: LobbyData
}

const Home: NextPage<Props> = props => {
    return (
        <SnackbarProvider
            maxSnack={5}
            classes={{
                root: 'SnackbarProvider-root',
                containerRoot: 'SnackbarProvider-containerRoot'
            }}
            dense
        >
            <AppContext {...props}>
                <Head>
                    <title>Game Club</title>
                </Head>
                <ClientRouterProvider initialFrame={props.initialFrame} />
            </AppContext>
        </SnackbarProvider>
    )
}

export const getServerSideProps: GetServerSideProps = async context => {
    const isWorkerMode = isCloudflareRealtimeEnabled()

    if (!isWorkerMode) {
        const { initializeSocketServer } = await import('uWebSockets/createSocketServer')

        initializeSocketServer(context.res as NextApiResponseUWS)
    }

    const props: Props = {
        initialFrame: 'Login'
    }

    const token = context.req.cookies.token

    if (token) {
        try {
            if (isWorkerMode) {
                const response = await fetch(getCloudflareRealtimeApiUrl('/auth/session'), {
                    headers: {
                        authorization: `Bearer ${token}`
                    }
                })

                if (response.ok) {
                    const body = await response.json()

                    props.initialFrame = 'Home'
                    props.user = {
                        ...body.session.user,
                        userIsOnline: true
                    }
                }
            } else {
                const { appState } = (context.res as NextApiResponseUWS).socket?.server
                const user = appState.users.getByToken(token)

                if (!user) {
                    deleteCookie('token')
                } else {
                    props.initialFrame = 'Home'
                    props.user = user.data()

                    if (user.hasLobbies) {
                        props.initialFrame = 'Lobby'
                        props.lobby = user.lobby.data()
                    }
                }
            }
        } catch (e) {
            logger.error(e)
        }
    }

    return {
        props
    }
}

export default Home
