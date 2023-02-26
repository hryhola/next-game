import React, { createContext, useRef, useEffect, useState } from 'react'

export const AudioCtx = createContext({
    play: async (_route: string) => {},
    setVolume: (_value: number) => {},
    toggleMute: () => {},
    volume: NaN
})

interface Props {
    children?: JSX.Element
}

export const AudioProvider: React.FC<Props> = props => {
    const context = useRef<AudioContext | null>(null)
    const gain = useRef<GainNode | null>(null)
    const soundsMap = useRef(new Map<string, AudioBuffer>())

    const [volume, setVolumeState] = useState(50)
    const prevVolume = useRef(volume)

    useEffect(() => {
        context.current = new window.AudioContext()
        gain.current = context.current.createGain()
        gain.current.gain.value = 0.5
        gain.current.connect(context.current.destination)

        return () => {
            context.current?.close()
        }
    }, [])

    const play = async (fileName: string) => {
        if (!context.current) {
            context.current = new window.AudioContext()
            gain.current = context.current.createGain()
            gain.current.gain.value = 0.5
            gain.current.connect(context.current.destination)
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
        // source.connect(context.current.destination)
        source.connect(gain.current!).connect(context.current.destination)

        source.start()
    }

    const setVolume = (value: number) => {
        if (!gain.current) return

        gain.current.gain.value = value / 100

        setVolumeState(value)
    }

    const toggleMute = () => {
        if (!gain.current) return

        if (gain.current.gain.value === 0) {
            gain.current.gain.value = prevVolume.current / 100
            setVolumeState(prevVolume.current)
        } else {
            prevVolume.current = volume
            gain.current.gain.value = 0
            setVolumeState(0)
        }
    }

    return (
        <AudioCtx.Provider
            value={{
                play,
                setVolume,
                toggleMute,
                volume
            }}
        >
            {props.children}
        </AudioCtx.Provider>
    )
}
