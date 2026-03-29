import { GetServerSideProps, NextPage } from 'next'
import Head from 'next/head'
import { AppContext } from 'client/context/AppContext'
import { ClientRouterProvider, FrameName } from 'client/route/ClientRouter'
import { deleteCookie } from 'cookies-next'
import logger from 'logger'
import { toAppLobbyData } from 'client/network-utils/realtimeAdapter'
import { LobbyData, UserData } from 'state'
import type { IdentitySession, RealtimeLobbyListItem, RealtimeLobbySnapshot } from 'shared/contracts'
import { SnackbarProvider } from 'notistack'
import { getCloudflareRealtimeApiUrl, getRequestOrigin } from 'client/network-utils/realtimeMode'

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

function sanitizeForNext<T>(value: T): T {
    return JSON.parse(JSON.stringify(value)) as T
}

async function readJson<T>(url: string, token: string): Promise<T | null> {
    const response = await fetch(url, {
        headers: {
            authorization: `Bearer ${token}`
        }
    })

    if (!response.ok) {
        return null
    }

    return (await response.json()) as T
}

async function findActiveLobbySnapshot(token: string, userId: string, requestOrigin?: string): Promise<RealtimeLobbySnapshot | null> {
    const lobbiesResponse = await readJson<{ lobbies?: RealtimeLobbyListItem[] }>(getCloudflareRealtimeApiUrl('/lobbies', requestOrigin), token)
    const lobbies = lobbiesResponse?.lobbies || []

    for (const lobby of lobbies) {
        const roomResponse = await readJson<{ room?: RealtimeLobbySnapshot }>(
            getCloudflareRealtimeApiUrl(`/rooms/${encodeURIComponent(lobby.id)}/state`, requestOrigin),
            token
        )

        const room = roomResponse?.room

        if (room?.members.some(member => member.id === userId)) {
            return room
        }
    }

    return null
}

export const getServerSideProps: GetServerSideProps = async context => {
    const props: Props = {
        initialFrame: 'Login'
    }

    const token = context.req.cookies.token
    const requestOrigin = getRequestOrigin(context.req.headers)

    if (token) {
        try {
            const body = await readJson<{ session?: IdentitySession }>(getCloudflareRealtimeApiUrl('/auth/session', requestOrigin), token)

            if (!body?.session) {
                deleteCookie('token', {
                    req: context.req,
                    res: context.res
                })
            } else {
                props.initialFrame = 'Home'
                props.user = {
                    ...body.session.user,
                    userIsOnline: true
                }

                const activeLobby = await findActiveLobbySnapshot(token, body.session.user.id, requestOrigin)

                if (activeLobby) {
                    props.initialFrame = 'Lobby'
                    props.lobby = toAppLobbyData(activeLobby)
                }
            }
        } catch (e) {
            logger.error(e)
        }
    }

    return {
        props: sanitizeForNext(props)
    }
}

export default Home
