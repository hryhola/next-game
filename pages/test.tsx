import { Box, Container } from '@mui/material'
import { GetServerSideProps, NextPage } from 'next'
import { useEffect, useRef, useState } from 'react'
import { NextApiResponseUWS } from 'util/universalTypes'
import JSZip from 'jszip'

type MediaFiles = {
    Audio: Record<string, string>
    Images: Record<string, string>
    Video: Record<string, string>
}

async function processFile(file: JSZip.JSZipObject, prefix: 'Audio' | 'Images' | 'Video', mediaFiles: MediaFiles): Promise<void> {
    if (file.name.startsWith(prefix + '/')) {
        const fileBlob = await file.async('blob')
        const fileUrl = URL.createObjectURL(fileBlob)
        const fileName = decodeURI(file.name.slice(prefix.length + 1))
        mediaFiles[prefix][fileName] = fileUrl
    }
}

async function getMediaFilesFromZip(file: Uint8Array): Promise<MediaFiles> {
    const zip = new JSZip()
    const contents = await zip.loadAsync(file)
    const mediaFiles: MediaFiles = {
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

async function fetchZip(url: string) {
    const response = await fetch(url)
    const data = await response.arrayBuffer()
    return new Uint8Array(data)
}

async function getImagesFromZip(zipData: Uint8Array) {
    const zip = new JSZip()
    const loadedZip = await zip.loadAsync(zipData)
    const imagePromises: Promise<Blob>[] = []

    loadedZip.forEach((relativePath, file) => {
        if (file.name.match(/\.(png|jpg|jpeg|gif|bmp)$/i)) {
            imagePromises.push(file.async('blob'))
        }
    })

    const images = await Promise.all(imagePromises)
    return images.map((img, i) => {
        const url = URL.createObjectURL(img)
        const fileName = loadedZip.file(String(i))?.name
        return { fileName, url }
    })
}
function displayMediaFiles(mediaFiles: MediaFiles): void {
    const container = document.getElementById('media-container')

    if (!container) {
        throw new Error('Container element not found')
    }

    container.innerHTML = ''

    for (const [type, files] of Object.entries(mediaFiles)) {
        for (const [fileName, fileUrl] of Object.entries(files)) {
            const element = document.createElement('div')
            element.className = 'media-item'
            element.innerHTML = `<strong>${fileName}</strong>`

            if (type === 'Images') {
                const img = document.createElement('img')
                img.src = fileUrl
                img.alt = fileName
                img.width = 200
                element.appendChild(img)
            } else if (type === 'Audio' || type === 'Video') {
                const media = document.createElement(type.toLowerCase())
                media.setAttribute('controls', 'controls')
                media.setAttribute('src', fileUrl)
                element.appendChild(media)
            }

            container.appendChild(element)
        }
    }
}

type Props = {}

const Admin: NextPage<Props> = props => {
    const [isLoaded, setIsLoaded] = useState(false)

    useEffect(() => {
        ;(async () => {
            const zipUrl = '/res/lobby/56fe6bd7-112f-4828-9aa8-feca75276071-Solyanka_by_jumg.siq'
            const zipData = await fetchZip(zipUrl)
            const media = await getMediaFilesFromZip(zipData)
            displayMediaFiles(media)
            console.log(media)
        })()
    }, [])

    return <div id="media-container"></div>
}

export const getServerSideProps: GetServerSideProps = async context => {
    const props: Props = {}

    return {
        props
    }
}

export default Admin
