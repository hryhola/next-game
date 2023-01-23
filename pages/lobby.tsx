import { NextPage } from 'next'
import dynamic from 'next/dynamic'

const DynamicComponent = dynamic(() => import('client/features/tic-tac-toe/TicTacToe').then(mod => mod.TicTacToe), { ssr: false })

const Lobby: NextPage = props => {
    return (
        <>
            <DynamicComponent />
        </>
    )
}

export default Lobby
