"use strict"

function markdown(txt, keep = false) {
	if (typeof txt == "string") return markdown(txt.split(""), keep)

	const span = document.createElement("span")
	let current = document.createElement("span")
	function appendcurrent() {
		if (current.innerHTML != "") {
			span.append(current)
			current = document.createElement("span")
		}
	}
	for (let i = 0; i < txt.length; i++) {
		if (txt[i] == "\n" || i == 0) {
			const first = i == 0
			if (first) {
				i--
			}
			let element = null
			let keepys = false

			if (txt[i + 1] == "#") {
				if (txt[i + 2] == "#") {
					if (txt[i + 3] == "#" && txt[i + 4] == " ") {
						element = document.createElement("h3")
						keepys = "### "
						i += 5
					} else if (txt[i + 3] == " ") {
						element = document.createElement("h2")
                        element.classList.add("h2md")
						keepys = "## "
						i += 4
					}
				} else if (txt[i + 2] == " ") {
					element = document.createElement("h1")
					keepys = "# "
					i += 3
				}
			} else if (txt[i + 1] == ">" && txt[i + 2] == " ") {
				element = document.createElement("div")
				const line = document.createElement("div")
				line.classList.add("quoteline")
				console.log(line)
				element.append(line)
				element.classList.add("quote")
				keepys = "> "
				i += 3
			}
			if (keepys) {
				appendcurrent()
				if (!first) span.appendChild(document.createElement("br"))

				const build = []
				for (; txt[i] != "\n" && txt[i] !== void 0; i++) {
					build.push(txt[i])
				}

				if (keep) element.append(keepys)
				element.appendChild(markdown(build, keep))
				span.append(element)
				i--
				continue
			}
			if (first) i++
		}
		if (txt[i] == "\n") {
			appendcurrent()
			span.append(document.createElement("br"))
			continue
		}
		if (txt[i] == "`") {
			let count = 1
			if (txt[i + 1] == "`") {
				count++
				if (txt[i + 2] == "`") count++
			}
			let build = ""
			if (keep) build += "`".repeat(count)

			let find = 0
			let j = i + count
			let init = true
			// eslint-disable-next-line no-unmodified-loop-condition
			for (; txt[j] !== void 0 && (txt[j] != "\n" || count == 3) && find != count; j++) {
				if (txt[j] == "`") {
					find++
				} else {
					if (find != 0) {
						build += "`".repeat(find)
						find = 0
					}
					if (init && count == 3) {
						if (txt[j] == " " || txt[j] == "\n") {
							init = false
						}
						if (keep) build += txt[j]

						continue
					}
					build += txt[j]
				}
			}
			if (find == count) {
				appendcurrent()
				i = j
				if (keep) build += "`".repeat(find)

				if (count == 3) {
					const pre = document.createElement("pre")

					if (build.at(-1) == "\n") build = build.substring(0, build.length - 1)
					if (txt[i] == "\n") i++

					pre.textContent = build
					span.appendChild(pre)
				} else {
					const code = document.createElement("code")
					code.textContent = build
					span.appendChild(code)
				}

				i--
				continue
			}
		}

		if (txt[i] == "*") {
			let count = 1
			if (txt[i + 1] == "*") {
				count++
				if (txt[i + 2] == "*") count++
			}

			let build = []
			let find = 0
			let j = i + count
			for (; txt[j] !== void 0 && find != count; j++) {
				if (txt[j] == "*") find++
				else {
					build += txt[j]
					if (find != 0) {
						build = build.concat(new Array(find).fill("*"))
						find = 0
					}
				}
			}
			if (find == count && (count != 1 || txt[i + 1] != " ")) {
				appendcurrent()
				i = j

				const stars = "*".repeat(count)
				if (count == 1) {
					const iElem = document.createElement("i")
					if (keep) iElem.append(stars)
					iElem.appendChild(markdown(build, keep))
					if (keep) iElem.append(stars)
					span.appendChild(iElem)
				} else if (count == 2) {
					const bElem = document.createElement("b")
					if (keep) bElem.append(stars)
					bElem.appendChild(markdown(build, keep))
					if (keep) bElem.append(stars)
					span.appendChild(bElem)
				} else {
					const bElem = document.createElement("b")
					const iElem = document.createElement("i")
					if (keep) bElem.append(stars)
					bElem.appendChild(markdown(build, keep))
					if (keep) bElem.append(stars)
					iElem.appendChild(bElem)
					span.appendChild(iElem)
				}
				i--
				continue
			}
		}

		if (txt[i] == "_") {
			let count = 1
			if (txt[i + 1] == "_") {
				count++
				if (txt[i + 2] == "_") {
					count++
				}
			}

			let build = []
			let find = 0
			let j = i + count
			for (; txt[j] !== void 0 && find != count; j++) {
				if (txt[j] == "_") {
					find++
				} else {
					build += txt[j]
					if (find != 0) {
						build = build.concat(new Array(find).fill("_"))
						find = 0
					}
				}
			}
			if (find == count && (count != 1 || (txt[j + 1] == " " || txt[j + 1] == "\n" || txt[j + 1] === void 0))) {
				appendcurrent()
				i = j
				const underscores = "_".repeat(count)
				if (count == 1) {
					const iElem = document.createElement("i")
					if (keep) iElem.append(underscores)
					iElem.appendChild(markdown(build, keep))
					if (keep) iElem.append(underscores)
					span.appendChild(iElem)
				} else if (count == 2) {
					const uElem = document.createElement("u")
					if (keep) uElem.append(underscores)
					uElem.appendChild(markdown(build, keep))
					if (keep) uElem.append(underscores)
					span.appendChild(uElem)
				} else {
					const uElem = document.createElement("u")
					const iElem = document.createElement("i")
					if (keep) iElem.append(underscores)
					iElem.appendChild(markdown(build, keep))
					if (keep) iElem.append(underscores)
					uElem.appendChild(iElem)
					span.appendChild(uElem)
				}
				i--
				continue
			}
		}

		if (txt[i] == "~" && txt[i + 1] == "~") {
			const count = 2
			let build = []
			let find = 0
			let j = i + 2
			for (; txt[j] !== void 0 && find != count; j++) {
				if (txt[j] == "~") find++
				else {
					build += txt[j]
					if (find != 0) {
						build = build.concat(new Array(find).fill("~"))
						find = 0
					}
				}
			}
			if (find == count) {
				appendcurrent()
				i = j
				const underscores = "~~"
				if (count == 2) {
					const sElem = document.createElement("s")
					if (keep) sElem.append(underscores)
					sElem.appendChild(markdown(build, keep))
					if (keep) sElem.append(underscores)
					span.appendChild(sElem)
				}
				continue
			}
		}

		if (txt[i] == "|" && txt[i + 1] == "|") {
			const count = 2
			let build = []
			let find = 0
			let j = i + 2
			for (; txt[j] !== void 0 && find != count; j++) {
				if (txt[j] == "|") find++
				else {
					build += txt[j]
					if (find != 0) {
						build = build.concat(new Array(find).fill("~"))
						find = 0
					}
				}
			}
			if (find == count) {
				appendcurrent()
				i = j
				const underscores = "||"
				if (count == 2) {
					const spoilerElem = document.createElement("span")
					if (keep) spoilerElem.append(underscores)
					spoilerElem.appendChild(markdown(build, keep))
					spoilerElem.classList.add("spoiler")
					spoilerElem.addEventListener("click", markdown.unspoil)
					if (keep) spoilerElem.append(underscores)
					span.appendChild(spoilerElem)
				}
				continue
			}
		}
		current.textContent += txt[i]
	}
	appendcurrent()
	return span
}
markdown.unspoil = e => {
	e.target.classList.remove("spoiler")
	e.target.classList.add("unspoiled")
}
