const fs = require('fs')
const logger = require('./logger')

let certPath
let keyPath

if (fs.existsSync('cert/cert.pem') && fs.existsSync('cert/key.pem')) {
    certPath = 'cert/cert.pem'
    keyPath = 'cert/key.pem'
} else {
    certPath = '/etc/letsencrypt/live/game-club.click/cert.pem'
    keyPath = '/etc/letsencrypt/live/game-club.click/privkey.pem'
}

logger.debug('SSL cert path: ' + certPath)
logger.debug('SSL key path: ' + keyPath)

module.exports.certPath = certPath
module.exports.keyPath = keyPath
