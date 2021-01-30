export default function createAdmin(app) {
    // Define as operações do administrador, como descritas na configuracao do jogo
    const settingsFields = {}

    // Se inscreve no forum
    const respondsTo = {
        setup_game(command) {
            Object.assign(app.state, command.new_state)
            Object.assign(app.settings, command.new_settings)
            // console.log(app)
            updateFields()
        }
    }
    let notifyForum
    linkDefinitions()


    function linkDefinitions() {
        // Tira os elementos ja presentes
        for (const field of Object.keys(settingsFields)) {
            console.log(settingsFields[field])
            settingsFields[field].remove()
            delete settingsFields[field]
        }
        // Se inscreve no forum com essas configuracoes
        for (const setting of app.settingsList) {
            respondsTo['new_' + setting] = (command) => {
                console.log(setting)
                app.settings.fruit[setting] = command.value
                updateFields()
            }
        }
        notifyForum = app.forum.subscribe('admin', respondsTo)
        // console.log(app.settingsList)
        for (const setting of app.settingsList) {

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