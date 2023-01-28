const pino = require('pino')

/**
 * @type {import('pino').BaseLogger}
 */
let logger

if (process.env.NODE_ENV === 'development') {
    logger = pino(
        {
            level: 'debug',
            transport: {
                target: 'pino-pretty',
                options: {
                    colorize: true
                }
            }
        },
        pino.destination(process.stdout)
    )
} else {
    logger = pino({ level: 'info' }, pino.destination('./logs/prod.log'))
}

module.exports = logger
