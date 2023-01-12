var https = require('https')
var fs = require('fs')
const path = require('path')
const { parse } = require('url')

const next = require('next')
const port = 3000
const dev = false
const app = next({ dev, dir: __dirname })
const handle = app.getRequestHandler()

var options = {
    key: fs.readFileSync('/etc/letsencrypt/live/game-club.click/privkey.pem'),
    cert: fs.readFileSync('/etc/letsencrypt/live/game-club.click/cert.pem')
}

app.prepare()
    .then(() => {
        https
            .createServer(options, (req, res) => {
                const parsedUrl = parse(req.url, true)
                handle(req, res, parsedUrl)
            })
            .listen(port, err => {
                if (err) throw err
                console.log(`> Ready on localhost:${port}`)
            })
    })
    .catch(e => console.log(e))
