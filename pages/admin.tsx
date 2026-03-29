import { Box, Container } from '@mui/material'
import { GetServerSideProps, NextPage } from 'next'
import { useEffect, useRef, useState } from 'react'
import { getCloudflareRealtimeApiUrl, getRequestOrigin } from 'client/network-utils/realtimeMode'

type Props = {
    state: string
}

const Admin: NextPage<Props> = props => {
    const [isLoaded, setIsLoaded] = useState(false)
    const ReactJson = useRef<React.ComponentType<any> | null>(null)

    useEffect(() => {
        import('react-json-view').then(lib => {
            ReactJson.current = lib.default
            setIsLoaded(true)
        })
    }, [])

    if (!isLoaded || !ReactJson.current) return null

    return (
        <Box sx={{ background: 'rgb(39, 40, 34)', minHeight: '100vh', pt: 2 }}>
            <Container>
                <ReactJson.current src={JSON.parse(props.state)} theme="monokai" />
            </Container>
        </Box>
    )
}

async function readJson(url: string, token?: string) {
    const headers = new Headers()

    if (token) {
        headers.set('authorization', `Bearer ${token}`)
    }

    const response = await fetch(url, {
        headers
    })

    if (!response.ok) {
        return {
            ok: false,
            status: response.status
        }
    }

    return response.json()
}

export const getServerSideProps: GetServerSideProps = async context => {
    const requestOrigin = getRequestOrigin(context.req.headers)
    const token = context.req.cookies.token

    const props: Props = {
        state: JSON.stringify(
            {
                generatedAt: new Date().toISOString(),
                health: await readJson(getCloudflareRealtimeApiUrl('/health', requestOrigin)),
                session: await readJson(getCloudflareRealtimeApiUrl('/auth/session', requestOrigin), token),
                presence: await readJson(getCloudflareRealtimeApiUrl('/presence/state', requestOrigin), token),
                lobbies: await readJson(getCloudflareRealtimeApiUrl('/lobbies', requestOrigin), token)
            },
            null,
            4
        )
    }

    return {
        props
    }
}

export default Admin
