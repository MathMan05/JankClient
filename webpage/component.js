"use strict"

// eslint-disable-next-line no-unused-vars
class Component {
	constructor(json, owner) {
		this.type = this.getType(json)
		this.owner = owner
		this.json = json
	}
	generateHTML() {
		const actionrow = document.createElement("div")
		actionrow.classList.add("actionrow")

		this.json.components.forEach(component => {
			let elem

			switch (component.type) {
				case 2:
					elem = this.generateButton()
					break
				case 3:
				case 5:
				case 6:
				case 7:
				case 8:
					elem = this.generateSelect()
					break
				default:
					console.warn("Unsupported component type " + component.type, component)
			}

			if (elem) actionrow.append(elem)
		})

		return actionrow
	}
	generateButton() {
		const buttonElement = document.createElement("button")

		return buttonElement
	}
	generateSelect() {
		const buttonElement = document.createElement("button")

		return buttonElement
	}
}
