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
