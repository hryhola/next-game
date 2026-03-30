import { useUser } from 'client/context/list'
import { Button } from 'client/ui/primitives'
import { UserRound } from 'lucide-react'
import { cn } from 'client/ui/lib/cn'

function ProfilePicture() {
    const user = useUser()

    if (user.userAvatarUrl) {
        return (
            <>
                <div className="flex size-10 items-center justify-center bg-white/5">
                    <img className="size-full object-contain" src={user.userAvatarUrl} alt="profile avatar" />
                </div>
            </>
        )
    }

    return <UserRound className="size-10" style={{ color: user.userColor }} />
}

export const ProfilePreview: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement>> = props => {
    const user = useUser()

    return (
        <Button variant="ghost" className={cn('h-auto gap-3 rounded-full px-3 py-2 text-left', props.className)} type={props.type ?? 'button'} {...props}>
            <span className="text-sm font-semibold" style={{ color: user.userColor }}>
                {user.userNickname}
            </span>
            <ProfilePicture />
        </Button>
    )
}
