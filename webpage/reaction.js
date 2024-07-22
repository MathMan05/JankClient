"use strict"

// eslint-disable-next-line no-unused-vars
class Reaction {
	constructor(json, owner) {
		this.owner = owner
		this.headers = this.owner.headers
		this.json = json
	}
	generateHTML() {
		const reactionContainer = document.createElement("button")

		if (this.json.id) {
			const img = document.createElement("img")
			img.crossOrigin = "anonymous"
			img.src = instance.cdn + "/emojis/" + this.json.id + ".png?size=32"
			img.width = 32
			img.height = 32
			img.alt = ""
			reactionContainer.append(img)
		} else {
			const text = document.createElement("span")

			if (Object.values(emojis).findIndex(e => e == this.json.name) != -1) {
				console.warn("twemoji reaction found", emoji)
				text.textContent = this.json.name
			} else text.textContent = this.json.name

			reactionContainer.append(text)
		}

		return reactionContainer
	}
}
