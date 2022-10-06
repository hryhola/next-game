// @index('./*', f => `import { handler as ${f.name.replaceAll('-', '')} } from '${f.path}'`)
import { handler as AuthLogin } from './Auth-Login'
import { handler as AuthLogout } from './Auth-Logout'
import { handler as GlobalChatGet } from './Global-ChatGet'
import { handler as GlobalChatSend } from './Global-ChatSend'
import { handler as GlobalOnlineGet } from './Global-OnlineGet'
import { handler as GlobalSubscribe } from './Global-Subscribe'
// @endindex

const handlerMap = {
    // @index('./*', f => `'${f.name}': ${f.name.replaceAll('-', '')},`)
    'Auth-Login': AuthLogin,
    'Auth-Logout': AuthLogout,
    'Global-ChatGet': GlobalChatGet,
    'Global-ChatSend': GlobalChatSend,
    'Global-OnlineGet': GlobalOnlineGet,
    'Global-Subscribe': GlobalSubscribe
    // @endindex
}

export type HandlerName = keyof typeof handlerMap

export default handlerMap
