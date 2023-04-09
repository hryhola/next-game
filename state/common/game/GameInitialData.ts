export type GameDataTextProperty = {
    type: 'field'
}

export type GameDataFileProperty = {
    type: 'file'
    accept: string[]
}

export type GameDataProperty = {
    name: string
    label: string
    required: boolean
} & (GameDataTextProperty | GameDataFileProperty)

export type GameDataPropertyValue = GameDataProperty & {
    value: string
}

export type InitialGameDataSchema = GameDataProperty[]

export type InitialGameData = Record<string, GameDataPropertyValue>
