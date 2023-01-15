declare global {
    interface Window {
        hiddenSecrets?: {
            enableDevTools?: () => void
            disableDevTools?: () => void
        }
    }
}

export {}
