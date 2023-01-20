const pino = require('pino')

/**
 * @type {import('pino').BaseLogger}
 */
let logger

if (process.env.NODE_ENV === 'production') {
    logger = pino({ level: 'info' }, pino.destination('./logs/prod.log'))
} else {
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
}

module.exports = logger
