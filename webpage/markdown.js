"use strict"

// Solution from https://stackoverflow.com/questions/4576694/saving-and-restoring-caret-position-for-contenteditable-div
const getTextNodeAtPosition = (root, index) => {
	const treeWalker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, elem => {
		if (index > elem.textContent.length) {
			index -= elem.textContent.length
			return NodeFilter.FILTER_REJECT
		}
		return NodeFilter.FILTER_ACCEPT
	})

	return {
		node: treeWalker.nextNode() || root,
		position: index
	}
}

const saveCaretPosition = context => {
	const selection = window.getSelection()
	const range = selection.getRangeAt(0)
	range.setStart(context, 0)
	const len = range.toString().length
	return () => {
		const pos = getTextNodeAtPosition(context, len)
		selection.removeAllRanges()
		const range2 = new Range()
		range2.setStart(pos.node, pos.position)
		selection.addRange(range2)
	}
}

// eslint-disable-next-line no-unused-vars
class MarkDown {
	constructor(text, owner, { keep = false, stdsize = false } = {}) {
		if (typeof text == "string") this.txt = text.split("")
		else this.txt = text
		if (this.txt === void 0) this.txt = []

		this.info = owner.info
		this.keep = keep
		this.owner = owner
		this.stdsize = stdsize
	}
	get rawString() {
		return this.txt.join("")
	}
	get textContent() {
		return this.makeHTML().textContent
	}
	makeHTML({ keep = this.keep, stdsize = this.stdsize } = {}) {
		return this.markdown(this.txt, { keep, stdsize })
	}
	markdown(txt, { keep = false, stdsize = false } = {}) {
		const span = document.createElement("span")
		let current = document.createElement("span")
		const appendcurrent = () => {
			if (current.innerHTML != "") {
				span.append(current)
				current = document.createElement("span")
			}
		}

		for (let i = 0; i < txt.length; i++) {
			if (txt[i] == "\n" || i == 0) {
				const first = i == 0
				if (first) i--
				let element = null
				let keepys = ""

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
				} else if (txt[i + 1] == "-" && txt[i + 2] == "#" && txt[i + 3] == " ") {
					element = document.createElement("small")
					element.classList.add("subtext")
					keepys = "-# "
					i += 4
				} else if (txt[i + 1] == ">" && txt[i + 2] == " ") {
					element = document.createElement("div")
					const line = document.createElement("div")
					line.classList.add("quoteline")
					element.append(line)
					element.classList.add("quote")
					keepys = "> "
					i += 3
				}

				if (keepys) {
					appendcurrent()
					if (!first && !stdsize) span.appendChild(document.createElement("br"))

					const build = []
					for (; txt[i] != "\n" && txt[i] !== void 0; i++) {
						build.push(txt[i])
					}

					if (stdsize) element = document.createElement("span")
					if (keep) element.append(keepys)

					element.appendChild(this.markdown(build, {keep, stdsize}))
					span.append(element)
					i--
					continue
				}
				if (first) i++
			}

			if (txt[i] == "\n") {
				if (stdsize) {
					const s = document.createElement("span")
					s.textContent = "..."
					span.append(s)
					return span
				}

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
					if (txt[j] == "`") find++
					else {
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

				if (stdsize) build = build.replaceAll("\n", "").replace(/\s/g, " ").replaceAll("  ", "")

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
					} else if (!stdsize) {
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
						build.push(txt[j])
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
						iElem.append(this.markdown(build, {keep, stdsize}))
						if (keep) iElem.append(stars)
						span.appendChild(iElem)
					} else if (count == 2) {
						const bElem = document.createElement("b")
						if (keep) bElem.append(stars)
						bElem.append(this.markdown(build, {keep, stdsize}))
						if (keep) bElem.append(stars)
						span.appendChild(bElem)
					} else {
						const bElem = document.createElement("b")
						const iElem = document.createElement("i")
						if (keep) bElem.append(stars)
						bElem.append(this.markdown(build, {keep, stdsize}))
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
					if (txt[i + 2] == "_") count++
				}

				let build = []
				let find = 0
				let j = i + count
				for (; txt[j] !== void 0 && find != count; j++) {
					if (txt[j] == "_") find++
					else {
						build.push(txt[j])
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
						iElem.append(this.markdown(build, {keep, stdsize}))
						if (keep) iElem.append(underscores)
						span.appendChild(iElem)
					} else if (count == 2) {
						const uElem = document.createElement("u")
						if (keep) uElem.append(underscores)
						uElem.append(this.markdown(build, {keep, stdsize}))
						if (keep) uElem.append(underscores)
						span.appendChild(uElem)
					} else {
						const uElem = document.createElement("u")
						const iElem = document.createElement("i")
						if (keep) iElem.append(underscores)
						iElem.append(this.markdown(build, {keep, stdsize}))
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
						build.push(txt[j])
						if (find != 0) {
							build = build.concat(new Array(find).fill("~"))
							find = 0
						}
					}
				}

				if (find == count) {
					appendcurrent()
					i = j - 1
					const tildes = "~~"

					const sElem = document.createElement("s")
					if (keep) sElem.append(tildes)
					sElem.append(this.markdown(build, {keep, stdsize}))
					if (keep) sElem.append(tildes)
					span.appendChild(sElem)

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
						build.push(txt[j])
						if (find != 0) {
							build = build.concat(new Array(find).fill("~"))
							find = 0
						}
					}
				}

				if (find == count) {
					appendcurrent()
					i = j - 1
					const pipes = "||"

					const spoilerElem = document.createElement("span")
					spoilerElem.classList.add("spoiler")
					spoilerElem.addEventListener("click", MarkDown.unspoil)

					if (keep) spoilerElem.append(pipes)
					spoilerElem.append(this.markdown(build, {keep, stdsize}))
					if (keep) spoilerElem.append(pipes)
					span.appendChild(spoilerElem)

					continue
				}
			}

