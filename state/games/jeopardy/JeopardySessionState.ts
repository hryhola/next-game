export namespace JeopardyState {
    interface AbstractFrame {
        id: string
    }

    export interface PackThemesPreviewFrame extends AbstractFrame {
        themes: string[]
    }

    export type Frame = { id: 'none' } | PackThemesPreviewFrame
}

export type JeopardySessionState = {
    frame: JeopardyState.Frame
}
