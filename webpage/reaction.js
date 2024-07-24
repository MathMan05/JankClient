"use strict"

// eslint-disable-next-line no-unused-vars
class Reaction {
	constructor(json, owner) {
		this.owner = owner
		this.headers = this.owner.headers
		this.json = json
	}
	generateHTML() {
		const reactionContainer = document.createElement("div")
		reactionContainer.classList.add("reaction")

		if (this.json.me) reactionContainer.classList.add("me")

		if (this.json.emoji.id) {
			const img = document.createElement("img")
			img.crossOrigin = "anonymous"
			img.src = instance.cdn + "/emojis/" + this.json.emoji.id + ".png?size=16"
			img.width = 16
			img.height = 16
			img.alt = ""
			reactionContainer.appendChild(img)
		} else {
			const text = document.createElement("span")

			if (Object.values(emojis).some(e => e == this.json.emoji.name)) {
				console.warn("twemoji reaction found", this.json)
				text.textContent = this.json.emoji.name
			} else text.textContent = this.json.emoji.name

			reactionContainer.appendChild(text)
		}

		return reactionContainer
	}
}
