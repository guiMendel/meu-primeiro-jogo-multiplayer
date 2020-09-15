export default function createAdmin(app) {
    // Define as operações do administrador
    const element_list = {
        fruit_limit,
        fruit_frequency,
        fruit_spawn
    }
    linkDefinitions()

    // Se inscreve no forum
    const respondsTo = {
        setup_game(command) {
            Object.assign(app.state, command.new_state)
            Object.assign(app.settings, command.new_settings)
            console.log(app)
            updateFields()
        },
        new_fruit_limit(command) {
            app.settings.fruit_limit = command.value
            updateFields()
        },
        new_fruit_frequency(command) {
            app.settings.fruit_frequency = command.value
            updateFields()
        },
        new_fruit_spawn(command) {
            app.state.fruit_spawn = command.value
            updateFields()

        }
    }
    const notifyForum = app.forum.subscribe('admin', respondsTo)


    function linkDefinitions() {
        // Pega os elementos do documento especificados pela lista, armazena eles e cria um listener para o evento 'change'
        for (const definition in element_list) {
            const element = document.getElementById(definition)
            element_list[definition] = element

            element.addEventListener('change', (event) => {
                // Determina o que enviar no campo valor
                let value
                if (element.getAttribute('type') == 'checkbox') {
                    value = element.checked
                } else {
                    value = element.value
                }
                console.log(`[admin]> Update ${definition} value to ${value}`)
                notifyForum({
                    type: 'new_' + definition,
                    value
                })
            })
        }
        // Inicializa os campos
        updateFields()
    }

    function updateFields() {
        for (const definition in element_list) {
            const element = element_list[definition]
            if (element.getAttribute('type') == 'checkbox') {
                element.checked = app.settings[definition] ?? app.state[definition]
                console.log(app.state[definition])
            } else {
                element.value = app.settings[definition] ?? app.state[definition]
            }
        }
    }
}