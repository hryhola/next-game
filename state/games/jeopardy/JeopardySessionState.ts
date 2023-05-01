export namespace JeopardyState {
    interface AbstractFrame {
        id: string
    }

    export interface PackThemesPreviewFrame extends AbstractFrame {
        packName: string
        author: string
        dateCreated: string
        themes: string[]
    }

    export type Frame = { id: 'none' } | PackThemesPreviewFrame
}

export type JeopardySessionState = {
    frame: JeopardyState.Frame
}
