const pino = require('pino')

/**
 * @type {import('pino').BaseLogger}
 */
let logger

if (process.env.NODE_ENV === 'production') {
    logger = pino({}, pino.destination('./logs/prod.log'))
} else {
    logger = pino(
        {
            transport: {
                target: 'pino-pretty',
                options: {
                    colorize: true
                }
            }
        },
        pino.destination(process.stdout)
    )
}

module.exports = logger
