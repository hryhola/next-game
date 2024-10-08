import { GetServerSideProps, NextPage } from 'next'
import Head from 'next/head'
import { AppContext } from 'client/context/AppContext'
import { ClientRouterProvider, FrameName } from 'client/route/ClientRouter'
import { deleteCookie } from 'cookies-next'
import logger from 'logger'
import { LobbyData, UserData } from 'state'
import { NextApiResponseUWS } from 'util/universalTypes'
import { initializeSocketServer } from 'uWebSockets/createSocketServer'
import { SnackbarProvider } from 'notistack'

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
    initializeSocketServer(context.res as NextApiResponseUWS)

    const props: Props = {
        initialFrame: 'Login'
    }

    const token = context.req.cookies.token

    if (token) {
        try {
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
        } catch (e) {
            logger.error(e)
        }
    }

    return {
        props
    }
}

export default Home
