import { Box, Container } from '@mui/material'
import { GetServerSideProps, NextPage } from 'next'
import { useEffect, useRef, useState } from 'react'
import { NextApiResponseUWS } from 'util/universalTypes'

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

export const getServerSideProps: GetServerSideProps = async context => {
    const props: Props = {
        state: JSON.stringify((context.res as NextApiResponseUWS).socket?.server?.appState?.data(), null, 4)
    }

    return {
        props
    }
}

export default Admin
