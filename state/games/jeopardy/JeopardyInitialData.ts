import { InitialGameDataSchema, InitialGameDataSchemeProperty, InitialGameDataProperty } from 'state/common/game/GameInitialData'

const packProperty: InitialGameDataSchemeProperty = {
    name: 'pack',
    label: 'Pack',
    required: true,
    accept: ['.siq'],
    type: 'file',
    public: false
}

export const jeopardyInitialDataSchema: InitialGameDataSchema = [packProperty]

export type JeopardyInitialDataSchema = typeof jeopardyInitialDataSchema

export type JeopardyInitialData = {
    pack: InitialGameDataProperty
}
