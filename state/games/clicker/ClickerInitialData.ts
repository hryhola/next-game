import { InitialGameDataSchema } from 'state/common/game/GameInitialData'

export const clickerInitialDataSchema: InitialGameDataSchema = [
    {
        name: 'background',
        label: 'Background',
        required: false,
        accept: ['image/*'],
        type: 'file'
    }
]

export type ClickerInitialDataSchema = typeof clickerInitialDataSchema

export type ClickerInitialData = {
    background: ClickerInitialDataSchema[0] & {
        value: string
    }
}
