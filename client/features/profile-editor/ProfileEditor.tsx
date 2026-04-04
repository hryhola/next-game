import { useI18n, useWS, useUser } from 'client/context/list'
import React, { useState, useRef } from 'react'
import { LoadingOverlay } from 'client/ui'
import { api } from 'client/network-utils/api'
import { ProfilePicture } from '../profile-picture/ProfilePicture'
import randomColor from 'randomcolor'
import { deleteCookie } from 'cookies-next'
import { useGlobalModal } from '../global-modal/GlobalModal'
import { Button, Input } from 'client/ui/primitives'
import { Sparkles } from 'lucide-react'
import { SettingsControls } from '../settings/SettingsControls'

interface Props {
    onUpdated?: () => void
    onLoadingChange?: (isLoading: boolean) => void
}

export const ProfileEditor: React.FC<Props> = props => {
    const globalModel = useGlobalModal()
    const { t, translateErrorMessage } = useI18n()
    const onLoadingChange = props.onLoadingChange

    const formRef = useRef<HTMLFormElement | null>(null)

    const user = useUser()
    const ws = useWS()

    const [nickname, setNickname] = useState(user.userNickname)
    const [userColor, setNicknameColor] = useState(user.userColor)
    const [imageFile, setImageFile] = useState<File | null>(null)

    const [error, setError] = useState('')
    const [isLoading, setIsLoading] = useState(false)

    React.useEffect(() => {
        onLoadingChange?.(isLoading)

        return () => {
            onLoadingChange?.(false)
        }
    }, [isLoading, onLoadingChange])

    const displayedImage = imageFile
        ? {
              local: true,
              url: URL.createObjectURL(imageFile)
          }
        : {
              local: false,
              url: user.userAvatarUrl
          }

    const handleSubmit: React.FormEventHandler<HTMLFormElement> = async event => {
        event.preventDefault()

        const data = new FormData(formRef.current!)

        if (!imageFile) {
            data.delete('image')
        }

        data.set('userColor', userColor)

        setIsLoading(true)

        const [response, postError] = await api.post('profile', data)

        if (!response) {
            setIsLoading(false)
            return setError(translateErrorMessage(String(postError)))
        }

        if (!response.success) {
            setIsLoading(false)
            setError(translateErrorMessage(response.message))

            return
        }

        user.setNickname(response.user.userNickname)
        user.setNicknameColor(response.user.userColor)
        user.setAvatarRes(response.user.userAvatarUrl || '')

        if (props.onUpdated) {
            props.onUpdated()
            return
        }

        setIsLoading(false)
    }

    const handleLogout = () => {
        ws.send('Auth-Logout', {
            userNickname: user.userNickname
        })

        deleteCookie('token')

        window.location.reload()
    }

    return (
        <>
            <form className="flex min-h-full flex-col gap-5" onSubmit={handleSubmit} ref={formRef}>
                {error ? (
                    <div className="rounded-2xl border border-rose-300/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">{translateErrorMessage(error)}</div>
                ) : null}
                <div className="self-center">
                    <ProfilePicture editable {...displayedImage} color={userColor} onChange={file => setImageFile(file)} />
                </div>
                <div className="flex items-center gap-3">
                    <Button
                        type="button"
                        variant="secondary"
                        size="icon"
                        className="relative overflow-hidden"
                        disabled={isLoading}
                        onClick={() => setNicknameColor(randomColor())}
                        aria-label={t('profile.changeNicknameColor')}
                    >
                        <span className="absolute inset-[6px] rounded-full border border-white/10" style={{ backgroundColor: userColor }} />
                        <Sparkles className="relative z-10 size-4 text-white" />
                    </Button>
                    <Input
                        disabled={isLoading}
                        placeholder={t('profile.nickname')}
                        name="userNickname"
                        value={nickname}
                        onChange={e => setNickname(e.target.value)}
                    />
                </div>
                <div className="lg:hidden">
                    <SettingsControls />
                </div>
                <div className="mt-auto flex flex-col gap-3">
                    <Button className="w-full" size="lg" type="submit" disabled={isLoading}>
                        {t('common.update')}
                    </Button>
                    <Button
                        className="w-full"
                        variant="outlineDanger"
                        disabled={isLoading}
                        onClick={() =>
                            globalModel.confirm({
                                title: t('profile.logoutTitle'),
                                content: t('profile.logoutContent'),
                                header: t('profile.logoutHeader'),
                                onConfirm: handleLogout
                            })
                        }
                    >
                        {t('profile.logout')}
                    </Button>
                </div>
            </form>
            <LoadingOverlay isLoading={isLoading} text={t('profile.saving')} zIndex={60} />
        </>
    )
}
