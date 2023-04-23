import fs from 'fs'
import path from 'path'
import JSZip from 'jszip'

export const unzip = async (targetPath: string, outputDirPath: string): Promise<boolean> => {
    await fs.promises.mkdir(outputDirPath, { recursive: true })

    const data: Buffer = await fs.promises.readFile(targetPath)
    const zip = new JSZip()
    const contents = await zip.loadAsync(data)

    const processEntry = async (entryName: string): Promise<void> => {
        const entry = contents.files[entryName]
        const decodedEntryName = decodeURI(entryName)
        const filePath = path.join(outputDirPath, decodedEntryName)

        if (entry.dir) {
            await fs.promises.mkdir(filePath, { recursive: true })
        } else {
            const parentDir = path.dirname(filePath)
            await fs.promises.mkdir(parentDir, { recursive: true }).catch(error => {
                if (error.code !== 'EEXIST') {
                    throw error
                }
            })

            const content: Buffer = await entry.async('nodebuffer')
            await fs.promises.writeFile(filePath, content)
        }
    }

    const entryNames: string[] = Object.keys(contents.files)
    await Promise.all(entryNames.map(processEntry))

    return true
}

export const findFileInJSZip = (zip: JSZip, fileName: string): string | null => {
    const entryNames = Object.keys(zip.files)
    const contentXmlEntry = entryNames.find(entryName => entryName === fileName)
    return contentXmlEntry || null
}
