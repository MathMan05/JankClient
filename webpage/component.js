"use strict"

const buttonStyles = {
	1: "primary",
	2: "secondary",
	3: "success",
	4: "danger",
	5: "url"
}

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
					elem = this.generateButton(component)
					break
				case 3:
				case 5:
				case 6:
				case 7:
				case 8:
					elem = this.generateSelect(component)
					break
				default:
					console.warn("Unsupported component type " + component.type, component)
			}

			if (elem) actionrow.append(elem)
		})

		return actionrow
	}
	generateButton(component) {
		const buttonElement = document.createElement("button")

		if (component.disabled) buttonElement.disabled = true
		if (component.style) buttonElement.classList.add("b-" + buttonStyles[component.style])

		if (component.emoji) {
			if (component.emoji.id) {
				const img = document.createElement("img")
				img.crossOrigin = "anonymous"
				img.src = instance.cdn + "/emojis/" + component.emoji.id + ".png"
				img.alt = ""
				buttonElement.append(img)
			} else {
				const text = document.createElement("span")
				text.textContent = component.emoji.name

				buttonElement.append(text)
			}
		}

		if (component.label) {
			const text = document.createElement(component.url ? "a" : "span")
			text.textContent = component.label

			if (component.url) {
				text.href = component.url
				text.target = "_blank"
				text.rel = "noopener noreferrer"
			}

			buttonElement.append(text)
		}

		return buttonElement
	}
	generateSelect(component) {
		const buttonElement = document.createElement("button")
		buttonElement.classList.add("select")

		if (component.disabled) buttonElement.disabled = true

		if (component.placeholder) {
			const text = document.createElement("span")
			text.textContent = component.placeholder

			buttonElement.append(text)
		}

		if (component.options) {
			const optionContainer = document.createElement("div")
			component.options.forEach(option => {
				const optionElement = document.createElement("div")

				const label = document.createElement("p")
				label.textContent = option.label
				optionElement.append(label)

				if (option.description) {
					const description = document.createElement("p")
					description.textContent = option.description
					optionElement.append(description)
				}
			})
			buttonElement.append(optionContainer)
		}

		return buttonElement
	}
}
