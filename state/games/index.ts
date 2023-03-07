import { Clicker } from './clicker/Clicker'

export const GameCtors = {
    Clicker: Clicker
}

export type GameName = keyof typeof GameCtors
