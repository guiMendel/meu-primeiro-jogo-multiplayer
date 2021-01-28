// camada que descreve o comportamento das frutas
export default function createFruit(id, x, y, forum, serverSide) {
    // No lado do servidor acontecem as interacoes das frutas
    // Determina a frequencia que as frutas se movimentam
    let spawnId
    // Ainda não recebe mensagens pelo forum, portanto, passa um objeto vazio
    const respondsTo = {
        remove_fruit(command) {
            if (id == command.fruitId) {
                forum.unsubscribe(`fruit_${id}`, true)
            }
        }
    }
    const notifyForum = forum.subscribe(`fruit_${id}`, respondsTo, true)

    // if (serverSide) {
    //     spawnId = setInterval(move, settings.fruit_spawnFrequency)

    // }

    return {
        id, x, y
    }
}