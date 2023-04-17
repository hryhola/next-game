// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import logger from 'logger'
import type { NextApiRequest } from 'next'
import { GameCtors, GameName } from 'state/games'
import { parseForm } from 'util/formDataRequest'
import { GeneralFailure, GeneralSuccess, NextApiResponseUWS } from 'util/universalTypes'
import { LobbyJoiningResult } from 'state/lobby/Lobby'
import { InitialGameData, InitialGameDataProperty } from 'state/common/game/GameInitialData'
import formidable from 'formidable'
import path from 'path'

export type Request = FormData

export type Response =
    | (GeneralSuccess & {
          lobbyJoiningResult: LobbyJoiningResult
      })
    | GeneralFailure

export default async function handler(req: NextApiRequest, res: NextApiResponseUWS<Response>) {
    const token = req.cookies.token

    if (!token) {
        return res.status(400).json({
            success: false,
            message: 'Auth token is missing'
        })
    }

    const creator = res.socket.server.appState.users.getByToken(token)

    if (!creator) {
        return res.status(400).json({
            success: false,
            message: 'Invalid token: ' + token
        })
    }

    const [result, error] = await parseForm(req, 'lobby')

    if (error) {
        logger.error({ error }, 'Error during form parsing (lobby create)')

        return res.status(500).json({
            success: false,
            message: 'Error during form parsing' + String(error)
        })
    }

    const { fields, files } = result!

    if (!fields.lobbyId || Array.isArray(fields.lobbyId)) {
        return res.status(400).json({
            success: false,
            message: 'Lobby ID is not valid'
        })
    }

    if (!fields.gameName || Array.isArray(fields.gameName) || !(fields.gameName in GameCtors)) {
        return res.status(400).json({
            success: false,
            message: 'Game name is not valid'
        })
    }

    if (Array.isArray(fields.password)) {
        return res.status(400).json({
            success: false,
            message: 'Not correct password type'
        })
    }

    const { lobbies } = res.socket.server.appState

    if (lobbies.get(fields.lobbyId)) {
        return res.status(400).json({
            success: false,
            message: 'Lobby with this ID already exists'
        })
    }

    const { initialDataSchema } = GameCtors[fields.gameName as GameName]

    const initialGameData: InitialGameData = {}

    if (initialDataSchema) {
        Object.keys(files).forEach(fileName => {
            if (fileName.slice(0, 12) !== 'initialData-') {
                return
            }

            const dataName = fileName.slice(12)

            const propertySchema = initialDataSchema.find(propertySchema => propertySchema.name === dataName)

            if (!propertySchema) {
                return
            }

            const file = files[fileName] as formidable.File

            if (file.size === 0) {
                return
            }

            const fullPath = file.filepath
            const parsedPath = path.parse(fullPath)
            const fileRelativeUrl = 'res/lobby/' + parsedPath.base

            const propertyValue: InitialGameDataProperty = {
                public: propertySchema.public,
                value: fileRelativeUrl
            }

            initialGameData[dataName] = propertyValue
        })
    }

    try {
        const lobby = await lobbies.createLobby({
            id: fields.lobbyId,
            creator,
            gameName: fields.gameName as GameName,
            password: fields.password,
            initialGameData
        })

        const lobbyJoiningResult = lobby.join(creator, 'player')

        res.json({
            success: true,
            lobbyJoiningResult
        })
    } catch (error) {
        logger.error({ error }, 'Error during lobby creation: ' + (error instanceof Error ? error.message : '') + (error instanceof Error ? error.stack : ''))

        res.status(500).json({
            success: false,
            message: 'Error during lobby creation'
        })
    }
}

export const config = {
    api: {
        bodyParser: false
    }
}
