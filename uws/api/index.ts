/* eslint-disable import/no-anonymous-default-export */

import { Handler } from '../uws.types'
import { login } from './login'

export default {
    login
} as Record<string, Handler<any>>
