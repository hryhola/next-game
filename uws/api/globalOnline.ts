import { GlobalOnlineUpdate, Handler } from '../uws.types'
import { state } from '../../state'

export const globalOnline: Handler = res => {
    res.send<GlobalOnlineUpdate>({
        onlineUsersCount: state.users.length
    })
}
