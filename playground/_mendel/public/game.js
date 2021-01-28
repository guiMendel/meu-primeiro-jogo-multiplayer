// camada de jogo (dados + lógica)
import createFruit from './entities/fruit.js'
// Implementação do design pattern: Factory
export default function createGame(forum, server_side = false) {
    // Interação com o forum
    const respondsTo = {
        setup_game(command) {
            console.log('[game]> Received new state')
            Object.assign(state, command.new_state)
            Object.assign(settings, command.new_settings)
        },
        player_scored(command) {
            // Será executada do lado do cliente, enviada pelo servidor
            // console.log('[game]> Atualizando pontuação')
            // console.log(command)
            state.players[command.playerId].score = command.new_score
        },
        new_fruit_limit(command) {
            settings.fruit.limit = command.value
            console.log('[game]> Fruit limit value changed to ' + settings.fruit.limit)
            if (server_side) {
                while (Object.keys(state.fruits).length > settings.fruit.limit) {
                    remove_fruit({ fruitId: Object.keys(state.fruits)[0] })
                }
            }
        },
        new_fruit_spawnFrequency(command) {
            settings.fruit.spawnFrequency = command.value
            console.log('[game]> Fruit frequency value changed to ' + settings.fruit.spawnFrequency)
            if (server_side) {
                spawnFruits()
            }
        },
        new_fruit_spawning(command) {
            if (server_side) {
                if (command.value) {
                    console.log('[game]> Resumed spawning fruits')
                    spawnFruits()
                }
                else {
                    console.log('[game]> Stopped spawning fruits')
                    clearInterval(spawnId)
                    settings.fruit.spawning = false
                }
            }
        },
        move_player,
        add_player,
        remove_player,
        add_fruit,
        remove_fruit
    }
    const notifyForum = forum.subscribe('game', respondsTo)
    // console.log('[game]> Succesfully subscribed to forum')


    // armazena as informações do jogo
    const state = {
        players: {},
        fruits: {},
    }

    const settings = {
        // Atributos (e seus filhos) que comecam com _ nao sao alteraveis pelos admins
        // Metodo que retorna a configuracao numa sintaxe de underscore em vez de pontos
        get(setting) {
            // Pega os campos numa lista
            const fields = setting.split('_')
            // Inicia a variavel de coleta com o proprio objeto settings
            let result = this
            // Vai entrando em cada campo
            for (const field of fields) {
                result = result[field]
            }
            return result
        },
        fruit: {
            spawning: true,
            value: 10,
            limit: 30,
            moveFrequency: 500,
            spawnFrequency: 2000,
        },
        _screen: {
            width: 15,
            height: 15
        }
    }

    // Carrega o ID do timer que gera as frutas do mapa
    let spawnId = null

    // Casa o nome da teclas que devem ter funcionalidade com o nome de suas respectivas funções. Aí é só chamar as funções com o próprio nome da tecla!
    const acceptedMoves = {
        // Utilizando a função mod, conseguimos implementar map wrap de amneira muito simples
        ArrowUp(player) {
            player.y = (settings._screen.height + player.y - 1) % settings._screen.height
        },
        ArrowDown(player) {
            player.y = (player.y + 1) % settings._screen.height
        },
        ArrowLeft(player) {
            player.x = (settings._screen.width + player.x - 1) % settings._screen.width
        },
        ArrowRight(player) {
            player.x = (player.x + 1) % settings._screen.width
        }
    }
    // Define os "aliases"
    Object.assign(acceptedMoves, {
        w(player) {
            acceptedMoves.ArrowUp(player)
        },
        a(player) {
            acceptedMoves.ArrowLeft(player)
        },
        s(player) {
            acceptedMoves.ArrowDown(player)
        },
        d(player) {
            acceptedMoves.ArrowRight(player)
        }
    })

    function add_player(command) {
        const playerId = command.playerId
        const receivedCoordinates = 'playerX' in command && 'playerY' in command
        const playerX = 'playerX' in command ? command.playerX : Math.floor(Math.random() * settings._screen.width)
        const playerY = 'playerY' in command ? command.playerY : Math.floor(Math.random() * settings._screen.height)
        // console.log(`> Adding ${playerId} at x:${playerX} y:${playerY}`)

        state.players[playerId] = {
            playerId,
            x: playerX,
            y: playerY,
            score: 0
        }

        // somente notificamos se não houver recebido as coordenadas
        if (!receivedCoordinates) {
            notifyForum({
                type: 'add_player',
                playerId,
                playerX,
                playerY
            })
        }
    }

    function remove_player(command) {
        const playerId = command.playerId
        delete state.players[playerId]

        notifyForum({
            type: 'remove_player',
            playerId,
        })
    }

    function add_fruit(command) {
        // Verifica se já não estourou o limite de frutas
        if (Object.keys(state.fruits).length >= settings.fruit.limit) {
            return
        }

        const fruitId = command ? command.fruitId : Math.floor(Math.random() * 10000000)
        let fruitX = command ? command.fruitX : Math.floor(Math.random() * settings._screen.width)
        let fruitY = command ? command.fruitY : Math.floor(Math.random() * settings._screen.height)

        // Verifica se já existe uma fruta nesse local
        let position_conflict = true
        let tries = 0
        while (position_conflict && tries < 5) {
            position_conflict = false
            for (const id in { ...state.fruits, ...state.players }) {
                const entity = state.fruits[id] ?? state.players[id]
                if (fruitX == entity.x && fruitY == entity.y) {
                    // console.log('[game] Tried spawning fruit in an occupied spot')
                    tries++
                    position_conflict = true
                    fruitX = Math.floor(Math.random() * settings._screen.width)
                    fruitY = Math.floor(Math.random() * settings._screen.height)
                    break
                }
            }
        }
        if (tries == 5) {
            return
        }

        // console.log(`[game]> Adding fruit ${fruitId} at x:${fruitX} y:${fruitY}`)

        state.fruits[fruitId] = createFruit(fruitId, fruitX, fruitY, forum, server_side)

        notifyForum({
            type: 'add_fruit',
            fruitId,
            fruitX,
            fruitY
        })
    }

    function remove_fruit(command) {
        const fruitId = command.fruitId
        delete state.fruits[fruitId]

        notifyForum({
            type: 'remove_fruit',
            fruitId
        })
    }

    function spawnFruits() {
        settings.fruit.spawning = true
        // Limita o máximo de frutas para o tamanho da tela
        if (spawnId) clearInterval(spawnId)
        settings.fruit.limit = Math.min(settings.fruit.limit, settings._screen.width * settings._screen.height)
        spawnId = setInterval(add_fruit, settings.fruit.spawnFrequency)
    }

    function move_player(command) {
        // console.log(`> Moving ${command.playerId} with ${command.keyPressed}`)
        // Implementação do design pattern: Command

        const moveFunction = acceptedMoves[command.keyPressed]
        const player = state.players[command.playerId]
        // importante se proteger bem em ambientes assíncronos!
        if (player && moveFunction != undefined) {
            moveFunction(player)
            checkForFruitCollision(command.playerId)
        }
    }

    function checkForFruitCollision(playerId) {
        const player = state.players[playerId]

        for (const fruitId in state.fruits) {
            const fruit = state.fruits[fruitId]
            // console.log(`> Verifying collision between ${playerId} and ${fruitId}...`)
            if (player.x === fruit.x && player.y === fruit.y) {
                // console.log(`> Collision detected!`)
                remove_fruit({ fruitId })
                player.score += settings.fruit.value
                notifyForum({
                    type: 'player_scored',
                    playerId,
                    new_score: player.score
                })
            }
        }
    }

    return {
        acceptedMoves,
        add_player,
        remove_player,
        add_fruit,
        remove_fruit,
        spawnFruits,
        move_player,
        state,
        settings
    }
}