// camada que descreve o comportamento das frutas
export default function createFruit(id, x, y, forum, serverSide) {
    // No lado do servidor acontecem as interacoes das frutas
    // Ainda não recebe mensagens pelo forum, portanto, passa um objeto vazio
    const respondsTo = {
        remove_fruit(command) {
            if (id == fruitId) {
                forum.unsubscribe()
            }
        }
    }
    const notifyForum = forum.subscribe(`fruit_${id}`, respondsTo)

    if (serverSide) {

    }

    return {
        id, x, y
    }
}