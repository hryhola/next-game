import React, { createContext, useRef, useEffect, useState } from 'react'

type AudioStopOptions = {
    fadeMs?: number
}

type AudioCtxValue = {
    play: (fileName: string) => Promise<void>
    setVolume: (value: number) => void
    stop: (fileName: string, options?: AudioStopOptions) => void
    toggleMute: () => void
    volume: number
}

type ActiveAudioSource = {
    gainNode: GainNode
    source: AudioBufferSourceNode
    stopTimeoutId: ReturnType<typeof setTimeout> | null
}

export const AudioCtx = createContext<AudioCtxValue>({
    play: async () => {},
    setVolume: () => {},
    stop: () => {},
    toggleMute: () => {},
    volume: NaN
})

interface Props {
    children?: React.ReactNode
}

export const AudioProvider: React.FC<Props> = props => {
    const context = useRef<AudioContext | null>(null)
    const gain = useRef<GainNode | null>(null)
    const soundsMap = useRef(new Map<string, AudioBuffer>())
    const activeSounds = useRef(new Map<string, Set<ActiveAudioSource>>())

    const [volume, setVolumeState] = useState(50)
    const prevVolume = useRef(volume)

    const ensureAudioGraph = () => {
        if (!context.current) {
            context.current = new window.AudioContext()
        }

        if (!gain.current) {
            gain.current = context.current.createGain()
            gain.current.gain.value = 0.5
            gain.current.connect(context.current.destination)
        }
    }

    const clearTrackedSource = (fileName: string, trackedSource: ActiveAudioSource) => {
        if (trackedSource.stopTimeoutId) {
            clearTimeout(trackedSource.stopTimeoutId)
        }

        const activeByFile = activeSounds.current.get(fileName)

        if (activeByFile) {
            activeByFile.delete(trackedSource)

            if (activeByFile.size === 0) {
                activeSounds.current.delete(fileName)
            }
        }

        try {
            trackedSource.source.disconnect()
        } catch (_error) {}

        try {
            trackedSource.gainNode.disconnect()
        } catch (_error) {}
    }

    useEffect(() => {
        ensureAudioGraph()

        return () => {
            activeSounds.current.forEach(activeByFile => {
                activeByFile.forEach(activeSource => {
                    if (activeSource.stopTimeoutId) {
                        clearTimeout(activeSource.stopTimeoutId)
                    }

                    try {
                        activeSource.source.stop()
                    } catch (_error) {}
                })
            })
            activeSounds.current.clear()
            context.current?.close()
        }
    }, [])

    const play = async (fileName: string) => {
        ensureAudioGraph()

        if (!context.current || !gain.current) {
            return
        }

        if (context.current.state === 'suspended') {
            await context.current.resume().catch(() => null)
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
        const sourceGain = context.current.createGain()

        source.buffer = audio
        sourceGain.gain.value = 1
        source.connect(sourceGain)
        sourceGain.connect(gain.current)

        const trackedSource: ActiveAudioSource = {
            gainNode: sourceGain,
            source,
            stopTimeoutId: null
        }
        const activeByFile = activeSounds.current.get(fileName) || new Set<ActiveAudioSource>()

        activeByFile.add(trackedSource)
        activeSounds.current.set(fileName, activeByFile)
        source.onended = () => clearTrackedSource(fileName, trackedSource)

        source.start()
    }

    const stop = (fileName: string, options?: AudioStopOptions) => {
        if (!context.current) {
            return
        }

        const activeByFile = activeSounds.current.get(fileName)

        if (!activeByFile?.size) {
            return
        }

        const fadeMs = Math.max(0, options?.fadeMs || 0)

        activeByFile.forEach(trackedSource => {
            const stopNow = () => {
                try {
                    trackedSource.source.stop()
                } catch (_error) {
                    clearTrackedSource(fileName, trackedSource)
                }
            }

            if (fadeMs === 0) {
                stopNow()
                return
            }

            const now = context.current!.currentTime
            const currentValue = trackedSource.gainNode.gain.value

            trackedSource.gainNode.gain.cancelScheduledValues(now)
            trackedSource.gainNode.gain.setValueAtTime(currentValue, now)
            trackedSource.gainNode.gain.linearRampToValueAtTime(0, now + fadeMs / 1000)
            trackedSource.stopTimeoutId = setTimeout(stopNow, fadeMs)
        })
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
                stop,
                toggleMute,
                volume
            }}
        >
            {props.children}
        </AudioCtx.Provider>
    )
}

export const useAudio = () => {
    return React.useContext(AudioCtx)
}
