import { GetServerSideProps, NextPage } from 'next'
import { NextApiResponseUWS } from 'util/t'

type Props = {
    state: string
}

const Admin: NextPage<Props> = props => {
    return <pre>{props.state}</pre>
}

export const getServerSideProps: GetServerSideProps = async context => {
    const props: Props = {
        state: JSON.stringify((context.res as NextApiResponseUWS).socket?.server?.appState.toJSON(), null, 4)
    }

    return {
        props
    }
}

export default Admin
