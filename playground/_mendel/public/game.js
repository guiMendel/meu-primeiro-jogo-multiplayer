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
            state.players[command.id].score = command.new_score
        },
        new_fruit_limit(command) {
            settings.fruit.limit = command.value
            console.log('[game]> Fruit limit value changed to ' + settings.fruit.limit)
            if (server_side) {
                while (Object.keys(state.fruits).length > settings.fruit.limit) {
                    remove_fruit({ id: Object.keys(state.fruits)[0] })
                }
            }
        },
        new_fruit_spawnFrequency(command) {
            settings.fruit.spawnFrequency = command.value
            console.log('[game]> Fruit frequency value changed to ' + settings.fruit.spawnFrequency)
            if (server_side && settings.fruit.spawning) {
                spawnFruits()
            }
        },
        new_fruit_moveFrequency(command) {
            settings.fruit.moveFrequency = command.value
            console.log('[game]> Fruit move frequency value changed to ' + settings.fruit.moveFrequency)
        },
        new_fruit_roamRate(command) {
            settings.fruit.roamRate = command.value
            console.log('[game]> Fruit roam rate value changed to ' + settings.fruit.moveFrequency)
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
        remove_fruit,
        move_fruit
    }
    const notifyForum = forum.subscribe('game', respondsTo)
    // console.log('[game]> Succesfully subscribed to forum')


    // armazena as informações do jogo
    const state = {
        remove(type, id) {
            delete this.coords[[this[type][id].x, this[type][id].y]]
            delete this[type][id]
        },
        // Registra uma nova entidade. Pode adicionar ela se ela nao existir, mas se ja existir avisa o erro e atualiza suas coordenadas
        add(type, id, content) {
            const container = this[type]
            if (!container) {
                console.log(`There is no "${type}" type registered in the state`)
                return
            }

            // Se ja existisse precisa atualizar as coordenadas ocupadas
            if (container[id]) {
                console.log(`Tentativa de adicionar novo "${type}" com ID "${id}" ja registrado`)
                delete this.coords[[container[id].x, container[id].y]]
            }
            container[id] = content

            // Registra a nova coordenada
            this.coords[[container[id].x, container[id].y]] = {
                type,
                id
            }
        },
        move(type, id, way, onCollide) {
            // console.log(this.coords)
            // Por padrao, colisoes lancam excecoes, impedindo o movimento
            if (!onCollide) {
                onCollide = (target) => { throw target }
            }

            const wayAliases = {
                up: 0,
                down: 1,
                left: 2,
                right: 3,
            }

            // Traduz o alias, se houver
            way = wayAliases[way] ?? way
            // Valida a direcao
            if (0 > way || way > 3) {
                console.log(`Direção "${way}" desconhecida ao tentar mover "${type} ${id}"`)
                return
            }

            const entity = this[type][id]
            // Usado para atualizar as coords
            const oldCoords = [entity.x, entity.y]

            const moveFunctions = [
                // up
                () => {
                    const moveResult = (settings._screen.height + entity.y - 1) % settings._screen.height
                    // Verifica por colisao
                    const collisionTarget = this.coords[[entity.x, moveResult]]
                    if (collisionTarget) onCollide(collisionTarget, { type, id })

                    entity.y = moveResult
                },
                // down
                () => {
                    const moveResult = (entity.y + 1) % settings._screen.height
                    // Verifica por colisao
                    const collisionTarget = this.coords[[entity.x, moveResult]]
                    if (collisionTarget) onCollide(collisionTarget, { type, id })

                    entity.y = moveResult
                },
                // left
                () => {
                    const moveResult = (settings._screen.width + entity.x - 1) % settings._screen.width
                    // Verifica por colisao
                    const collisionTarget = this.coords[[moveResult, entity.y]]
                    if (collisionTarget) onCollide(collisionTarget, { type, id })

                    entity.x = moveResult
                },
                // right
                () => {
                    const moveResult = (entity.x + 1) % settings._screen.width
                    // Verifica por colisao
                    const collisionTarget = this.coords[[moveResult, entity.y]]
                    if (collisionTarget) onCollide(collisionTarget, { type, id })

                    entity.x = moveResult
                }
            ]

            // Executa o movimento
            moveFunctions[way]()

            // Atualiza as coordenadas
            this.coords[[entity.x, entity.y]] = {
                type,
                id
            }

            // Libera a antiga posicao
            delete this.coords[oldCoords]
        },
        update(type, id, content) {
            // console.log([type, id, content])
            const container = this[type]
            if (!container) {
                console.log(`There is no "${type}" type registered in the state`)
                return
            }

            // Se nao existisse precisa criar
            if (!container[id]) {
                console.log(`Tentativa de atualizar entidade inexistente "${type} ${id}"`)
                container[id] = content
            }
            const oldCoords = [container[id].x, container[id].y]
            container[id] = content

            // Registra a nova coordenada
            this.coords[[container[id].x, container[id].y]] = {
                type,
                id
            }
            delete this.coords[oldCoords]
        },
        players: {},
        fruits: {},
        // Guarda coordenadas preenchidas. Armazena nelas que tipo de enteiade esta ocupando e sua id
        coords: {},
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
            limit: 1,
            moveFrequency: 500,
            spawnFrequency: 2000,
            roamRate: 0.5,
        },
        _screen: {
            width: 15,
            height: 15
        }
    }

    // Carrega o ID do timer que gera as frutas do mapa
    let spawnId = null

    // Define o resultado de uma colisao com fruta
    function fruitCollision(target, collider) {
        // Verifica se a colisao foi com fruta
        if (target.type !== 'fruits') throw target
        // So coleta a fruta no lado do servidor
        if (!server_side) {
            return
        }

        const player = state.players[collider.id]

        remove_fruit({ id: target.id })
        player.score += settings.fruit.value
        notifyForum({
            type: 'player_scored',
            id: player.id,
            new_score: player.score
        })
    }

    // Casa o nome da teclas que devem ter funcionalidade com o nome de suas respectivas funções. Aí é só chamar as funções com o próprio nome da tecla!
    const acceptedMoves = {
        // Utilizando a função mod, conseguimos implementar map wrap de amneira muito simples
        ArrowUp(player) {
            state.move('players', player.id, 'up', fruitCollision)
        },
        ArrowDown(player) {
            state.move('players', player.id, 'down', fruitCollision)
        },
        ArrowLeft(player) {
            state.move('players', player.id, 'left', fruitCollision)
        },
        ArrowRight(player) {
            state.move('players', player.id, 'right', fruitCollision)
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
        const id = command.id
        const receivedCoordinates = 'playerX' in command && 'playerY' in command
        const playerX = 'playerX' in command ? command.playerX : Math.floor(Math.random() * settings._screen.width)
        const playerY = 'playerY' in command ? command.playerY : Math.floor(Math.random() * settings._screen.height)
        // console.log(`> Adding ${id} at x:${playerX} y:${playerY}`)

        state.add('players', id, {
            id,
            x: playerX,
            y: playerY,
            score: 0
        })

        // somente notificamos se não houver recebido as coordenadas
        if (!receivedCoordinates) {
            notifyForum({
                type: 'add_player',
                id,
                playerX,
                playerY
            })
        }
    }

    function remove_player(command) {
        const id = command.id
        state.remove('players', id)

        notifyForum({
            type: 'remove_player',
            id,
        })
    }

    function add_fruit(command) {
        // Verifica se já não estourou o limite de frutas
        if (Object.keys(state.fruits).length >= settings.fruit.limit) {
            return
        }

        const id = command ? command.id : Math.floor(Math.random() * 10000000)
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

        // console.log(`[game]> Adding fruit ${id} at x:${fruitX} y:${fruitY}`)

        state.add('fruits', id, createFruit({
            fruit: {
                id: id, x: fruitX, y: fruitY,
            },
            app: {
                forum, server_side, settings, state
            }
        }))

        notifyForum({
            type: 'add_fruit',
            id,
            fruitX,
            fruitY
        })
    }

    function remove_fruit(command) {
        const id = command.id
        state.remove('fruits', id)

        notifyForum({
            type: 'remove_fruit',
            id
        })
    }

    function move_fruit(command) {
        if (server_side) return
        const fruit = state.fruits[command.id]
        if (!fruit) {
            console.log(`Fruit ${command.id} is still trying to move even after being removed`)
            return
        }
        state.update('fruits', command.id, {
            id: command.id,
            x: command.x,
            y: command.y,
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
        // console.log(`> Moving ${command.id} with ${command.keyPressed}`)
        // Implementação do design pattern: Command

        const moveFunction = acceptedMoves[command.keyPressed]
        const player = state.players[command.id]
        // importante se proteger bem em ambientes assíncronos!
        if (player && moveFunction != undefined) {
            try {
                moveFunction(player)
            } catch { }
        }
        // console.log(state.fruits)
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