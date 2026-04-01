import { useI18n } from 'client/context/list'

export const ErrorFrame: React.FC = () => {
    const { t } = useI18n()

    return <div>{t('error.404')}</div>
}
