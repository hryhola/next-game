import { InitialGameDataProperty, InitialGameDataSchema } from 'state/common/game/GameInitialData'

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

export type ClickerInitialDataSchema = typeof clickerInitialDataSchema

export type ClickerInitialData = {
    background: InitialGameDataProperty
}
