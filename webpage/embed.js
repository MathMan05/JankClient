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

		if (this.json.title) {
			const title = document.createElement("h3")
			title.textContent = this.json.title
			embedElem.append(title)
			embedElem.append(document.createElement("br"))
		}

		if (this.json.fields) for (const thing of this.json.fields) {
			const b = document.createElement("b")
			b.textContent = thing.name
			embedElem.append(b)
			embedElem.append(document.createElement("br"))
			const p = document.createElement("p")
			p.textContent = thing.value
			p.classList.add("embedp")
			embedElem.append(p)
		}

		if (this.json.footer) {
			const footer = document.createElement("div")
			if (this.json.footer.icon_url) {
				const img = document.createElement("img")
				img.src = this.json.footer.icon_url
				img.classList.add("embedicon")
				footer.append(img)
			}
			if (this.json.footer.text) {
				footer.append(this.json.footer.text)
			}
			embedElem.append(footer)
		}

		return div
	}
	generateImage() {
		const img = document.createElement("img")
		img.classList.add("messageimg")
		img.onclick = function() {
			const full = new fullscreen(["img",img.src,["fit"]])
			full.show()
		}
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
		{
			const td = document.createElement("td")
			const img = document.createElement("img")
			img.classList.add("embedimg")
			img.onclick = function() {
				const full = new fullscreen(["img",img.src,["fit"]])
				full.show()
			}
			img.src = this.json.thumbnail.proxy_url
			td.append(img)
			trtop.append(td)
		}
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
		img.onclick = function() {
			const full = new fullscreen(["img",img.src,["fit"]])
			full.show()
		}
		img.src = this.json.thumbnail.proxy_url
		div.append(img)

		colordiv.append(div)
		return colordiv
	}
}
