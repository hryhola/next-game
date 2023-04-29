import { Game } from 'state'
import { A, E, P } from 'state/common/game/GameSession'

export function GameOnlyActed(_target: any, _propertyName: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value

    descriptor.value = function (actor: A, payload: P, { complete }: E) {
        if (!(actor instanceof Game)) {
            return {
                success: false,
                message: 'Only game can start categories preview'
            }
        }
        return originalMethod.call(this, actor, payload, { complete })
    }
    return descriptor
}

export function Hidden(_target: any, _propertyName: string, descriptor: PropertyDescriptor) {
    descriptor.value.hidden = true
    return descriptor
}
