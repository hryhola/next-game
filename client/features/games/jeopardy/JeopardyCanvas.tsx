import React, { useState } from 'react'
import { Box } from '@mui/material'
import { JeopardyThemesPreview } from './frames/JeopardyThemesPreview'
import { useJeopardyAction } from './JeopardyView'

type JeopardyCanvasProps = {
    isPackLoading: boolean
}

export const JeopardyCanvas: React.FC<JeopardyCanvasProps> = props => {
    const [currFrame, setCurrFrame] = useState(<></>)

    useJeopardyAction('$ThemesPreview', data => {
        if (!data.result.success) return

        setCurrFrame(<JeopardyThemesPreview themes={data.result.themes} />)
    })

    if (props.isPackLoading) {
        return <></>
    }

    return currFrame
    // return <JeopardyThemesPreview themes={[ "Literally me", "Вентелятори", "Стрімер по сміху", "Коти", "Мультфільм по пісні", "Гриби", "Що було далі?", "Конспірологія", "GeoGuesser", "Етимологія", "Чорна магія", "Гомосексуалізм", "Караоке", "Доктори", "Політика", "Математика", "Надлюди", "Мовознавство", "Міфологія", "Зброя середньовіччя", "Філософія", "Французький живопис 18 століття", "Давньогрецька філософія на мові оригіналу", "Квантова фізика", "Історія стародавнього Китаю", "Класична музикальна теорія", "Теорія кольору", "Математична логіка", "Аніме" ]} />
}
