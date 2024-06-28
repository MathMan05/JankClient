"use strict"

// eslint-disable-next-line no-unused-vars
class Dialog {
	constructor(layout, onclose = () => {}, onopen = () => {}) {
		this.layout = layout
		this.onclose = onclose
		this.onopen = onopen
		const div = document.createElement("div")
		div.appendChild(this.tohtml(layout))
		this.html = div
		this.html.classList.add("centeritem")
		if (layout[0] != "img") {
			this.html.classList.add("nonimagecenter")
		}
	}
	tohtml(array) {
		switch (array[0]) {
			case "img": {
				const img = document.createElement("img")
				img.crossOrigin = "anonymous"
				img.src = array[1]
				if (array[2] != void 0) {
					if (array[2].length == 2) {
						img.width = array[2][0]
						img.height = array[2][1]
					} else if (array[2][0] == "fit") {
						img.classList.add("imgfit")
					}
				}
				return img
			}
			case "hdiv": {
				const hdiv = document.createElement("table")
				const tr = document.createElement("tr")
				hdiv.appendChild(tr)

				for (const thing of array) {
					if (thing == "hdiv") continue

					const td = document.createElement("td")
					td.appendChild(this.tohtml(thing))
					tr.appendChild(td)
				}
				return hdiv
			}
			case "vdiv": {
				const vdiv = document.createElement("table")
				for (const thing of array) {
					if (thing == "vdiv") continue

					const tr = document.createElement("tr")
					tr.appendChild(this.tohtml(thing))
					vdiv.appendChild(tr)
				}
				return vdiv
			}
			case "checkbox": {
				const div = document.createElement("div")
				const checkbox = document.createElement("input")
				div.appendChild(checkbox)
				const label = document.createElement("span")
				checkbox.value = array[2]
				label.textContent = array[1]
				div.appendChild(label)

				checkbox.addEventListener("change", array[3])
				checkbox.type = "checkbox"
				return div
			}
			case "button": {
				const div = document.createElement("div")
				const input = document.createElement("button")

				const label = document.createElement("span")
				input.textContent = array[2]
				label.textContent = array[1]
				div.appendChild(label)
				div.appendChild(input)
				input.addEventListener("click", array[3])
				return div
			}
			case "mdbox": {
				const div = document.createElement("div")
				const input = document.createElement("textarea")
				input.value = array[2]
				const label = document.createElement("span")
				label.textContent = array[1]
				input.addEventListener("input", array[3])
				div.appendChild(label)
				div.appendChild(document.createElement("br"))
				div.appendChild(input)
				return div
			}
			case "textbox": {
				const div = document.createElement("div")
				const input = document.createElement("input")
				input.value = array[2]
				input.type = "text"
				const label = document.createElement("span")
				label.textContent = array[1]
				input.addEventListener("input", array[3])
				div.appendChild(label)
				div.appendChild(input)
				return div
			}
			case "fileupload": {
				const div = document.createElement("div")
				const input = document.createElement("input")
				input.type = "file"
				const label = document.createElement("span")
				label.textContent = array[1]
				div.appendChild(label)
				div.appendChild(input)
				input.addEventListener("change", array[2])
				return div
			}
			case "text": {
				const span = document.createElement("span")
				span.textContent = array[1]
				return span
			}
			case "title": {
				const span = document.createElement("span")
				span.classList.add("title")
				span.textContent = array[1]
				return span
			}
			case "radio": {
				const div = document.createElement("div")
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
				div.appendChild(fieldset)
				return div
			}
			case "html":
				return array[1]
			case "select":
				const div = document.createElement("div")
				const label = document.createElement("label")
				const select = document.createElement("select")

				label.textContent = array[1]
				div.append(label)
				div.appendChild(select)
				for (const thing of array[2]) {
					const option = document.createElement("option")
					option.textContent = thing
					select.appendChild(option)
				}
				select.selectedIndex = array[4]
				select.addEventListener("change", array[3])
				return div
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
					tdcontent.appendChild(this.tohtml(thing[1]))
					content.appendChild(tdcontent)
					if (shown) tdcontent.hidden = true
					else shown = tdcontent

					button.addEventListener("click", () => {
						shown.hidden = true
						tdcontent.hidden = false
						shown = tdcontent
					})
				}
				return table
			}
			default:
				console.error("Can't find element:" + array[0] + ", full element:", array)
		}
	}
	show() {
		this.onopen()
		this.background = document.createElement("div")
		this.background.classList.add("background")
		document.body.appendChild(this.background)
		document.body.appendChild(this.html)
		this.background.onclick = function() {
			this.hide()
		}.bind(this)
	}
	hide() {
		document.body.removeChild(this.background)
		document.body.removeChild(this.html)
	}
}
