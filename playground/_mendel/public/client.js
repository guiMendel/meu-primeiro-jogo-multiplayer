// módulos
import createGame from './game.js'
import createKeyboardListener from './keyboard-listener.js'
import createGraphics from './graphics.js'
import createForum from './integration.js'
import createAdmin from './admin.js'
export default function createClient(document) {
    // sistema central de comunicação entre camadas no front end
    const forum = createForum()
    // camada jogo
    const game = createGame(forum)
    // camada input
    const keyboardListener = createKeyboardListener(forum, document)
    // camada de rede
    const socket = io()
    let playerId
    // camada apresentação
    let graphics

    // Define quais eventos, ao serem recebidos do servidor, devem ser propagados pelo forum
    const propagate_to_forum = [
        'add_player',
        'remove_player',
        'move_player',
        'add_fruit',
        'remove_fruit',
        'player_scored',
        'new_fruit_limit',
        'new_fruit_spawnFrequency',
        'new_fruit_spawning'
    ]
    // Define quais mensagens recebidas pelo forum devem ser transmitidas ao servidor
    const transmit_to_server = [
        'new_fruit_limit',
        'new_fruit_spawnFrequency',
        'new_fruit_spawning'
    ]

    const respondsTo = {
        // Envia o movimento para o servidor
        move_player(command) {
            if (command.keyPressed in game.acceptedMoves) {
                // Utilizado para evitar repetir o comando com o retorno do servidor
                command['sourceId'] = playerId
                // console.log('[network]> Emmiting command to server')
                socket.emit(command.type, command)
            }
        }
    }
    // Adiciona as transmissões definidas pela lista
    for (const message of transmit_to_server) {
        respondsTo[message] = (command) => {
            // console.log(`[network]> Emmiting command ${message} to server`)
            command['sourceId'] = playerId
            socket.emit(command.type, command)
        }
    }
    // console.log(respondsTo)
    const notifyForum = forum.subscribe('network', respondsTo)
    // console.log('[network]> Succesfully subscribed to forum')

    socket.on('connect', () => {
        playerId = socket.id
        console.log(`[network]> Player connected to Client with id: ${playerId}`)
    })

    socket.on('setup', (setup) => {
        console.log(`[network]> Receiving "setup" from server...`)
        console.log(setup)
        keyboardListener.registerPlayerId(playerId)
        graphics = createGraphics(forum, document, game, playerId, requestAnimationFrame)
        graphics.renderScreen()
        // Propaga a mensagem pelo forum
        notifyForum({
            type: 'setup_game',
            new_state: setup.state,
            new_settings: setup.settings
        })
    })

    // Espera pelo preenchimento do campo de senha de acesso
    const passcode_field = document.getElementById('admin_passcode')
    const admin_section = document.getElementById('admin_section')
    let admin = null
    let adminPasscode
    if (!passcode_field) {
        console.log(`[network]> Couldn't access passcode field!`)
    }
    passcode_field.addEventListener('change', () => {
        adminPasscode = passcode_field.value
        console.log('[network]> Requesting admin access to server...')
        socket.emit('access_request', {
            type: 'access_request',
            passcode: adminPasscode
        })
    })
    socket.on('access_granted', (message) => {
        if (admin) {
            console.log('[network]> Admin access was already granted.')
            return

        }
        console.log('[network]> Admin access granted!')
        notifyForum({
            type: 'admin_granted'
        })
        // Traduz o html recebido para texto normal
        // Ativa a função de administrador
        admin = createAdmin({
            forum,
            state: game.state,
            settings: game.settings
        })

        // Quando desconectar, reseta a pagina
        let reconnecting = false
        socket.on('disconnect', () => {
            if (reconnecting) return
            reconnecting = true
            console.log('[network]> Reconnecting...')
            alert('Server restarted.\nRequesting admin with same passcode...')

            socket.emit('access_request', {
                type: 'access_request',
                passcode: adminPasscode
            })
            socket.on('access_denied', () => {
                console.log('[network]> Admin access denied!')
                location.reload()
            })

            reconnecting = false

        })

    })
    socket.on('access_denied', () => {
        console.log('[network]> Admin access denied!')
    })

    for (const event of propagate_to_forum) {
        // console.log(event)
        socket.on(event, (command) => {
            // console.log(`[network]> Propagating event ${event}`)
            if (!command.sourceId || command.sourceId !== playerId) {
                notifyForum(command)
            }
        })
    }
}