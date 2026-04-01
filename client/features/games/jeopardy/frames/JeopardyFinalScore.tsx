import React from 'react'
import { Grid, Typography } from 'client/ui/mui-shim'
import type { RealtimeJeopardyState } from 'shared/contracts/jeopardy'
import { useI18n } from 'client/context/list'

export const FinalScore: React.FC<RealtimeJeopardyState.FinalScoreFrame> = props => {
    const { t } = useI18n()

    return (
        <Grid
            sx={{ pt: 'calc(var(--playersHeaderHeight) + 10px)', paddingBottom: 7, transition: '0.5s' }}
            display="grid"
            justifyContent="center"
            alignContent="center"
            width="100vw"
            minHeight="var(--fullHeight)"
        >
            <Grid sx={{ textAlign: 'center' }} item>
                <Typography align="center">{t('jeopardy.winner')}</Typography>
                <Typography variant="h1" align="center">
                    🎉{props.winner.userNickname}🎉
                </Typography>
                {props.winner.userAvatarUrl ? <img src={props.winner.userAvatarUrl} alt={t('image.alt.winnerPicture')} /> : <></>}
            </Grid>
        </Grid>
    )
}
