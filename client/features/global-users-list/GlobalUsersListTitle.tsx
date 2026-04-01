import React from 'react'
import { useI18n } from 'client/context/list'

type Props = {
    count: number | null
}

export const GlobalUsersListTitle: React.FC<Props> = props => {
    const { t } = useI18n()

    return (
        <>
            {t('common.online')}
            {typeof props.count === 'number' && <>&nbsp;({props.count})</>}
        </>
    )
}
