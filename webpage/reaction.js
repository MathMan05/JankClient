"use strict"

// eslint-disable-next-line no-unused-vars
class Reaction {
	constructor(json, owner) {
		this.owner = owner
		this.headers = this.owner.headers
		this.json = json

		if (this.json.user_id == this.owner.localuser.user.id) this.json.me = true
		if (!this.json.count) this.json.count = 1
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

			const twEmoji = emojiRegex.exec(this.json.emoji.name)
			if (twEmoji) {
				const alt = twEmoji[0]
				const icon = twEmoji[1]
				const variant = twEmoji[2]

				if (variant != "\uFE0E") {
					const img = document.createElement("img")
					img.crossOrigin = "anonymous"
					img.src = "https://cdnjs.cloudflare.com/ajax/libs/twemoji/15.0.3/72x72/" +
						MarkDown.toCodePoint(icon.length == 3 && icon.charAt(1) == "\uFE0F" ? icon.charAt(0) + icon.charAt(2) : icon) + ".png"
					img.width = 22
					img.height = 22
					img.alt = "Emoji: " + Object.keys(emojis)[Object.values(emojis).findIndex(e => e == alt)]

					text.textContent = this.json.count
					text.appendChild(img)
				}
			} else text.textContent = this.json.count + " " + this.json.emoji.name

			reactionContainer.appendChild(text)
		}

		return reactionContainer
	}
}
