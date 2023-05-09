import { A, E, P } from 'state/common/game/GameSession'
import { ActedBy as AbstractActedBy, GuardPredicate, PlayersOnlyActed } from 'state/common/game/GameSession.decorators'
import { R } from 'util/universalTypes'
import { Jeopardy } from './Jeopardy'
import { JeopardyPlayer } from './JeopardyPlayer'
import { JeopardySession } from './JeopardySession'
import { JeopardyState } from './JeopardySessionState'

export const OnFrame =
    <FrameId extends JeopardyState.Frame['id'], Actor extends JeopardyPlayer | Jeopardy = JeopardyPlayer | Jeopardy>(
        frameId: FrameId,
        predicate?: GuardPredicate<
            JeopardySession & {
                state: {
                    frame: Extract<JeopardyState.Frame, { id: FrameId }>
                }
            },
            Actor
        >,
        message = 'No permission'
    ) =>
    (_target: any, _propertyName: string, descriptor: PropertyDescriptor) => {
        const originalMethod = descriptor.value

        descriptor.value = function (actor: A, payload: P, { complete }: E): R {
            const currentFrame = (this as JeopardySession).state?.frame?.id

            if (currentFrame !== frameId) {
                complete()

                return {
                    success: false,
                    message: `This action should be fired only on ${frameId} frame! Current frame: ${currentFrame}`
                }
            }

            if (
                predicate &&
                !predicate(
                    this as JeopardySession & {
                        state: {
                            frame: Extract<JeopardyState.Frame, { id: FrameId }>
                        }
                    }
                )(actor as Actor)
            ) {
                complete()
                return {
                    success: false,
                    message
                }
            }

            return originalMethod.call(this, actor, payload, { complete })
        }
        return descriptor
    }

export const ActedBy = AbstractActedBy<JeopardySession, Jeopardy | JeopardyPlayer>

export function ActedByPlayers(predicate: GuardPredicate<JeopardySession, JeopardyPlayer>, message?: string) {
    return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
        PlayersOnlyActed(target, propertyKey, descriptor)
        AbstractActedBy(predicate, message)(target, propertyKey, descriptor)
    }
}
