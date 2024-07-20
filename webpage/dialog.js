"use strict"

// eslint-disable-next-line no-unused-vars
class Dialog {
	constructor(layout, onclose = () => {}, onopen = () => {}) {
		this.layout = layout
		this.onclose = onclose
		this.onopen = onopen

		const dialog = document.createElement("dialog")

		const close = document.createElement("span")
		close.classList.add("close")
		close.innerHTML = "&times;"
		dialog.appendChild(close)

		this.tohtml(layout, dialog)
		this.html = dialog
	}
	tohtml(array, parent) {
		switch (array[0]) {
			case "img": {
				const img = document.createElement("img")
				img.crossOrigin = "anonymous"
				img.src = array[1]
				img.alt = array[3] || ""
				if (array[2] != void 0) {
					if (array[2].length == 2) {
						img.width = array[2][0]
						img.height = array[2][1]
					} else if (array[2][0] == "fit") img.classList.add("imgfit")
				}
				parent.appendChild(img)
				break
			}
			case "hdiv": {
				const hdiv = document.createElement("table")
				const tr = document.createElement("tr")

				for (const thing of array) {
					if (thing == "hdiv") continue

					const td = document.createElement("td")
					this.tohtml(thing, td)
					tr.appendChild(td)
				}
				hdiv.appendChild(tr)
				parent.appendChild(hdiv)
				break
			}
			case "vdiv": {
				const vdiv = document.createElement("table")
				for (const thing of array) {
					if (thing == "vdiv") continue

					const tr = document.createElement("tr")
					this.tohtml(thing, tr)
					vdiv.appendChild(tr)
				}
				parent.appendChild(vdiv)
				break
			}
			case "checkbox": {
				const checkbox = document.createElement("input")
				checkbox.id = "random-" + Math.random().toString(36).slice(5)
				checkbox.type = "checkbox"
				checkbox.checked = array[2]
				parent.appendChild(checkbox)

				const label = document.createElement("label")
				label.textContent = array[1]
				label.htmlFor = checkbox.id
				parent.appendChild(label)

				checkbox.addEventListener("change", array[3])
				break
			}
			case "button": {
				const input = document.createElement("button")
				input.id = "random-" + Math.random().toString(36).slice(5)
				input.textContent = array[2]
				parent.appendChild(input)

				const label = document.createElement("label")
				label.textContent = array[1]
				label.htmlFor = input.id
				parent.appendChild(label)

				input.addEventListener("click", array[3])
				break
			}
			case "mdbox": {
				const input = document.createElement("textarea")
				input.id = "random-" + Math.random().toString(36).slice(5)
				input.value = array[2]

				const label = document.createElement("label")
				label.textContent = array[1]
				label.htmlFor = input.id

				input.addEventListener("input", array[3])
				parent.appendChild(label)
				parent.appendChild(document.createElement("br"))
				parent.appendChild(input)
				break
			}
			case "textbox": {
				const input = document.createElement("input")
				input.id = "random-" + Math.random().toString(36).slice(5)
				input.type = "text"
				input.value = array[2]

				const label = document.createElement("label")
				label.textContent = array[1]
				label.htmlFor = input.id

				input.addEventListener("input", array[3])
				parent.appendChild(label)
				parent.appendChild(input)
				break
			}
			case "fileupload": {
				const input = document.createElement("input")
				input.id = "random-" + Math.random().toString(36).slice(5)
				input.type = "file"

				const label = document.createElement("label")
				label.textContent = array[1]
				label.htmlFor = input.id

				parent.appendChild(label)
				parent.appendChild(input)
				input.addEventListener("change", array[2])
				break
			}
			case "text": {
				const span = document.createElement("span")
				span.textContent = array[1]
				parent.appendChild(span)
				break
			}
			case "title": {
				const span = document.createElement("h2")
				span.textContent = array[1]
				parent.appendChild(span)
				break
			}
			case "radio": {
				const fieldset = document.createElement("fieldset")
				fieldset.addEventListener("change", () => {
					let i = -1
					for (const thing of fieldset.children) {
						i++
						if (i == 0) continue

						if (thing.children[0].children[0].checked) array[3](thing.children[0].children[0].value)
					}
				})

				const legend = document.createElement("legend")
				legend.textContent = array[1]
				fieldset.appendChild(legend)

				let i = 0
				for (const thing of array[2]) {
					const div2 = document.createElement("div")
					const input = document.createElement("input")
					input.classList.add("radio")
					input.type = "radio"
					input.name = array[1]
					input.value = thing

					if (i == array[4]) input.checked = true
					i++

					const label = document.createElement("label")
					label.appendChild(input)

					const span = document.createElement("span")
					span.textContent = thing
					label.appendChild(span)
					div2.appendChild(label)
					fieldset.appendChild(div2)
				}
				parent.appendChild(fieldset)
				break
			}
			case "html":
				parent.appendChild(array[1])
				break
			case "select":
				const select = document.createElement("select")
				select.id = "random-" + Math.random().toString(36).slice(5)

				const label = document.createElement("label")
				label.htmlFor = select.id
				label.textContent = array[1]
				parent.append(label)

				for (const thing of array[2]) {
					const option = document.createElement("option")
					option.textContent = thing
					select.appendChild(option)
				}
				select.selectedIndex = array[4]
				parent.appendChild(select)

				select.addEventListener("change", array[3])
				break
			case "tabs": {
				const table = document.createElement("table")
				const tabs = document.createElement("tr")
				tabs.classList.add("tabbed-head")
				table.appendChild(tabs)
				const td = document.createElement("td")
				tabs.appendChild(td)
				const content = document.createElement("tr")
				content.classList.add("tabbed-content")
				table.appendChild(content)

				let shown
				for (const thing of array[1]) {
					const button = document.createElement("button")
					button.textContent = thing[0]
					td.appendChild(button)

					const tdcontent = document.createElement("td")
					tdcontent.colSpan = array[1].length
					this.tohtml(thing[1], tdcontent)
					content.appendChild(tdcontent)
					if (shown) tdcontent.hidden = true
					else shown = tdcontent

					button.addEventListener("click", () => {
						shown.hidden = true
						tdcontent.hidden = false
						shown = tdcontent
					})
				}
				parent.appendChild(table)
				break
			}
			default:
				console.error("Can't find element:" + array[0] + ", full element:", array)
		}
	}
	show() {
		this.onopen()
		document.body.appendChild(this.html)
		this.html.showModal()

		this.html.querySelector("span.close").addEventListener("click", () => this.hide())
		this.html.querySelector("span.close").addEventListener("keydown", e => {
			if (e.key == "Enter") this.hide()
		})
	}
	hide() {
		this.onclose()
		this.html.close()
		this.html.remove()
	}
}
