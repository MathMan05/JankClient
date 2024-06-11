class contextmenu {
	constructor(name) {
		this.name = name
		this.buttons = []
	}
	addbutton(text, onclick, img = null, shown = () => true) {
		this.buttons.push([text, onclick, img, shown])
		return {}
	}
	makemenu(x, y, addinfo, obj) {
		const div=document.createElement("table")
		div.classList.add("contextmenu")
		for (const thing of this.buttons) {
			if (!thing[3](addinfo)) continue
			const textb = document.createElement("tr")
			const intext = document.createElement("button")
			textb.button = intext
			intext.classList.add("contextbutton")
			intext.innerText = thing[0]
			textb.appendChild(intext)
			intext.onclick = thing[1].bind(addinfo, obj)
			div.appendChild(textb)
		}
		if (currentmenu != "") currentmenu.remove()

		div.style.top = y + "px"
		div.style.left = x + "px"
		document.body.appendChild(div)
		currentmenu = div
		return this.div
	}
	bind(obj,addinfo) {
		obj.addEventListener("contextmenu", event => {
			event.preventDefault()
			event.stopImmediatePropagation()
			this.makemenu(event.clientX, event.clientY, addinfo, obj)
		})
	}
}
