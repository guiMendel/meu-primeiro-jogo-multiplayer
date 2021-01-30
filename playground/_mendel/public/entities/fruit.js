// camada que descreve o comportamento das frutas
export default function createFruit({ fruit: { id, x, y }, app: { forum, server_side, settings, state } }) {
    // No lado do servidor acontecem as interacoes das frutas
    // Determina a frequencia que as frutas se movimentam
    let spawnId
    // Ainda não recebe mensagens pelo forum, portanto, passa um objeto vazio
    const respondsTo = {
        remove_fruit(command) {
            if (id == command.fruitId) {
                forum.unsubscribe(`fruit_${id}`, true)
                clearInterval(spawnId)
            }
        },
        new_fruit_moveFrequency(command) {
            if (server_side) {
                clearInterval(spawnId)
                spawnId = setInterval(move, command.value)
            }

        },
        new_fruit_roamRate(command) {
            if (server_side) {
                settings.fruit.roamRate = command.value
            }
        }
    }
    const notifyForum = forum.subscribe(`fruit_${id}`, respondsTo, true)

    function distance(a, b, borderLimit) {
        // console.log(`Order before: ${[a, b]}`);
        // Garante que a seja menor que b
        if (a > b) [a, b] = [b, a]
        // console.log(`Order after: ${[a, b]}`);
        const innerDistance = b - a
        // Calcula as distancias considerando o wrap do mapa (dist de a ate o comeco e de b ate o fim)
        const outerDistance = (a) + (borderLimit - b)
        // console.log(`Distances: ${[innerDistance, outerDistance]}`)
        return [innerDistance, outerDistance]
    }

    function move() {
        // console.log(`before> x: ${x}, y: ${y}`)
        const moveFunctions = [
            () => {
                y = (settings._screen.height + y - 1) % settings._screen.height
            },
            () => {
                y = (y + 1) % settings._screen.height
            },
            () => {
                x = (settings._screen.width + x - 1) % settings._screen.width
            },
            () => {
                x = (x + 1) % settings._screen.width
            }
        ]
        // Chance de se mover aleatoriamente (ou se nao houver jogadores)
        if (Math.random() < settings.fruit.roamRate || Object.keys(state.players).length === 0 && state.players.constructor === Object) {
            // Move aleatoriamente
            const direction = Math.floor(Math.random() * 4)
            moveFunctions[direction]()
        }
        else {
            // Encontra as coordenadas do jogador mais próximo
            let spookyX = 0
            let spookyY = 0
            let spookyDistance = 9999
            let distancesX
            let distancesY
            for (const player of Object.values(state.players)) {
                distancesX = distance(player.x, x, settings._screen.width)
                distancesY = distance(player.y, y, settings._screen.height)
                const playerDistance = Math.min(...distancesX) + Math.min(...distancesY)
                // console.log(distancesX)
                // console.log(distancesY)
                // console.log(`Player distance: ${playerDistance}`)
                if (playerDistance < spookyDistance) {
                    spookyX = player.x
                    spookyY = player.y
                    spookyDistance = playerDistance
                }
            }
            // console.log(`Distances: x>${distance(spookyX, x, settings._screen.width)} y>${distance(spookyY, y, settings._screen.height)}\nPlayer: distance>${spookyDistance} x>${spookyX} y> ${spookyY}\nFruit: x>${x} y>${y}`)
            // Encontra o eixo de prioridade
            if (Math.min(...distancesX) < Math.min(...distancesY)) {
                // COLOCAR PARA ELE IR PARA A DIRECAO QUE MAXIMIZA A DISTANCIA
                if (
                    // Esta a direita e a distancia interna eh menor
                    x >= spookyX && distancesX[0] <= distancesX[1] ||
                    // Esta a esquerda e a distancia externa eh menor
                    x <= spookyX && distancesX[0] >= distancesX[1]
                ) moveFunctions[3]()
                else moveFunctions[2]()
            }
            else {
                if (// Esta a baixo e a distancia interna eh menor
                    y >= spookyY && distancesY[0] <= distancesY[1] ||
                    // Esta a cima e a distancia externa eh menor
                    y <= spookyY && distancesY[0] >= distancesY[1]
                ) moveFunctions[1]()
                else moveFunctions[0]()
            }
        }
        // console.log(`after> x: ${x}, y: ${y}`)

        notifyForum({
            type: 'move_fruit',
            fruitId: id,
            x,
            y
        })
    }

    if (server_side) {
        spawnId = setInterval(move, settings.fruit.moveFrequency)
    }

    return {
        id, x, y
    }
}