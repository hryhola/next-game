import JSZip from 'jszip'

export type JeopardyMedia = {
    Audio: Record<string, string>
    Images: Record<string, string>
    Video: Record<string, string>
}

export async function fetchPack(url: string) {
    const response = await fetch(url)

    const data = await response.arrayBuffer()

    return new Uint8Array(data)
}

async function processFile(file: JSZip.JSZipObject, prefix: 'Audio' | 'Images' | 'Video', container: JeopardyMedia): Promise<void> {
    if (!file.name.startsWith(prefix + '/')) return

    const fileBlob = await file.async('blob')

    const fileUrl = URL.createObjectURL(fileBlob)

    const fileName = decodeURI(file.name.slice(prefix.length + 1))

    container[prefix][fileName] = fileUrl
}

export async function getMediaFilesFromPack(jeopardyPack: Uint8Array): Promise<JeopardyMedia> {
    const zip = new JSZip()
    const contents = await zip.loadAsync(jeopardyPack)

    const mediaFiles: JeopardyMedia = {
        Audio: {},
        Images: {},
        Video: {}
    }

    const filePromises: Promise<void>[] = []

    for (const [, file] of Object.entries(contents.files)) {
        filePromises.push(processFile(file, 'Images', mediaFiles))
        filePromises.push(processFile(file, 'Audio', mediaFiles))
        filePromises.push(processFile(file, 'Video', mediaFiles))
    }

    await Promise.all(filePromises)

    return mediaFiles
}
