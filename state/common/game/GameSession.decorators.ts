import { Game, Player } from 'state'
import { A, E, P } from 'state/common/game/GameSession'

export const ActedBy = (actorPredicate: (actor: A) => boolean) => (_target: any, _propertyName: string, descriptor: PropertyDescriptor) => {
    const originalMethod = descriptor.value

    descriptor.value = function (actor: A, payload: P, { complete }: E) {
        if (!actorPredicate(actor)) {
            return {
                success: false,
                message: 'This actor have no permission to act this action!'
            }
        }
        return originalMethod.call(this, actor, payload, { complete })
    }
    return descriptor
}

export const GameOnlyActed = ActedBy(actor => actor instanceof Game)

export const GameAndMasterOnlyActed = ActedBy(actor => actor instanceof Game || actor.state.playerIsMaster)
export const PlayersOnlyActed = ActedBy(actor => actor instanceof Player)

export function Hidden(_target: any, _propertyName: string, descriptor: PropertyDescriptor) {
    descriptor.value.hidden = true
    return descriptor
}
