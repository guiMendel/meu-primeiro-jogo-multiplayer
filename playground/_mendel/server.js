import express from 'express'
import http from 'http'
import path from 'path'
import createGame from './public/game.js'
import socketio from 'socket.io'
import createForum from './public/integration.js'

// camada de rede
const app = express()
const server = http.createServer(app)
const sockets = socketio(server)
const forum = createForum()
const game = createGame(forum, true)
game.spawnFruits()

app.use(express.static('public'))

const notifyForum = forum.subscribe('server', (command) => {
    console.log(`[server]> Emitting ${command.type}`)
    sockets.emit(command.type, command)
})

// Implementação do padrão de projeto: Event Emmiter
sockets.on('connection', (socket) => {
    socket.emit('setup', {state: game.state, settings: game.settings})
    const playerId = socket.id
    console.log(`[server]> Player connected with id: ${playerId}`)

    notifyForum({ type: 'add_player', playerId })
    // game.addPlayer( {playerId: playerId} )
    // console.log(game.state)
    
    socket.on('disconnect', (socket) => {
        notifyForum({
            type: 'remove_player',
            playerId
        })
        console.log(`[server]> Player disconnected: ${playerId}`)
    })

    // Define quais eventos, ao serem recebidos, devem ser propagados pelo forum
    const propagate_events = [
        'move_player',
        'new_fruit_limit',
        'new_fruit_frequency',
        'new_fruit_spawn'
    ]
    for (const event of propagate_events) {
        // console.log(event)
        socket.on(event, (command) => {
            command.playerId = playerId
            command.type = event

            // Notifica os outros jogadores deste evento
            sockets.emit(event, command)

            // Atualiza o estado interno do jogo pelo forum
            notifyForum(command)
        })
    }
})

// conexões admin
// senha de administrador
const passcode = 135
app.use(express.urlencoded({ extended: true }))
// verifica se a senha enviada bate com a configurada. Se sim, o cliente recebe a página de administrador!
app.post('/', (req, res) => {
    const __dirname = path.resolve(path.dirname(''));
    let fileName

    const options = {
        root: path.join(__dirname),
    }
    
    if (req.body.passcode == passcode) {
        fileName = 'admin.html'
    } else {
        res.append('Warning', 'Invalid passcode')
        fileName = 'public/index.html'
    }

    res.sendFile(fileName, options)
})


server.listen(3000, () => {
    console.log('[server]> Server listening on port: 3000')
})