			if (txt[i] == "<" && txt[i + 1] == "t" && txt[i + 2] == ":") {
				let found = false
				const build = ["<", "t", ":"]
				let j = i + 3
				for (; txt[j] !== void 0; j++) {
					build.push(txt[j])

					if (txt[j] == ">") {
						found = true
						break
					}
				}

				if (found) {
					appendcurrent()
					i = j

					const parts = build.join("").match(/^<t:(\d{1,16})(:([tTdDfFR]))?>$/)

					const dateInput = new Date(Number.parseInt(parts[1]) * 1000)
					let time = ""
					if (dateInput == "Invalid Date") time = build.join("")
					else {
						if (parts[3] == "d") time = dateInput.toLocaleString(void 0, {day: "2-digit", month: "2-digit", year: "numeric"})
						else if (parts[3] == "D") time = dateInput.toLocaleString(void 0, {day: "numeric", month: "long", year: "numeric"})
						else if (!parts[3] || parts[3] == "f") time = dateInput.toLocaleString(void 0, {day: "numeric", month: "long", year: "numeric"}) + " " +
							dateInput.toLocaleString(void 0, {hour: "2-digit", minute: "2-digit"})
						else if (parts[3] == "F") time = dateInput.toLocaleString(void 0, {day: "numeric", month: "long", year: "numeric", weekday: "long"}) + " " +
							dateInput.toLocaleString(void 0, {hour: "2-digit", minute: "2-digit"})
						else if (parts[3] == "t") time = dateInput.toLocaleString(void 0, {hour: "2-digit", minute: "2-digit"})
						else if (parts[3] == "T") time = dateInput.toLocaleString(void 0, {hour: "2-digit", minute: "2-digit", second: "2-digit"})
						else if (parts[3] == "R") time = Math.round((Date.now() - (Number.parseInt(parts[1]) * 1000)) / 1000 / 60) + " minutes ago"
					}

					const timeElem = document.createElement("span")
					timeElem.classList.add("md-timestamp")
					timeElem.textContent = time
					span.appendChild(timeElem)

					continue
				}
			}

			if (txt[i] == "<" && (txt[i + 1] == ":" || (txt[i + 1] == "a" && txt[i + 2] == ":"))) {
				let found = false
				const build = txt[i + 1] == "a" ? ["<", "a", ":"] : ["<", ":"]
				let j = i + build.length
				for (; txt[j] !== void 0; j++) {
					build.push(txt[j])

					if (txt[j] == ">") {
						found = true
						break
					}
				}

				if (found) {
					const parts = build.join("").match(/^<(a)?:\w+:(\d{10,30})>$/)
					if (parts && parts[2]) {
						appendcurrent()
						i = j

						const isEmojiOnly = txt.join("").trim() == build.join("").trim()

						const emojiElem = document.createElement("img")
						emojiElem.classList.add("md-emoji")
						emojiElem.width = isEmojiOnly ? 48 : 22
						emojiElem.height = isEmojiOnly ? 48 : 22
						emojiElem.crossOrigin = "anonymous"
						emojiElem.src = instance.cdn + "/emojis/" + parts[2] + "." + (parts[1] ? "gif" : "png") + "?size=32"
						emojiElem.alt = ""
						emojiElem.loading = "lazy"
						span.appendChild(emojiElem)

						continue
					}
				}
			}

