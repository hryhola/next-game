import { ProfilePicture } from 'client/features/profile-picture/ProfilePicture'
import { Button, Dialog, DialogActions, DialogContent, DialogTitle } from 'client/ui/mui-shim'
import type { ReadyCheckMember } from 'shared/contracts/app'
import { useI18n } from 'client/context/list'

type Props = {
    open?: boolean
    members: ReadyCheckMember[]
    voted?: boolean
    onReady?: () => void
    onNotReady?: () => void
}

export const ReadyCheckDialog: React.FC<Props> = ({ open = true, members, voted = false, onReady, onNotReady }) => {
    const { t } = useI18n()

    return (
        <Dialog open={open}>
            <DialogContent className="flex w-[min(92vw,34rem)] max-w-[34rem] flex-col gap-6 p-6">
                <DialogTitle className="text-center">{t('readyCheck.title')}</DialogTitle>
                <div className="flex flex-wrap items-center justify-center gap-4">
                    {members.map(member => (
                        <div key={member.id} title={member.userNickname} className="shrink-0">
                            <ProfilePicture
                                size={90}
                                plain
                                color={member.userColor}
                                url={member.userAvatarUrl}
                                {...(member.ready === true
                                    ? {
                                          filter: "url('#teal-lightgreen')"
                                      }
                                    : {})}
                                {...(member.ready === false
                                    ? {
                                          filter: "url('#cherry-icecream')"
                                      }
                                    : {})}
                            />
                        </div>
                    ))}
                </div>
                <DialogActions className="mt-0 justify-center" sx={{ visibility: voted ? 'hidden' : 'visible' }}>
                    <Button color="success" onClick={onReady}>
                        {t('readyCheck.ready')}
                    </Button>
                    <Button color="error" onClick={onNotReady}>
                        {t('readyCheck.notReady')}
                    </Button>
                </DialogActions>
            </DialogContent>
        </Dialog>
    )
}
