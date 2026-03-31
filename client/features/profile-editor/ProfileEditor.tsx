import { useWS, useUser } from 'client/context/list'
import React, { useState, useRef } from 'react'
import { LoadingOverlay } from 'client/ui'
import { api } from 'client/network-utils/api'
import { ProfilePicture } from '../profile-picture/ProfilePicture'
import randomColor from 'randomcolor'
import { deleteCookie } from 'cookies-next'
import { useGlobalModal } from '../global-modal/GlobalModal'
import { Button, Input } from 'client/ui/primitives'
import { Sparkles } from 'lucide-react'

interface Props {
    onUpdated?: () => void
}

export const ProfileEditor: React.FC<Props> = props => {
    const globalModel = useGlobalModal()

    const formRef = useRef<HTMLFormElement | null>(null)

    const user = useUser()
    const ws = useWS()

    const [nickname, setNickname] = useState(user.userNickname)
    const [userColor, setNicknameColor] = useState(user.userColor)
    const [imageFile, setImageFile] = useState<File | null>(null)

    const [error, setError] = useState('')
    const [isLoading, setIsLoading] = useState(false)

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

        const [response, postError] = await api.post('profile', data).finally(() => setIsLoading(false))

        if (!response) {
            return setError(String(postError))
        }

        if (!response.success) {
            setError(response.message)

            return
        }

        user.setNickname(response.user.userNickname)
        user.setNicknameColor(response.user.userColor)
        user.setAvatarRes(response.user.userAvatarUrl || '')

        if (props.onUpdated) {
            props.onUpdated()
        }
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
                {error ? <div className="rounded-2xl border border-rose-300/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">{error}</div> : null}
                <div className="self-center">
                    <ProfilePicture editable {...displayedImage} color={userColor} onChange={file => setImageFile(file)} />
                </div>
                <div className="flex items-center gap-3">
                    <Button
                        type="button"
                        variant="secondary"
                        size="icon"
                        className="relative overflow-hidden"
                        onClick={() => setNicknameColor(randomColor())}
                        aria-label="Change nickname color"
                    >
                        <span className="absolute inset-[6px] rounded-full border border-white/10" style={{ backgroundColor: userColor }} />
                        <Sparkles className="relative z-10 size-4 text-white" />
                    </Button>
                    <Input placeholder="Nickname" name="userNickname" value={nickname} onChange={e => setNickname(e.target.value)} />
                </div>
                <div className="mt-auto flex flex-col gap-3">
                    <Button className="w-full" size="lg" type="submit">
                        Update
                    </Button>
                    <Button
                        className="w-full"
                        variant="outlineDanger"
                        onClick={() =>
                            globalModel.confirm({
                                title: 'Log out',
                                content: "You won't be able to login into this profile again",
                                header: 'Are you sure want to logout?',
                                onConfirm: handleLogout
                            })
                        }
                    >
                        Log out
                    </Button>
                </div>
            </form>
            <LoadingOverlay isLoading={isLoading} />
        </>
    )
}
