import path from 'path'
import fs from 'fs'
import yauzl, { Entry } from 'yauzl'

export const unzip = async (targetPath: string, outputDirPath: string) => {
    await fs.promises.mkdir(outputDirPath, { recursive: true })

    return new Promise((resolve, reject) =>
        yauzl.open(targetPath, { lazyEntries: true }, (error, zipFile) => {
            if (error) {
                zipFile?.close()

                throw new Error('Failed to unzip ' + targetPath)
            }

            zipFile.on('entry', async (entry: Entry) => {
                const isDir = /\/$/.test(entry.fileName)

                if (isDir) {
                    const dirPath = path.join(outputDirPath, entry.fileName)

                    await fs.promises.mkdir(dirPath)

                    zipFile.readEntry()

                    return
                }

                zipFile.openReadStream(entry, async (fileReadingError, readingStream) => {
                    if (fileReadingError) {
                        zipFile.close()

                        reject(fileReadingError)

                        return
                    }

                    const archiveFilePath = entry.fileName.split('/').map(str => decodeURI(str))

                    const pathWithinCurrentDir = path.join(outputDirPath, ...archiveFilePath)

                    const dirsListWithinArchive = archiveFilePath.slice(0, -1)

                    if (dirsListWithinArchive.length) {
                        const dirsPathWithinCurrentDir = path.join(outputDirPath, ...archiveFilePath.slice(0, -1))

                        await fs.promises.mkdir(dirsPathWithinCurrentDir).catch(error => {
                            if (error.code !== 'EEXIST') {
                                zipFile.close()

                                return reject(error)
                            }
                        })
                    }

                    const file = fs.createWriteStream(pathWithinCurrentDir)

                    readingStream.pipe(file)

                    file.on('finish', () => {
                        file.close(() => {
                            zipFile.readEntry()
                        })

                        file.on('error', fileError => {
                            zipFile.close()

                            reject(fileError)
                        })
                    })
                })
            })

            zipFile.on('end', () => {
                resolve(true)
            })

            zipFile.on('error', archiveReadingError => {
                zipFile.close()

                reject(archiveReadingError)
            })

            zipFile.readEntry()
        })
    )
}
