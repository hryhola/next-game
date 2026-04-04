/** @jest-environment jsdom */

import { render, waitFor } from '@testing-library/react'
import React from 'react'
import { GameCtx, type GameCtxValue } from 'client/features/games/common/GameFactory'
import { JeopardyCanvas } from './JeopardyCanvas'
import type { JeopardyInitialData } from 'shared/contracts/app'
import { fetchPack, getMediaFilesFromPack } from './utils/jeopardyPackLoading'

jest.mock('./utils/jeopardyPackLoading', () => ({
    fetchPack: jest.fn(),
    getMediaFilesFromPack: jest.fn()
}))

const fetchPackMock = fetchPack as jest.MockedFunction<typeof fetchPack>
const getMediaFilesFromPackMock = getMediaFilesFromPack as jest.MockedFunction<typeof getMediaFilesFromPack>

function createGameValue(initialData: JeopardyInitialData, sessionPhase = 'none'): GameCtxValue {
    return {
        initialData,
        isLoading: false,
        isSessionStarted: true,
        players: [],
        session: {
            frame: {
                id: sessionPhase
            },
            isPaused: false
        }
    }
}

describe('JeopardyCanvas', () => {
    beforeEach(() => {
        fetchPackMock.mockResolvedValue(new Uint8Array([1, 2, 3]))
        getMediaFilesFromPackMock.mockResolvedValue({
            Audio: {},
            Images: {},
            Video: {}
        })
    })

    afterEach(() => {
        fetchPackMock.mockReset()
        getMediaFilesFromPackMock.mockReset()
    })

    it('does not reload the pack when live snapshots replace initialData with the same pack url', async () => {
        const setIsPackLoading = jest.fn()
        const firstGame = createGameValue({
            pack: {
                public: true,
                value: 'https://cdn.example.com/pack.zip'
            }
        })

        const view = render(
            <GameCtx.Provider value={firstGame}>
                <JeopardyCanvas isPackLoading={false} setIsPackLoading={setIsPackLoading} />
            </GameCtx.Provider>
        )

        await waitFor(() => {
            expect(fetchPackMock).toHaveBeenCalledTimes(1)
        })

        const snapshotGame = createGameValue({
            pack: {
                public: true,
                value: 'https://cdn.example.com/pack.zip'
            }
        })

        view.rerender(
            <GameCtx.Provider value={snapshotGame}>
                <JeopardyCanvas isPackLoading={false} setIsPackLoading={setIsPackLoading} />
            </GameCtx.Provider>
        )

        await waitFor(() => {
            expect(fetchPackMock).toHaveBeenCalledTimes(1)
        })

        expect(setIsPackLoading).toHaveBeenCalledTimes(2)
        expect(setIsPackLoading).toHaveBeenNthCalledWith(1, true)
        expect(setIsPackLoading).toHaveBeenNthCalledWith(2, false)
    })
})
