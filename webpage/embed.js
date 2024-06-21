class embed {
	constructor(json, owner) {
		this.type = this.getType(json)
		this.owner = owner
		this.json = json
	}
	getType(json) {
		return json.type || "rich"
	}
	generateHTML() {
		switch (this.type) {
			case "rich":
				return this.generateRich()
			case "image":
				return this.generateImage()
			case "link":
				return this.generateLink()
			case "article":
				return this.generateArticle()
			default:
				console.warn(`unsupported embed type ${this.type}, please add support dev :3`,this.json)
				return document.createElement("div")//prevent errors by giving blank div
		}
	}
	generateRich() {
		const div = document.createElement("div")
		if (this.json.color) div.style.backgroundColor = "#" + this.json.color.toString(16)
		div.classList.add("embed-color")

		const embedElem = document.createElement("div")
		embedElem.classList.add("embed")
		div.append(embedElem)

		if (this.json.author) {
			const authorline = document.createElement("div")
			if (this.json.author.icon_url) {
				const img = document.createElement("img")
				img.classList.add("embedimg")
				img.crossOrigin = "anonymous"
				img.src = this.json.author.icon_url
				authorline.append(img)
			}

			const a = document.createElement("a")
			a.textContent = this.json.author.name
			if (this.json.author.url) a.href = this.json.author.url
			a.classList.add("username")
			authorline.append(a)
			embedElem.append(authorline)
		}

		if (this.json.title) {
			const title = document.createElement(this.json.url ? "a" : "span")
			title.textContent = this.json.title
			title.classList.add("embedtitle")
			if (this.json.url) title.href = this.json.url
			embedElem.append(title)
		}

		if (this.json.description) {
			const p = document.createElement("p")
			p.textContent = this.json.description
			embedElem.append(p)
		}

		if (this.json.fields) for (const field of this.json.fields) {
			const divField = document.createElement("div")

			const b = document.createElement("b")
			b.textContent = field.name
			divField.append(b)

			const p = document.createElement("p")
			p.textContent = field.value
			p.classList.add("embedp")
			divField.append(p)

			if (field.inline) divField.classList.add("inline")
			embedElem.append(divField)
		}

		if (this.json.footer || this.json.timestamp) {
			const footer = document.createElement("div")
			if (this.json.footer && this.json.footer.icon_url) {
				const img = document.createElement("img")
				img.crossOrigin = "anonymous"
				img.src = this.json.footer.icon_url
				img.classList.add("embedicon")
				footer.append(img)
			}

			if (this.json.footer && this.json.footer.text) {
				const span = document.createElement("span")
				span.textContent = this.json.footer.text
				span.classList.add("spaceright")
				footer.append(span)
			}

			if (this.json.footer && this.json.footer.text && this.json.timestamp) {
				const span = document.createElement("span")
				span.textContent = "•"
				span.classList.add("spaceright")
				footer.append(span)
			}

			if (this.json.timestamp) {
				const span = document.createElement("span")
				span.textContent = new Date(this.json.timestamp).toLocaleString()
				footer.append(span)
			}
			embedElem.append(footer)
		}

		return div
	}
	generateImage() {
		const img = document.createElement("img")
		img.classList.add("messageimg")
		img.onclick = () => {
			const full = new fullscreen(["img", img.src, ["fit"]])
			full.show()
		}
		img.crossOrigin = "anonymous"
		img.src = this.json.thumbnail.proxy_url
		return img
	}
	generateLink() {
		const table = document.createElement("table")
		table.classList.add("embed","linkembed")
		const trtop = document.createElement("tr")
		table.append(trtop)

		{
			const td = document.createElement("td")
			const a = document.createElement("a")
			a.href = this.json.url
			a.textContent = this.json.title
			td.append(a)
			trtop.append(td)
		}

		const tdImage = document.createElement("td")
		const img = document.createElement("img")
		img.classList.add("embedimg")
		img.onclick = () => {
			const full = new fullscreen(["img", img.src, ["fit"]])
			full.show()
		}
		img.crossOrigin = "anonymous"
		img.src = this.json.thumbnail.proxy_url
		tdImage.append(img)
		trtop.append(tdImage)

		const bottomtr = document.createElement("tr")
		const td = document.createElement("td")
		const span = document.createElement("span")
		span.textContent = this.json.description
		td.append(span)
		bottomtr.append(td)
		table.append(bottomtr)

		return table
	}
	generateArticle() {
		const colordiv = document.createElement("div")
		colordiv.style.backgroundColor = "#000000"
		colordiv.classList.add("embed-color")

		const div = document.createElement("div")
		div.classList.add("embed")
		const providor = document.createElement("p")
		providor.classList.add("provider")
		providor.textContent = this.json.provider.name
		div.append(providor)

		const a = document.createElement("a")
		a.href = this.json.url
		a.textContent = this.json.title
		div.append(a)

		const description = document.createElement("p")
		description.textContent = this.json.description
		div.append(description)

		const img = document.createElement("img")
		img.classList.add("bigembedimg")
		img.onclick = () => {
			const full = new fullscreen(["img", img.src, ["fit"]])
			full.show()
		}
		img.crossOrigin = "anonymous"
		img.src = this.json.thumbnail.proxy_url
		div.append(img)

		colordiv.append(div)
		return colordiv
	}
}
