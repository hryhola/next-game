// @index('./*', f => `import { handler as ${f.name.replaceAll('-', '')} } from '${f.path}'`)
import { handler as AuthLogin } from './Auth-Login'
import { handler as AuthLogout } from './Auth-Logout'
import { handler as GlobalChatGet } from './Global-ChatGet'
import { handler as GlobalChatSend } from './Global-ChatSend'
import { handler as GlobalOnlineGet } from './Global-OnlineGet'
import { handler as GlobalSubscribe } from './Global-Subscribe'
import { handler as GlobalUsersGet } from './Global-UsersGet'
import { handler as LobbyCreate } from './Lobby-Create'
import { handler as LobbyGetList } from './Lobby-GetList'
// @endindex

const handlerMap = {
    // @index('./*', f => `'${f.name}': ${f.name.replaceAll('-', '')},`)
    'Auth-Login': AuthLogin,
    'Auth-Logout': AuthLogout,
    'Global-ChatGet': GlobalChatGet,
    'Global-ChatSend': GlobalChatSend,
    'Global-OnlineGet': GlobalOnlineGet,
    'Global-Subscribe': GlobalSubscribe,
    'Global-UsersGet': GlobalUsersGet,
    'Lobby-Create': LobbyCreate,
    'Lobby-GetList': LobbyGetList
    // @endindex
}

export type HandlerName = keyof typeof handlerMap

export default handlerMap
