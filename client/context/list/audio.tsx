import React, { createContext, useRef, useEffect } from 'react'

export const AudioCtx = createContext({
    play: async (_route: string) => {}
})

interface Props {
    children?: JSX.Element
}

export const AudioProvider: React.FC<Props> = props => {
    const context = useRef<AudioContext | null>(null)
    const soundsMap = useRef(new Map<string, AudioBuffer>())

    useEffect(() => {
        context.current = new window.AudioContext()

        return () => {
            context.current?.close()
        }
    }, [])

    const play = async (fileName: string) => {
        if (!context.current) {
            context.current = new window.AudioContext()
        }

        if (!soundsMap.current.has(fileName)) {
            const audioBuffer = await fetch(`/sounds/${fileName}`)
                .then(response => response.arrayBuffer())
                .then(arrayBuffer => context.current!.decodeAudioData(arrayBuffer))
                .catch(error => {
                    console.error(error)
                })

            if (audioBuffer) {
                soundsMap.current.set(fileName, audioBuffer)
            } else {
                return
            }
        }

        const audio = soundsMap.current.get(fileName)

        if (!audio) return

        const source = context.current.createBufferSource()
        source.buffer = audio
        source.connect(context.current.destination)
        source.start()
    }

    return <AudioCtx.Provider value={{ play }}>{props.children}</AudioCtx.Provider>
}
