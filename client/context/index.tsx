import { ContextComposer } from './ContextComposer'
import { AuthProvider } from './auth.context'
import { RouterProvider } from './router.context'
import { WSProvider } from './ws.context'

export const AppContext: React.FC<{ children: JSX.Element }> = props => (
    <ContextComposer components={[WSProvider, RouterProvider, AuthProvider]}>{props.children}</ContextComposer>
)
