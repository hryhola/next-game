#!/usr/bin/env node

import path from 'path'
import { buildPackFromDirectory, createBoilerplatePack } from './lib'

function printUsage() {
    console.log(`Usage:
  siq-cli boilerplate [targetDir]
  siq-cli build <sourceDir> [outputFile]
`)
}

export async function runCli(argv: string[]): Promise<number> {
    const [command, ...rest] = argv

    if (!command || command === '--help' || command === '-h') {
        printUsage()
        return 0
    }

    if (command === 'boilerplate') {
        const targetDir = path.resolve(rest[0] || 'my_pack')

        await createBoilerplatePack({
            targetDir
        })

        console.log(`Boilerplate pack created at ${targetDir}`)
        return 0
    }

    if (command === 'build') {
        if (!rest[0]) {
            printUsage()
            return 1
        }

        const sourceDir = path.resolve(rest[0])
        const outputFile = rest[1] ? path.resolve(rest[1]) : undefined
        const result = await buildPackFromDirectory({
            outputFile,
            sourceDir
        })

        console.log(`Built ${result.outputFile}`)
        return 0
    }

    printUsage()
    return 1
}

if (require.main === module) {
    runCli(process.argv.slice(2))
        .then(code => {
            process.exitCode = code
        })
        .catch(error => {
            console.error(error instanceof Error ? error.message : error)
            process.exitCode = 1
        })
}
