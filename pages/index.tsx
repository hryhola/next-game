import { GetServerSideProps, NextPage } from 'next'
import { Router } from 'client/features/app/Router'
import Head from 'next/head'
import { AppContext } from 'client/context/AppContext'
import { Route } from 'client/context/list/router'
import { WsGetUrl } from 'uWebSockets/get'
import { deleteCookie } from 'cookies-next'
import { TUser } from 'model'
import logger from 'logger'

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
    const props: Props = {
        defaultRoute: 'Login'
    }

    const token = context.req.cookies.token

    if (token) {
        try {
            const res = await fetch(WsGetUrl.profile + '?token=' + token)
            const data = await res.json()

            if (!data.success) {
                deleteCookie('token')
            } else {
                props.defaultRoute = 'Home'
                props.user = data.user
            }
        } catch (e) {
            logger.error(e)
        }
    }

    console.log(props)

    return {
        props
    }
}

export default Home
