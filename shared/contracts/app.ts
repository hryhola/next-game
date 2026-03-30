import type { GeneralFailure, GeneralSuccess } from 'util/universalTypes'
import type { IdentityProfile } from './identity'
import type { RealtimeLobbyGameName, RealtimeLobbyMemberRole, TicTacToeCellCoords, TicTacToeCellValue, TicTacToePlayerChar } from './realtime-lobby'
import type { RealtimeJeopardyPackInitialData, RealtimeJeopardyPublicSession, RealtimeJeopardySessionState } from './jeopardy'

export type GameName = RealtimeLobbyGameName
export type LobbyMemberRole = RealtimeLobbyMemberRole

export const supportedGameNames: GameName[] = ['TicTacToe', 'Clicker', 'Jeopardy']

export interface TChatMessage {
    id: string
    from: string
    fromColor?: string
    text: string
}

export interface UserData extends IdentityProfile {
    userIsOnline: boolean
}

export interface LobbyMemberData extends UserData {
    memberIsCreator: boolean
    memberIsPlayer: boolean
    memberPosition: number
    memberRole: LobbyMemberRole
}

export type ReadyCheckMember = LobbyMemberData & { ready?: boolean }

export interface PlayerData extends LobbyMemberData {
    playerChar?: TicTacToePlayerChar
    playerIsClickAllowed?: boolean
    playerIsMaster: boolean
    playerScore: number
}

export type ClickerPlayerData = PlayerData & {
    playerIsClickAllowed?: boolean
}

export type TicTacToePlayerData = PlayerData & {
    playerChar?: TicTacToePlayerChar
}

export type JeopardyPlayerData = PlayerData

export type Tip = {
    id: string
    lobbyId: string
    from: string
    to: string
}

export interface LobbyData {
    creator: UserData
    gameName: GameName
    id: string
    members: LobbyMemberData[]
    private: boolean
    readyCheck: {
        members: ReadyCheckMember[]
    } | null
}

export type LobbyJoiningResult =
    | (GeneralSuccess & {
          gameJoiningResult?: GeneralSuccess | GeneralFailure | null
      })
    | GeneralFailure

export type InitialGameDataSchemeTextProperty = {
    type: 'field'
}

export type InitialGameDataSchemeFileProperty = {
    type: 'file'
    accept: string[]
}

export type InitialGameDataSchemeProperty = {
    name: string
    label: string
    required: boolean
    public: boolean
} & (InitialGameDataSchemeTextProperty | InitialGameDataSchemeFileProperty)

export type InitialGameDataSchema = InitialGameDataSchemeProperty[]

export type InitialGameDataProperty = {
    value: string
    public: boolean
}

export type InitialGameData = Record<string, InitialGameDataProperty>

export const clickerInitialDataSchema: InitialGameDataSchema = [
    {
        name: 'background',
        label: 'Background',
        required: false,
        accept: ['image/*'],
        type: 'file',
        public: true
    }
]

export const jeopardyInitialDataSchema: InitialGameDataSchema = [
    {
        name: 'pack',
        label: 'Pack',
        required: true,
        accept: ['.siq'],
        type: 'file',
        public: true
    }
]

export const gameInitialDataSchemas: Record<GameName, InitialGameDataSchema> = {
    TicTacToe: [],
    Clicker: clickerInitialDataSchema,
    Jeopardy: jeopardyInitialDataSchema
}

export type ClickerInitialData = {
    background?: InitialGameDataProperty
}

export type JeopardyInitialData = RealtimeJeopardyPackInitialData

export type TicTacToeInitialData = Record<string, never>

export type ClickerSessionData = {
    playerIsClickAllowed: boolean
    winner?: PlayerData
}

export type TicTacToeSessionData = {
    board: TicTacToeCellValue[][]
    turn: string | null
    winner?: string
}

export type JeopardySessionData = RealtimeJeopardyPublicSession | RealtimeJeopardySessionState

export type GameSessionData = ClickerSessionData | TicTacToeSessionData | JeopardySessionData

export interface GameData {
    initialData: InitialGameData
    name: GameName
    players: PlayerData[]
    session?: GameSessionData | null
}

export type TicTacToeWinningLine = TicTacToeCellCoords[]
