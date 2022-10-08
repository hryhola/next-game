import { useContext } from 'react'
import { WSContext } from 'client/context/list/ws.context'

export const DevToolsOverlay: React.FC = () => {
    const ws = useContext(WSContext)

    // if (process.env.NODE_ENV === 'production') {
    //     return <></>;
    // }

    return (
        <div style={{ position: 'fixed' }}>
            <button onClick={() => ws.wsRef.current?.close()}>close web socket</button>
        </div>
    )
}
