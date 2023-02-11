import { GetServerSideProps, NextPage } from 'next'
import { Router } from 'client/features/app/Router'
import Head from 'next/head'
import { AppContext } from 'client/context/AppContext'
import { Route } from 'client/context/list/router'
import { deleteCookie } from 'cookies-next'
import logger from 'logger'
import { UserData } from 'state'
import { NextApiResponseUWS } from 'util/t'
import { initializeSocketServer } from 'uWebSockets/createSocketServer'

type Props = {
    defaultRoute: Route
    user?: UserData
}

const Home: NextPage<Props> = props => {
    return (
        <AppContext {...props}>
            <Head>
                <title>Game Club</title>
            </Head>
            <Router />
        </AppContext>
    )
}

export const getServerSideProps: GetServerSideProps = async context => {
    initializeSocketServer(context.res as NextApiResponseUWS)

    const props: Props = {
        defaultRoute: 'Login'
    }

    const token = context.req.cookies.token

    if (token) {
        try {
            const { appState } = (context.res as NextApiResponseUWS).socket?.server
            const user = appState.users.getByToken(token)

            if (!user) {
                deleteCookie('token')
            } else {
                user.update({ isOnline: true })
                props.defaultRoute = 'Home'
                props.user = user.data()
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
