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
        }
    }
    const notifyForum = forum.subscribe(`fruit_${id}`, respondsTo, true)

    function distance(a, b) {
        return Math.abs(b - a)
    }

    function move() {
        console.log(`before> x: ${x}, y: ${y}`)
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
        // Chance de se mover aleatoriamente
        if (Math.random() < settings.fruit.roamRate) {
            // Move aleatoriamente
            const direction = Math.floor(Math.random() * 4)
            moveFunctions[direction]()
        }
        else {
            // Encontra as coordenadas do jogador mais próximo
            let spookyX = 0
            let spookyY = 0
            let spookyDistance = 9999
            for (const player in state.players) {
                const playerDistance = distance(player.x, x) + distance(player.y, y)
                if (playerDistance < spookyDistance) {
                    spookyX = player.x
                    spookyY = player.y
                    spookyDistance = playerDistance
                }
            }
            if (distance(spookyX, x) < distance(spookyY, y)) {
                if (x > spookyX) moveFunctions[3]()
                else moveFunctions[2]()
            }
            else {
                if (y > spookyY) moveFunctions[0]()
                else moveFunctions[1]()
            }
        }
        console.log(`after> x: ${x}, y: ${y}`)

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