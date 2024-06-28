"use strict"

class Contextmenu {
	static setup() {
		Contextmenu.currentmenu = ""
		document.addEventListener("click", event => {
			if (Contextmenu.currentmenu == "") {
				return
			}
			if (!Contextmenu.currentmenu.contains(event.target)) {
				Contextmenu.currentmenu.remove()
				Contextmenu.currentmenu = ""
			}
		})
	}
	constructor() {
		this.buttons = []
	}
	addbutton(text, onclick, img = null, shown = () => true, enabled = () => true) {
		this.buttons.push([text, onclick, img, shown, enabled])
		return {}
	}
	makemenu(x, y, addinfo, obj) {
		const div = document.createElement("table")
		div.classList.add("contextmenu")
		for (const button of this.buttons) {
			if (!button[3](addinfo)) continue
			const textb = document.createElement("tr")
			const intext = document.createElement("button")
			intext.disabled = !button[4]()
			textb.button = intext
			intext.classList.add("contextbutton")
			intext.textContent = button[0]
			textb.appendChild(intext)
			intext.onclick = button[1].bind(addinfo, obj)
			div.appendChild(textb)
		}
		if (Contextmenu.currentmenu != "") Contextmenu.currentmenu.remove()

		div.style.top = y + "px"
		div.style.left = x + "px"
		document.body.appendChild(div)

		Contextmenu.keepOnScreen(div)
		Contextmenu.currentmenu = div

		return this.div
	}
	bind(obj, addinfo) {
		const func = event => {
			event.preventDefault()
			event.stopImmediatePropagation()
			this.makemenu(event.clientX, event.clientY, addinfo, obj)
		}
		obj.addEventListener("contextmenu", func)
		return func
	}
	static keepOnScreen(obj) {
		const html = document.documentElement.getBoundingClientRect()
		const docheight = html.height
		const docwidth = html.width
		const box = obj.getBoundingClientRect()
		console.log(box, docheight, docwidth)
		if (box.right > docwidth) {
			console.log("test")
			obj.style.left = docwidth - box.width + "px"
		}
		if (box.bottom > docheight) {
			obj.style.top = docheight - box.height + "px"
		}
	}
}
Contextmenu.setup()
