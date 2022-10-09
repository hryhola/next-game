import { useContext } from 'react'
import { WSContext } from 'client/context/list/ws.context'

export const DevToolsOverlay: React.FC = () => {
    const ws = useContext(WSContext)

    // if (process.env.NODE_ENV === 'production') {
    //     return <></>;
    // }

    return (
        <div style={{ position: 'fixed', right: 0, opacity: 0.5 }}>
            <button onClick={() => ws.wsRef.current?.close()}>close web socket</button>
        </div>
    )
}
