export namespace JeopardyState {
    export interface PackThemesPreviewFrame {
        id: 'pack-themes-preview'
        packName: string
        author: string
        dateCreated: string
        themes: string[]
    }

    export interface RoundPreviewFrame {
        id: 'rounds-preview'
        text: string
        isRoundName: boolean
    }

    export type Frame = { id: 'none' } | PackThemesPreviewFrame | RoundPreviewFrame
}

export type JeopardySessionState = {
    frame: JeopardyState.Frame
}
