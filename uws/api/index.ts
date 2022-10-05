/* eslint-disable import/no-anonymous-default-export */

import { Handler } from '../uws.types'
import { login } from './login'
import { subscribe } from './subscribe'
import { globalOnline } from './globalOnline'
import { close } from './close'

export default {
    login,
    subscribe,
    globalOnline,
    close
} as Record<string, Handler<any>>
