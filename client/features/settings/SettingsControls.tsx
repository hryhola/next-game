import { useI18n, type AppFont, type AppLanguage } from 'client/context/list'
import { cn } from 'client/ui/lib/cn'
import { Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from 'client/ui/primitives'

type Props = {
    className?: string
    layout?: 'inline' | 'stacked'
    trailing?: React.ReactNode
    trailingLabel?: React.ReactNode
}

const fontOptions: AppFont[] = ['silly', 'retro', 'fancy', 'orthodox', 'normal']
const languageOptions: AppLanguage[] = ['en', 'uk']

export const SettingsControls: React.FC<Props> = ({ className, layout = 'stacked', trailing, trailingLabel }) => {
    const compact = layout === 'inline'
    const { font, language, setFont, setLanguage, t, tFontName, tLanguageName } = useI18n()

    return (
        <div className={cn(compact ? cn('grid items-start gap-3', trailing ? 'grid-cols-3 mt-4' : 'grid-cols-2') : 'flex flex-col gap-4', className)}>
            <div className="flex flex-col gap-2">
                <Label className="ml-[18px] text-xs uppercase tracking-[0.28em] text-violet-200/60">{t('settings.font.label')}</Label>
                <Select value={font} onValueChange={value => setFont(value as AppFont)}>
                    <SelectTrigger className={cn(compact && 'h-11 rounded-full px-4')}>
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        {fontOptions.map(option => (
                            <SelectItem key={option} value={option}>
                                {tFontName(option)}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
            <div className="flex flex-col gap-2">
                <Label className="ml-[18px] text-xs uppercase tracking-[0.28em] text-violet-200/60">{t('settings.language.label')}</Label>
                <Select value={language} onValueChange={value => setLanguage(value as AppLanguage)}>
                    <SelectTrigger className={cn(compact && 'h-11 rounded-full px-4')}>
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        {languageOptions.map(option => (
                            <SelectItem key={option} value={option}>
                                {tLanguageName(option)}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
            {trailing ? (
                <div className="flex flex-col gap-2">
                    <Label className="ml-[18px] text-xs uppercase tracking-[0.28em] text-violet-200/60">{trailingLabel}</Label>
                    {trailing}
                </div>
            ) : null}
        </div>
    )
}
