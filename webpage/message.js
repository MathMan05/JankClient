"use strict"

class cmessage {
	static contextmenu = new contextmenu()
	static setupcmenu() {
		cmessage.contextmenu.addbutton("Copy raw text", function() {
			navigator.clipboard.writeText(this.content)
		})
		cmessage.contextmenu.addbutton("Reply", div => {
			if (replyingto) replyingto.classList.remove("replying")
			replyingto = div
			replyingto.classList.add("replying")
		})
		cmessage.contextmenu.addbutton("Delete (temp)", function() {
			fetch(instance.api + "/channels/" + this.channel_id + "/messages/" + this.id, {
				method: "DELETE",
				headers: this.headers
			})
		}, null, m => m.author.id == READY.d.user.id || m.owner.owner.isAdmin())

		cmessage.contextmenu.addbutton("Copy message id", function() {
			navigator.clipboard.writeText(this.id)
		})
		cmessage.contextmenu.addbutton("Copy user id", function() {
			navigator.clipboard.writeText(this.author.id)
		})
		cmessage.contextmenu.addbutton("Message user", function() {
			fetch(instance.api + "/users/@me/channels", {
				method: "POST",
				body: JSON.stringify({
					recipients: [this.author.id]
				}),
				headers: this.headers
			})
		})
		cmessage.contextmenu.addbutton("Edit", function() {
			editing = this
			document.getElementById("typebox").value = this.content
		}, null, m => m.author.id == READY.d.user.id)
	}

	constructor(messagejson, owner) {
		this.owner = owner
		this.headers = this.owner.headers
		for (const key of Object.keys(messagejson)) {
			this[key] = messagejson[key]
		}
		for (const e in this.embeds) {
			this.embeds[e] = new embed(this.embeds[e], this)
		}
		this.author = user.checkuser(this.author)

		for (const u in this.mentions) {
			this.mentions[u] = new user(this.mentions[u])
		}
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
	messageevents(obj) {
		cmessage.contextmenu.bind(obj, this)
		obj.classList.add("messagediv")
	}
	mentionsuser(userd) {
		if (userd instanceof user) return this.mentions.includes(userd)
		if (userd instanceof member) return this.mentions.includes(userd.user)
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
	buildhtml(premessage) {
		//premessage??=messages.lastChild;
		const build = document.createElement("table")
		const div = document.createElement("div")

		if (this.message_reference) {
			const replyline = document.createElement("div")
			const line = document.createElement("hr")

			const minipfp = document.createElement("img")
			minipfp.classList.add("replypfp")
			replyline.appendChild(line)
			replyline.appendChild(minipfp)

			const username = document.createElement("span")
			replyline.appendChild(username)

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
				const author = user.checkuser(response[0].author)

				reply.appendChild(markdown(response[0].content))

				minipfp.crossOrigin = "anonymous"
				minipfp.src = author.getpfpsrc()
				profileclick(minipfp, author)
				username.textContent = author.username
				profileclick(username, author)
			})
			div.appendChild(replyline)
		}

		this.messageevents(div)
		messagelist.push(div)
		build.classList.add("message")
		div.appendChild(build)
		if ({ 0: true, 19: true }[this.type] || this.attachments.length > 0) {
			const pfpRow = document.createElement("th")

			let pfpparent, current
			if (premessage) {
				pfpparent = premessage.pfpparent
				pfpparent ??= premessage
				let pfpparent2 = pfpparent.all
				pfpparent2 ??= pfpparent
				const old = new Date(pfpparent2.timestamp).getTime() / 1000
				const newt = new Date(this.timestamp).getTime() / 1000
				current = (newt - old) > 600
			}
			const combine = (premessage?.userid != this.author.id & premessage?.author?.id != this.author.id) || (current) || this.message_reference
			if (combine) {
				const pfp = this.author.buildpfp()
				profileclick(pfp, this.author)
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
				profileclick(username, this.author)
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
							const full = new fullscreen(["img", img.src, ["fit"]])
							full.show()
						}
						img.crossOrigin = "anonymous"
						img.src = src
						attach.appendChild(img)
					} else attach.appendChild(createunknown(thing.filename, thing.size, src))
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
			time.textContent = "  " + formatTime(new Date(this.timestamp))
			time.classList.add("timestamp")
			messagedwrap.append(time)

			texttxt.appendChild(messagedwrap)
		}
		div.userid = this.author.id
		div.all = this
		return div
	}
}

cmessage.setupcmenu()

const isGerman = (navigator.language || navigator.userLanguage).startsWith("de")
const makeTime = date => date.toLocaleTimeString(isGerman ? "de-DE" : void 0, { hour: "2-digit", minute: "2-digit" })
function formatTime(date) {
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
