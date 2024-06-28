"use strict"

const isGerman = (navigator.language || navigator.userLanguage).startsWith("de")
const makeTime = date => date.toLocaleTimeString(isGerman ? "de-DE" : void 0, { hour: "2-digit", minute: "2-digit" })
const formatTime = date => {
	const now = new Date()
	const sameDay = date.getDate() == now.getDate() &&
		date.getMonth() == now.getMonth() &&
		date.getFullYear() == now.getFullYear()

	const yesterday = new Date(now)
	yesterday.setDate(now.getDate() - 1)
	const isYesterday = date.getDate() == yesterday.getDate() &&
		date.getMonth() == yesterday.getMonth() &&
		date.getFullYear() == yesterday.getFullYear()

	if (sameDay) return (isGerman ? "heute um" : "Today at") + " " + makeTime(date)
	if (isYesterday) return (isGerman ? "gestern um" : "Yesterday at") + " " + makeTime(date)
	return date.toLocaleDateString(isGerman ? "de-DE" : void 0, isGerman ? {year: "numeric", month: "2-digit", day: "2-digit"} : void 0) +
		" " + (isGerman ? "um" : "at") + " " + makeTime(date)
}

class Message {
	static setup() {
		this.del = new Promise(resolve => {
			this.resolve = resolve
		})
		Message.setupcmenu()
	}
	static async wipeChanel() {
		this.resolve()
		document.getElementById("messages").innerHTML = ""
		await Promise.allSettled([this.resolve])
		this.del = new Promise(resolve => {
			this.resolve = resolve
		})
	}

	static contextmenu = new Contextmenu()
	static setupcmenu() {
		Message.contextmenu.addbutton("Copy raw text", function() {
			navigator.clipboard.writeText(this.content)
		})
		Message.contextmenu.addbutton("Reply", div => {
			if (this.channel.replyingto) this.channel.replyingto.classList.remove("replying")
				this.channel.replyingto = div
			this.channel.replyingto.classList.add("replying")
		})

		Message.contextmenu.addbutton("Copy message id", function() {
			navigator.clipboard.writeText(this.id)
		})
		Message.contextmenu.addbutton("Copy user id", function() {
			navigator.clipboard.writeText(this.author.id)
		})
		Message.contextmenu.addbutton("Message user", function() {
			fetch(instance.api + "/users/@me/channels", {
				method: "POST",
				headers: this.headers,
				body: JSON.stringify({
					recipients: [this.author.id]
				})
			})
		})

		Message.contextmenu.addbutton("Edit", function() {
			this.channel.editing = this
			document.getElementById("typebox").value = this.content
		}, null, m => m.author.id == m.localuser.user.id)
		Message.contextmenu.addbutton("Delete message", function() {
			this.delete()
		}, null, msg => msg.canDelete())
	}

