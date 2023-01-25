import { GetServerSideProps, NextPage } from 'next'
import { Router } from 'client/features/app/Router'
import Head from 'next/head'
import { AppContext } from 'client/context/AppContext'
import { Route } from 'client/context/list/router'
import { deleteCookie } from 'cookies-next'
import logger from 'logger'
import { TUser } from 'state'
import { NextApiResponseUWS } from 'util/t'

type Props = {
    defaultRoute: Route
    user?: TUser
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
    await fetch((process.env.NODE_ENV === 'production' ? 'https://' : 'http://') + 'localhost:3000/api/init')

    const props: Props = {
        defaultRoute: 'Login'
    }

    const token = context.req.cookies.token

    if (token) {
        try {
            const { appState } = (context.res as NextApiResponseUWS).socket?.server
            const user = appState.users.auth(token)

            if (!user) {
                deleteCookie('token')
            } else {
                user.setOnline(true)
                props.defaultRoute = 'Home'
                props.user = {
                    nickname: user.nickname
                }

                if (user.avatarRes) {
                    props.user.avatarRes = user.avatarRes
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
