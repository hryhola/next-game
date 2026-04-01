import { useState, FormEventHandler } from 'react'
import { setCookie } from 'cookies-next'
import { useWS, useUser, useRequestHandler, useI18n } from 'client/context/list'
import { useClientRouter } from 'client/route/ClientRouter'
import { Button, Card, CardContent, CardHeader, Input } from 'client/ui/primitives'

const inSeconds90Days = 7776000

export const Login: React.FC = () => {
    const ws = useWS()
    const user = useUser()
    const router = useClientRouter()
    const { t, translateErrorMessage } = useI18n()

    const [nickname, setNickname] = useState('')
    const [error, setError] = useState('')

    useRequestHandler('Auth-Register', data => {
        if (data.success) {
            user.setId(data.user.id)
            user.setNickname(data.user.userNickname)
            user.setNicknameColor(data.user.userColor)

            setCookie('token', data.token, { maxAge: inSeconds90Days })

            router.setFrame('Home')
        } else {
            setError(translateErrorMessage(data.message))
        }
    })

    const handleSubmit: FormEventHandler<HTMLFormElement> = e => {
        e.preventDefault()

        const nicknameTrimmed = nickname.trim()

        if (nicknameTrimmed.length) {
            setError('')

            ws.send('Auth-Register', { userNickname: nicknameTrimmed })
        } else {
            setError(t('login.nicknameEmpty'))
        }
    }

    return (
        <div className="flex h-[var(--fullHeight)] overflow-y-auto px-6 py-10">
            <div className="m-auto w-full max-w-md">
                <Card className="w-full">
                    <CardHeader>
                        <p className="text-xs uppercase tracking-[0.35em] text-violet-200/55">{t('login.welcome')}</p>
                        <h2 className="text-3xl font-semibold text-white">{t('login.title')}</h2>
                        <p className="text-sm text-slate-300">{t('login.subtitle')}</p>
                    </CardHeader>
                    <CardContent>
                        <form className="space-y-4" onSubmit={handleSubmit}>
                            <div className="space-y-2">
                                <Input
                                    name="nickname"
                                    placeholder={t('login.nicknamePlaceholder')}
                                    value={nickname}
                                    onChange={e => setNickname(e.target.value)}
                                />
                                {error ? <p className="text-sm text-rose-300">{translateErrorMessage(error)}</p> : null}
                            </div>
                            <Button className="w-full" size="lg" variant="primary" type="submit">
                                {t('login.enter')}
                            </Button>
                        </form>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
