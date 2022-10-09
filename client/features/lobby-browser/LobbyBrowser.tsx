import { WSContext } from 'client/context/list/ws.context'
import { useContext, useEffect, useState } from 'react'
import { LobbyInfo } from 'uws/api/Lobby-GetList'
import { RequestData, RequestHandler } from 'uws/uws.types'

const LobbyRecord: React.FC<LobbyInfo> = props => (
    <li>
        {props.id}
        {props.private ? <button>Enter password</button> : <button>Join</button>}
    </li>
)

export const LobbyBrowser: React.FC = () => {
    const ws = useContext(WSContext)

    const [lobbiesList, setLobbiesList] = useState<LobbyInfo[]>([])

    const getListHandler: RequestHandler<'Lobby-GetList'> = data => {
        setLobbiesList(data.lobbies)
    }

    useEffect(() => {
        ws.on('Lobby-GetList', getListHandler)
        ws.send('Lobby-GetList')
    }, [])

    return (
        <div>
            Lobby Browser
            <ul>{lobbiesList.map(LobbyRecord)}</ul>
        </div>
    )
}
