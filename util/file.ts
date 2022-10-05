import fs from 'fs'
import path from 'path'

export const getFilesList = (folderPath = __dirname) => {
    const entries = fs.readdirSync(folderPath, { withFileTypes: true })

    const files = entries.filter(file => !file.isDirectory()).map(file => ({ ...file, path: path.join(folderPath, file.name) }))

    const folders = entries.filter(folder => folder.isDirectory())

    for (const folder of folders) {
        files.push(...getFilesList(path.join(folderPath, folder.name)))
    }

    return files
}

export const getApiHandlerRelativePath = (filePath: string) => {
    const dirname = path.join(__dirname, '../../../../uws/api')

    return filePath.substring(dirname.length + 1, filePath.length - 3)
}
