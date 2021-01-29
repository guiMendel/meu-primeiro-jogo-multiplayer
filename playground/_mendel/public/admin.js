export default function createAdmin(app) {
    // Define as operações do administrador, como descritas na configuracao do jogo
    const settingsFields = {}
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
            app.settings.fruit.limit = command.value
            updateFields()
        },
        new_fruit_spawnFrequency(command) {
            app.settings.fruit.frequency = command.value
            updateFields()
        },
        new_fruit_spawning(command) {
            app.state.fruit.spawnFrequency = command.value
            updateFields()

        }
    }
    const notifyForum = app.forum.subscribe('admin', respondsTo)


    function linkDefinitions() {
        // Pega os elementos do documento especificados pela lista, armazena eles e cria um listener para o evento 'change'
        const settingsList = assembleSettingsList(app.settings)
        console.log(settingsList)
        for (const setting of settingsList) {

            const element = drawAdminField(setting)
            settingsFields[setting] = element

            element.addEventListener('change', (event) => {
                // Determina o que enviar no campo valor
                let value
                if (element.getAttribute('type') == 'checkbox') {
                    value = element.checked
                } else {
                    value = element.value
                }
                console.log(`[admin]> Update ${setting} value to ${value}`)
                notifyForum({
                    type: 'new_' + setting,
                    value
                })
            })
        }
        // Inicializa os campos
        updateFields()
    }

    function updateFields() {
        for (const definition in settingsFields) {
            const element = settingsFields[definition]
            // console.log(app)
            if (element.getAttribute('type') == 'checkbox') {
                element.checked = app.settings.get(definition) ?? app.state[definition]
            } else {
                element.value = app.settings.get(definition) ?? app.state[definition]
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
            console.log(value)
            for (const key of Object.keys(value)) {
                // Por convencao, configuracoes que comecam com underscore nao devem ser alteraveis e nao aparecem na lista
                if (key[0] == '_') continue
                list = list.concat(assembleSettingsList(value[key], path + key))
            }
            return list
        }
        return [path]
    }

    function drawAdminField(id) {
        const section = document.getElementById('admin_section')

        const field = document.createElement('div')
        field.classList.add('form-group')

        section.appendChild(field)

        const label = document.createElement('label')
        const input = document.createElement('input')

        const labelText = document.createTextNode(unCamelCase(id))
        label.appendChild(labelText)

        const treatments = {
            boolean() {
                input.classList.add('form-check-input')
                input.setAttribute('id', id)
                input.setAttribute('type', 'checkbox')

                label.classList.add('form-check-label')
                label.setAttribute('for', id)

                field.appendChild(label)
                field.appendChild(input)
            },
            number() {
                input.classList.add('form-control')
                input.setAttribute('id', id)
                input.setAttribute('type', 'number')

                label.setAttribute('for', id)

                field.appendChild(label)
                field.appendChild(input)
            },
        }

        treatments[typeof app.settings.get(id)]()

        return input
    }

    function unCamelCase(word) {
        return word
            // remove underscores
            .replace('_', ' ')
            // insert a space before all caps
            .replace(/([A-Z])/g, ' $1')
            // uppercase the first character
            .replace(/^.|\s./, function (str) { return str.toUpperCase(); })
            // uppercas other words
            .replace(/\s./, function (str) { return str.toUpperCase(); })
    }


}