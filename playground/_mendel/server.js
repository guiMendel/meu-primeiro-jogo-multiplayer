import express from 'express'
import http from 'http'
import path from 'path'
import fs from 'fs'
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

// Define quais eventos, ao serem recebidos, devem ser propagados pelo forum
const propagate_events = [
    'move_player'
]
// Quais somente devem ser propagados se recebidos por um admin
const propagate_admin_events = [
    'new_fruit_limit',
    'new_fruit_spawnFrequency',
    'new_fruit_spawn'
]
// Senha para acesso como administrador
const passcode = 135

// Implementação do padrão de projeto: Event Emmiter
sockets.on('connection', (socket) => {
    socket.emit('setup', { state: game.state, settings: game.settings })
    const playerId = socket.id
    let admin = false
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

    // Espera pela tentativa de acesso do administrador
    socket.on('access_request', (message) => {
        console.log(`[server]> Player ${playerId} requesting admin access...`)
        // Ve se ja e admin
        if (admin) {
            socket.emit('access_granted')
            console.log(`[server]> Player ${playerId} is already an admin`)
            return
        }
        if (message.passcode == passcode) {
            console.log(`[server]> Passcode is correct. Granting admin access to player ${playerId}`)
            // Lê o arquivo que contém as funções de admin
            fs.readFile('admin.html', (error, data) => {
                if (error) {
                    console.log('[server]> ERROR: Failed to load admin file!')
                } else {
                    socket.emit('access_granted', { data })
                    admin = true
                    enableAdminPrivilege(socket, playerId)
                }
            })
        } else {
            socket.emit('access_denied')
            console.log(`[server]> Passcode is incorrect. Admin access denied to player ${playerId}`)
        }
    })
    // 
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

server.listen(3000, () => {
    console.log('[server]> Server listening on port: 3000')
})

function enableAdminPrivilege(socket, playerId) {
    // Permite que o usuário propague eventos de administrador
    for (const event of propagate_admin_events) {
        socket.on(event, (command) => {
            command.playerId = playerId
            command.type = event

            // Notifica os outros jogadores deste evento
            sockets.emit(event, command)

            // Atualiza o estado interno do jogo pelo forum
            notifyForum(command)
        })
    }
}