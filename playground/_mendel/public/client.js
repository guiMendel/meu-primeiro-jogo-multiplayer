// módulos
import createGame from './game.js'
import createKeyboardListener from './keyboard-listener.js'
import createGraphics from './graphics.js'
import createForum from './integration.js'
export default function createClient() {
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

    // Define quais eventos, ao serem recebidos, devem ser propagados pelo forum
    const propagate_events = [
        'add_player',
        'remove_player',
        'move_player',
        'add_fruit',
        'remove_fruit',
        'player_scored'
    ]
    for (const event of propagate_events) {
        // console.log(event)
        socket.on(event, (command) => {
            // console.log(`[network]> Propagating event ${event}`)
            if (!command.sourceId || command.sourceId !== playerId) {
                notifyForum(command)
            }
        })
    }

    // Retorna o forum e as configurações, utilizados pelo administrador
    return {
        forum,
        state: game.state,
        settings: game.settings
    }
}