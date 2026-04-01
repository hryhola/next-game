import React from 'react'
import { Button, Card, CardContent, CardHeader } from 'client/ui/primitives'
import { useI18n } from 'client/context/list'

export const Navigation = () => {
    const { t } = useI18n()

    return (
        <Card className="mx-auto w-full max-w-md">
            <CardHeader>
                <p className="text-xs uppercase tracking-[0.35em] text-violet-200/55">{t('common.home')}</p>
                <h2 className="text-2xl font-semibold text-white">{t('common.home')}</h2>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
                <Button variant="secondary" className="justify-start rounded-3xl px-5">
                    {t('common.home')}
                </Button>
            </CardContent>
        </Card>
    )
}
