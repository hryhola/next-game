import { useI18n, useLobby } from 'client/context/list'
import { useLobbyMessages } from 'client/features/lobby/useLobbyMessages'
import { useJeopardyAction } from './JeopardyView'

const getSupportedQuestionTypeLabel = (questionType: string, t: ReturnType<typeof useI18n>['t']) => {
    switch (questionType) {
        case 'forAll':
        case 'forYourself':
        case 'noRisk':
        case 'secret':
        case 'secretNoQuestion':
        case 'secretPublicPrice':
        case 'stake':
        case 'stakeAll':
            return t(`jeopardy.questionType.${questionType}`)
        default:
            return null
    }
}

const JeopardyAnnouncements = () => {
    const lobby = useLobby()
    const { t } = useI18n()
    const { appendLobbySystemMessage } = useLobbyMessages()

    useJeopardyAction('$PickQuestion', data => {
        const actor = lobby.members.find(member => member.id === data.actor.id)
        const questionTypeLabel = data.result.questionType ? getSupportedQuestionTypeLabel(data.result.questionType, t) : null

        if (!actor || !questionTypeLabel || data.result.questionType === 'simple' || data.result.questionType === 'custom') {
            return
        }

        appendLobbySystemMessage([
            { color: actor.userColor, text: actor.userNickname },
            { text: t('lobby.system.jeopardy.pickedSpecial') },
            { color: '#c084fc', text: questionTypeLabel },
            ...(data.result.questionTheme ? [{ text: t('lobby.system.jeopardy.inTheme') }, { text: data.result.questionTheme }] : []),
            ...(typeof data.result.questionPrice === 'number' ? [{ text: t('lobby.system.jeopardy.forValue', { value: data.result.questionPrice }) }] : []),
            { text: '.' }
        ])
    })

    useJeopardyAction('$SkipCategory', data => {
        const actor = lobby.members.find(member => member.id === data.actor.id)

        if (!actor || !data.result.themeName) {
            return
        }

        appendLobbySystemMessage([
            { color: actor.userColor, text: actor.userNickname },
            { text: t('lobby.system.jeopardy.skippedCategory') },
            { color: '#f8fafc', text: data.result.themeName },
            { text: '.' }
        ])
    })

    useJeopardyAction('$SkipFinalTheme', data => {
        const actor = lobby.members.find(member => member.id === data.actor.id)

        if (!actor || !data.result.themeName) {
            return
        }

        appendLobbySystemMessage([
            { color: actor.userColor, text: actor.userNickname },
            { text: t('lobby.system.jeopardy.skippedFinalTheme') },
            { color: '#f8fafc', text: data.result.themeName },
            { text: '.' }
        ])
    })

    return null
}

export default JeopardyAnnouncements
