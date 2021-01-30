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
    let id
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
        'move_fruit'
    ]
    for (const event of propagate_to_forum) {
        // Transmite do servidor para os amiguinhos locais
        socket.on(event, (command) => {
            if (!command.sourceId || command.sourceId !== id) {
                notifyForum(command)
            }
        })
    }

    const respondsTo = {
        // Envia o movimento para o servidor
        move_player(command) {
            if (command.keyPressed in game.acceptedMoves) {
                // Utilizado para evitar repetir o comando com o retorno do servidor
                command['sourceId'] = id
                // console.log('[network]> Emmiting command to server')
                socket.emit(command.type, command)
            }
        }
    }

    // Funcao que cria a lista de campos alteraveis pelo admin a partir das configuracoes do jogo
    function assembleSettingsList(value, path = '') {
        // Descarta se for uma funcao
        if (typeof value === 'function') return []
        // Continua a recursao se for outro objeto
        if (typeof value === 'object' && value !== null) {
            // Adiciona underscore entre os campos
            if (path !== '') path = path + '_'

            let list = []
            // console.log(value)
            for (const key of Object.keys(value)) {
                // Por convencao, configuracoes que comecam com underscore nao devem ser alteraveis e nao aparecem na lista
                if (key[0] == '_') continue
                list = list.concat(assembleSettingsList(value[key], path + key))
            }
            return list
        }
        return [path]
    }

    const adminPowers = assembleSettingsList(game.settings)

    // Se prepara para propagar os comandos de admin
    for (const setting of adminPowers) {
        // Transmite para o servidor
        respondsTo['new_' + setting] = (command) => {
            // console.log(`[network]> Emmiting command ${setting} to server`)
            command['sourceId'] = id
            socket.emit(command.type, command)
        }
        // Transmite do servidor para os amiguinhos locais
        socket.on('new_' + setting, (command) => {
            console.log(`[network]> Propagating new setting ${setting}`)
            if (!command.sourceId || command.sourceId !== id) {
                notifyForum(command)
            }
        })
    }

    const notifyForum = forum.subscribe('network', respondsTo)

    socket.on('connect', () => {
        id = socket.id
        console.log(`[network]> Player connected to Client with id: ${id}`)
    })

    socket.on('setup', (setup) => {
        console.log(`[network]> Receiving "setup" from server...`)
        // console.log(setup)
        keyboardListener.registerid(id)
        graphics = createGraphics(forum, document, game, id, requestAnimationFrame)
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
            settings: game.settings,
            settingsList: adminPowers
        })

        // Quando desconectar, reseta a pagina
        socket.on('disconnect', () => {
            alert('Server restarted.\nResetting page')
            location.reload()
        })

    })
    socket.on('access_denied', () => {
        console.log('[network]> Admin access denied!')
    })
}