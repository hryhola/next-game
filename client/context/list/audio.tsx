import React, { useState, createContext, useRef } from 'react'

export const AudioContext = createContext({
    play: async (_route: string) => {}
})

interface Props {
    children?: JSX.Element
}

export const AudioProvider: React.FC<Props> = props => {
    const soundsMap = useRef(new Map<string, AudioBuffer>())

    const play = async (fileName: string) => {
        const context = new window.AudioContext()

        if (!soundsMap.current.has(fileName)) {
            const audioBuffer = await fetch(`/sounds/${fileName}`)
                .then(response => response.arrayBuffer())
                .then(arrayBuffer => context.decodeAudioData(arrayBuffer))
                .catch(error => {
                    console.error(error)
                })

            if (audioBuffer) {
                soundsMap.current.set(fileName, audioBuffer)
            }
        }

        const audio = soundsMap.current.get(fileName)

        if (!audio) return

        const source = context.createBufferSource()
        source.buffer = audio
        source.connect(context.destination)
        source.start()
    }

    return <AudioContext.Provider value={{ play }}>{props.children}</AudioContext.Provider>
}