			if (!txt[i - 1] || txt[i - 1] != "\\") {
				const twEmoji = emojiRegex.exec(txt[i] + (txt[i + 1] || "") + (txt[i + 2] || ""))
				if (twEmoji) {
					const alt = twEmoji[0]
					const icon = twEmoji[1]
					const variant = twEmoji[2]

					i++
					if (variant != "\uFE0E") {
						appendcurrent()

						const img = document.createElement("img")
						img.crossOrigin = "anonymous"
						img.src = "https://cdnjs.cloudflare.com/ajax/libs/twemoji/15.0.3/72x72/" +
							MarkDown.toCodePoint(icon.length == 3 && icon.charAt(1) == "\uFE0F" ? icon.charAt(0) + icon.charAt(2) : icon) + ".png"
						img.width = 22
						img.height = 22
						img.alt = "Emoji: " + Object.keys(emojis)[Object.values(emojis).findIndex(e => e == alt)]

						span.appendChild(img)
					}

					continue
				}
			}

			if (txt[i] == "<" && (txt[i + 1] == "#" || txt[i + 1] == "@")) {
				let found = false
				const build = ["<", txt[i + 1]]
				let j = i + 2
				for (; txt[j] !== void 0; j++) {
					build.push(txt[j])

					if (txt[j] == ">") {
						found = true
						break
					}
				}

				if (found) {
					const parts = build.join("").match(/^<(#|@)&?(\d{10,30})>$/)
					if (parts && parts[2]) {
						appendcurrent()
						i = j

						const mentionElem = document.createElement("span")
						mentionElem.classList.add("md-mention")

						let mentionText = parts[2]
						if (build[1] == "#") {
							if (thisuser.lookingguild?.channelids[parts[2]]) mentionText = thisuser.lookingguild.channelids[parts[2]].name
							else {
								thisuser.guilds.forEach(guild => {
									if (guild.channelids[parts[2]]) mentionText = guild.channelids[parts[2]].name
								})
							}

							mentionElem.textContent = "#" + mentionText
						} else if (build[1] == "@") {
							if (build[2] == "&") {
								if (thisuser.lookingguild?.roleids[parts[2]]) mentionText = thisuser.lookingguild.roleids[parts[2]].name
								else {
									thisuser.guilds.forEach(guild => {
										if (guild.roleids[parts[2]]) mentionText = guild.roleids[parts[2]].name
									})
								}
							} else if (User.userids[parts[2]]) mentionText = User.userids[parts[2]].username

							mentionElem.textContent = "@" + mentionText
						}

						span.appendChild(mentionElem)

						continue
					}
				}
			}

			current.textContent += txt[i]
		}

		appendcurrent()
		return span
	}
	static unspoil(e) {
		e.target.classList.remove("spoiler")
		e.target.classList.add("unspoiled")
	}
	static toCodePoint(unicodeSurrogates) {
		// Modified by TomatoCake from https://github.com/twitter/twemoji/blob/81040856868a62d378e9afdb56aa6e8ae2418435/twemoji.js#L570-L588
		// License: https://github.com/twitter/twemoji/blob/81040856868a62d378e9afdb56aa6e8ae2418435/LICENSE
		const r = []
		let
			c = 0,
			p = 0,
			i = 0
		while (i < unicodeSurrogates.length) {
			c = unicodeSurrogates.charCodeAt(i++)
			if (p) {
				r.push((0x10000 + ((p - 0xD800) << 10) + (c - 0xDC00)).toString(16))
				p = 0
			} else if (c >= 0xD800 && c <= 0xDBFF) p = c
			else r.push(c.toString(16))
		}
		return r.join("-")
	}
	giveBox(box) {
		let prevcontent = ""
		box.addEventListener("keyup", () => {
			const content = MarkDown.gatherBoxText(box)
			if (content != prevcontent) {
				prevcontent = content
				this.txt = content.split("")
				this.boxupdate(box)
			}
		})

		box.addEventListener("paste", event => {
			event.preventDefault()
			document.execCommand("insertText", false, event.clipboardData.getData("text"))
			box.dispatchEvent(new KeyboardEvent("keyup"))
		})
	}
	boxupdate(box) {
		const restore = saveCaretPosition(box)
		box.innerHTML = ""
		box.append(this.makeHTML({ keep: true }))
		restore()
	}
	static gatherBoxText(element) {
		if (element.tagName == "IMG") return element.alt
		if (element.tagName == "BR") return "\n"

		let build = ""
		for (const thing of element.childNodes) {
			if (thing instanceof Text) {
				const text = thing.textContent
				build += text
				continue
			}

			const text = this.gatherBoxText(thing)
			if (text) build += text
		}
		return build
	}
}