	constructor(messagejson, owner) {
		this.owner = owner
		this.headers = this.owner.headers
		for (const key of Object.keys(messagejson)) {
			this[key] = messagejson[key]
		}
		for (const e in this.embeds) {
			this.embeds[e] = new Embed(this.embeds[e], this)
		}
		this.author = User.checkuser(this.author, this.localuser)

		for (const u in this.mentions) {
			this.mentions[u] = new User(this.mentions[u], this.localuser)
		}
	}
	canDelete() {
		return this.channel.hasPermission("MANAGE_MESSAGES") || this.author.id == this.localuser.user.id
	}
	get channel() {
		return this.owner
	}
	get guild() {
		return this.owner.guild
	}
	get localuser() {
		return this.owner.localuser
	}
	get info() {
		return this.owner.info
	}
	messageevents(obj) {
		const func = Message.contextmenu.bind(obj, this)
		this.div = obj
		Message.del.then(() => {
			obj.removeEventListener("click", func)
			this.div = null
		})
		obj.classList.add("messagediv")
	}
	mentionsuser(userd) {
		if (userd instanceof User) return this.mentions.includes(userd)
		if (userd instanceof Member) return this.mentions.includes(userd.user)
	}
	getimages() {
		const build = []
		for (const thing of this.attachments) {
			if (thing.content_type.startsWith("image/")) {
				build.push(thing)
			}
		}
		return build
	}
	async edit(content) {
		return await fetch(instance.api + "/channels/" + this.channel.id + "/messages/" + this.id, {
			method: "PATCH",
			headers: this.headers,
			body: JSON.stringify({content})
		})
	}
	delete() {
		fetch(instance.api + "/channels/" + this.channel.id + "/messages/" + this.id, {
			headers: this.headers,
			method: "DELETE"
		})
	}
	deleteEvent() {
		if (this.div) {
			this.div.innerHTML = ""
			this.div = null
		}

		const index = this.channel.messages.indexOf(this)
		this.channel.messages.splice(this.channel.messages.indexOf(this), 1)
		delete this.channel.messageids[this.id]
		const regen = this.channel.messages[index - 1]
		if (regen) regen.generateMessage()
	}
	generateMessage(premessage = null) {
		if (!premessage) premessage = this.channel.messages[this.channel.messages.indexOf(this) + 1]

		const div = this.div
		div.innerHTML = ""
		const build = document.createElement("table")

		if (this.message_reference) {
			const replyline = document.createElement("div")
			const line = document.createElement("hr")

			const minipfp = document.createElement("img")
			minipfp.classList.add("replypfp")
			replyline.appendChild(line)
			replyline.appendChild(minipfp)

			const username = document.createElement("span")
			replyline.appendChild(username)

			Member.resolve(this.author, this.guild).then(member => {
				if (!member) return

				if (member.error) {
					username.textContent += "Error"
					const error = document.createElement("span")
					error.textContent = "!"
					error.classList.add("membererror")
					username.after(error)
					return
				}

				username.style.color = member.getColor()
			})

			const reply = document.createElement("div")
			username.classList.add("username")
			reply.classList.add("replytext")
			replyline.appendChild(reply)

			const line2 = document.createElement("hr")
			replyline.appendChild(line2)
			line2.classList.add("reply")
			line.classList.add("startreply")
			replyline.classList.add("replyflex")

			fetch(instance.api + "/channels/" + this.message_reference.channel_id + "/messages?limit=1&around=" + this.message_reference.message_id, {
				headers: this.headers
			}).then(response => response.json()).then(response => {
				const author = User.checkuser(response[0].author, this.localuser)

				reply.appendChild(markdown(response[0].content))

				minipfp.crossOrigin = "anonymous"
				minipfp.src = author.getpfpsrc()
				author.profileclick(minipfp)
				username.textContent = author.username
				author.profileclick(username)
			})
			div.appendChild(replyline)
		}

		this.messageevents(div)
		build.classList.add("message")
		div.appendChild(build)
		if ({ 0: true, 19: true }[this.type] || this.attachments.length > 0) {
			const pfpRow = document.createElement("th")

			let pfpparent, current
			if (premessage) {
				pfpparent ??= premessage
				let pfpparent2 = pfpparent.all
				pfpparent2 ??= pfpparent
				const old = new Date(pfpparent2.timestamp).getTime() / 1000
				const newt = new Date(this.timestamp).getTime() / 1000
				current = (newt - old) > 600
			}

			const combine = premessage?.author?.id != this.author.id || current || this.message_reference
			if (combine) {
				const pfp = this.author.buildpfp()
				this.author.profileclick(pfp)
				pfpRow.appendChild(pfp)
			} else div.pfpparent = pfpparent

			pfpRow.classList.add("pfprow")
			build.appendChild(pfpRow)
			const text = document.createElement("th")

			const texttxt = document.createElement("table")
			texttxt.classList.add("commentrow")
			text.appendChild(texttxt)
			if (combine) {
				const username = document.createElement("span")
				username.classList.add("username")
				Member.resolve(this.author, this.guild).then(member => {
					if (!member) return

					if (member.error) {
						const error = document.createElement("span")
						error.textContent = "!"
						error.classList.add("membererror")
						username.after(error)
						return
					}
					username.style.color = member.getColor()
				})

				this.author.profileclick(username)
				username.textContent = this.author.username
				const userwrap = document.createElement("tr")
				userwrap.appendChild(username)

				if (this.author.bot) {
					const botTag = document.createElement("span")
					botTag.classList.add("bot")
					botTag.textContent = "BOT"
					userwrap.appendChild(botTag)
				}

				const time = document.createElement("span")
				time.textContent = "  " + formatTime(new Date(this.timestamp))
				time.classList.add("timestamp")
				userwrap.appendChild(time)

				texttxt.appendChild(userwrap)
			}

			const messaged = markdown(this.content)
			div.txt = messaged
			const messagedwrap = document.createElement("tr")
			messagedwrap.appendChild(messaged)
			texttxt.appendChild(messagedwrap)

			build.appendChild(text)
			if (this.attachments.length > 0) {
				const attach = document.createElement("div")
				for (const thing of this.attachments) {
					const array = thing.url.split("/")
					array.shift()
					array.shift()
					array.shift()
					const src = instance.cdn + "/" + array.join("/")
					if (thing.content_type.startsWith("image/")) {
						const img = document.createElement("img")
						img.classList.add("messageimg")
						img.onclick = () => {
							const full = new Dialog(["img", img.src, ["fit"]])
							full.show()
						}
						img.crossOrigin = "anonymous"
						img.src = src
						attach.appendChild(img)
					} else attach.appendChild(this.createunknown(thing.filename, thing.size, src))
				}
				messagedwrap.appendChild(attach)
			}

			if (this.embeds.length > 0) {
				const embeds = document.createElement("tr")
				for (const thing of this.embeds) {
					embeds.appendChild(thing.generateHTML())
				}
				messagedwrap.appendChild(embeds)
			}
		} else if (this.type == 7) {
			const text = document.createElement("th")

			const texttxt = document.createElement("table")
			text.appendChild(texttxt)
			build.appendChild(text)

			const messaged = document.createElement("p")
			div.txt = messaged
			messaged.textContent = "welcome: " + this.author.username
			const messagedwrap = document.createElement("tr")
			messagedwrap.appendChild(messaged)

			const time = document.createElement("span")
			time.textContent = formatTime(new Date(this.timestamp))
			time.classList.add("timestamp")
			messagedwrap.append(time)

			texttxt.appendChild(messagedwrap)
		}
		div.all = this
		return div
	}
	buildhtml(premessage) {
		if (this.div) {
			console.error(`HTML for ${this} already exists, aborting`)
			return
		}
		//premessage??=messages.lastChild;
		const div = document.createElement("div")
		this.div = div
		return this.generateMessage(premessage)
	}
	createunknown(fname, fsize) {
		const div = document.createElement("table")
		div.classList.add("unknownfile")
		const nametr = document.createElement("tr")
		div.append(nametr)

		const fileicon = document.createElement("td")
		fileicon.append("🗎")
		fileicon.classList.add("fileicon")
		fileicon.rowSpan = 2
		nametr.append(fileicon)

		const nametd = document.createElement("td")
		nametd.textContent = fname

		nametd.classList.add("filename")
		nametr.append(nametd)
		const sizetr = document.createElement("tr")
		const size = document.createElement("td")
		sizetr.append(size)
		size.textContent = "Size:" + this.filesizehuman(fsize)
		size.classList.add("filesize")
		div.appendChild(sizetr)
		return div
	}
	filesizehuman(fsize) {
		const i = fsize <= 0 ? 0 : Math.floor(Math.log(fsize) / Math.log(1024))
		return (fsize / Math.pow(1024, i)).toFixed(2) + " " + ["Bytes", "Kilobytes", "Megabytes", "Gigabytes", "Terabytes"][i]
	}
}

Message.setup()
