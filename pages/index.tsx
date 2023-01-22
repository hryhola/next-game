import { GetServerSideProps, NextPage } from 'next'
import { Router } from 'client/features/app/Router'
import Head from 'next/head'
import { AppContext } from 'client/context/AppContext'
import { Route } from 'client/context/list/router'
import { deleteCookie } from 'cookies-next'
import logger from 'logger'
import { uWSRest } from 'uWebSockets/rest'
import { User } from 'state'

type Props = {
    defaultRoute: Route
    user?: User
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

    await fetch((process.env.NODE_ENV === 'production' ? 'https://' : 'http://') + 'localhost:3000/api/init')

    if (token) {
        try {
            const res = await fetch(uWSRest.profile + '?token=' + token)
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

    return {
        props
    }
}

export default Home
