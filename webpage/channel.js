"use strict"

class Channel {
	static contextmenu = new Contextmenu()
	static setupcontextmenu() {
		Channel.contextmenu.addbutton("Copy channel id", function() {
			navigator.clipboard.writeText(this.id)
		})

		Channel.contextmenu.addbutton("Mark as read", function() {
			this.readbottom()
		})

		Channel.contextmenu.addbutton("Delete channel", function() {
			this.deleteChannel()
		}, null, owner => owner.isAdmin())

		Channel.contextmenu.addbutton("Edit channel", function() {
			editchannel(this)
		}, null, owner => owner.isAdmin())
	}

	constructor(json, owner) {
		if (json == -1) return

		this.type = json.type
		this.owner = owner
		this.headers = this.owner.headers
		this.messages = []
		this.name = json.name
		this.id = json.id
		this.parent_id = json.parent_id
		this.parent = null
		this.children = []
		this.guild_id = json.guild_id
		this.messageids = {}
		this.topic = json.topic
		this.nsfw = json.nsfw
		this.position = json.position
		this.lastreadmessageid = null
		this.lastmessageid = json.last_message_id

		this.permission_overwrites = {}
		for (const override of json.permission_overwrites) {
			this.permission_overwrites[override.id] = new Permissions(override.allow, override.deny)
		}
	}

	isAdmin() {
		return this.guild.isAdmin()
	}
	get guild() {
		return this.owner
	}
	get localuser() {
		return this.guild.localuser
	}
	get info() {
		return this.owner.info
	}
	readStateInfo(json) {
		this.lastreadmessageid = json.last_message_id
		this.mentions = json.mention_count
		this.mentions ??= 0
		this.lastpin = json.last_pin_timestamp
	}
	hasPermission(name, member = this.guild.member) {
		if (member.isAdmin()) return true

		for (const thing of member.roles) {
			if (this.permission_overwrites[thing.id]) {
				const perm = this.permission_overwrites[thing.id].hasPermission(name)
				if (perm) return perm == 1
			}
			if (thing.permissions.hasPermission(name)) return true
		}
		return false
	}
	get hasunreads() {
		if (!this.hasPermission("VIEW_CHANNEL")) return false

		return this.lastmessageid != this.lastreadmessageid && this.type != 4
	}
	get canMessage() {
		return this.hasPermission("SEND_MESSAGES")
	}
	sortchildren() {
		this.children.sort((a, b) => {
			return a.position - b.position
		})
	}
	resolveparent(guild) {
		this.parent = guild.channelids[this.parent_id]
		this.parent ??= null
		if (this.parent !== null) this.parent.children.push(this)
		return this.parent === null
	}
	calculateReorder() {
		let position = -1
		const build = []
		for (const thing of this.children) {
			const thisthing = { id: thing.id }
			if (thing.position < position) {
				thisthing.position = position + 1
				thing.position = thisthing.position
			}
			position = thing.position
			if (thing.move_id && thing.move_id != thing.parent_id) {
				thing.parent_id = thing.move_id
				thisthing.parent_id = thing.parent_id
				thing.move_id = void 0
			}
			if (thisthing.position || thisthing.parent_id) build.push(thisthing)
		}
		return build
	}
	static dragged = []
	createguildHTML(admin = false) {
		const div = document.createElement("div")
		if (!this.hasPermission("VIEW_CHANNEL")) {
			let quit = true
			for (const thing of this.children) {
				if (thing.hasPermission("VIEW_CHANNEL")) quit = false
			}
			if (quit) return div
		}
		div.id = "ch-" + this.id
		div.all = this
		div.draggable = admin
		div.addEventListener("dragstart", e => {
			Channel.dragged = [this, div]
			e.stopImmediatePropagation()
		})
		div.addEventListener("dragend", () => {
			Channel.dragged = []
		})

		if (this.type == 4) {
			this.sortchildren()
			const caps = document.createElement("div")

			const decdiv = document.createElement("div")
			const decoration = document.createElement("b")
			decoration.textContent = "▼"
			decdiv.appendChild(decoration)

			const myhtml = document.createElement("p2")
			myhtml.textContent = this.name
			decdiv.appendChild(myhtml)
			caps.appendChild(decdiv)
			const childrendiv = document.createElement("div")
			if (admin) {
				const addchannel = document.createElement("span")
				addchannel.textContent = "+"
				addchannel.classList.add("addchannel")
				caps.appendChild(addchannel)
				addchannel.onclick = function() {
					this.guild.createchannels(this.createChannel.bind(this))
				}.bind(this)
				this.coatDropDiv(decdiv, childrendiv)
			}
			div.appendChild(caps)
			caps.classList.add("flex")
			decdiv.classList.add("channel", "channeleffects")

			Channel.contextmenu.bind(decdiv, this)
			decdiv.all = this

			for (const channel2 of this.children) {
				childrendiv.appendChild(channel2.createguildHTML(admin))
			}
			childrendiv.classList.add("channels")
			setTimeout(() => {
				childrendiv.style.height = childrendiv.scrollHeight + "px"
			}, 100)

			decdiv.onclick = function() {
				if (decoration.textContent == "▼") {
					decoration.textContent = "▲"
					childrendiv.style.height = "0"
				} else {
					decoration.textContent = "▼"
					childrendiv.style.height = childrendiv.scrollHeight + "px"
				}
			}
			div.appendChild(childrendiv)
		} else {
			div.classList.add("channel")
			if (this.hasunreads) div.classList.add("cunread")

			Channel.contextmenu.bind(div, this)
			if (admin) this.coatDropDiv(div)

			div.all = this
			const myhtml = document.createElement("span")
			myhtml.textContent = this.name

			const decoration = document.createElement("b")
			if (this.parent) decoration.classList.add("indent")

			if (this.type == 0) {
				decoration.textContent = "#"
				decoration.classList.add("space")
			} else if (this.type == 2) {
				decoration.textContent = "🕪"
				decoration.classList.add("space", "spacee")
			} else if (this.type == 5) {
				decoration.textContent = "📣"
				decoration.classList.add("space", "spacee")
			} else if (this.type >= 10 && this.type <= 12) {
				decoration.textContent = "🧵"
				decoration.classList.add("space", "spacee")
			} else if (this.type == 13) {
				decoration.textContent = "🎭"
				decoration.classList.add("space", "spacee")
			} else if (this.type == 15) {
				decoration.textContent = "🗂️"
				decoration.classList.add("space", "spacee")
			} else if (this.type == 16) {
				decoration.textContent = "📸"
				decoration.classList.add("space", "spacee")
			} else {
				decoration.textContent = "❓"
				console.warn("Unable to handle channel type " + this.type)
			}
			div.appendChild(decoration)

			div.appendChild(myhtml)
			div.onclick = () => {
				this.getHTML()
			}
		}
		return div
	}
	get myhtml() {
		const search = document.getElementById("channels").children[0].children
		if (this.guild !== this.localuser.lookingguild) {
			return null
		} else if (this.parent) {
			for (const thing of search) {
				if (thing.all === this.parent) {
					for (const thing2 of thing.children[1].children) {
						if (thing2.all === this) return thing2
					}
				}
			}
		} else {
			for (const thing of search) {
				if (thing.all === this) return thing
			}
		}
		return null
	}
	readbottom() {
		if (!this.hasunreads) return

		fetch(instance.api + "/channels/" + this.id + "/messages/" + this.lastmessageid + "/ack", {
			method: "POST",
			headers: this.headers,
			body: JSON.stringify({})
		})
		this.lastreadmessageid = this.lastmessageid
		this.guild.unreads()
		if (this.myhtml !== null) this.myhtml.classList.remove("cunread")
	}
	coatDropDiv(div, container = false) {
		div.addEventListener("dragenter", event => {
			console.log("enter")
			event.preventDefault()
		})

		div.addEventListener("dragover", event => {
			event.preventDefault()
		})

		div.addEventListener("drop", event => {
			const that = Channel.dragged[0]
			event.preventDefault()
			if (container) {
				that.move_id = this.id
				if (that.parent) that.parent.children.splice(that.parent.children.indexOf(that), 1)

				that.parent = this
				container.prepend(Channel.dragged[1])
				console.log(this, that)
				this.children.unshift(that)
			} else {
				console.log(this, Channel.dragged)
				that.move_id = this.parent_id
				if (that.parent) that.parent.children.splice(that.parent.children.indexOf(that), 1)
				else this.guild.headchannels.splice(this.guild.headchannels.indexOf(that), 1)

				that.parent = this.parent
				if (that.parent) {
					const build = []
					for (let i = 0; i < that.parent.children.length; i++) {
						build.push(that.parent.children[i])
						if (that.parent.children[i] === this) build.push(that)
					}
					that.parent.children = build
				} else {
					const build = []
					for (let i = 0; i < this.guild.headchannels.length; i++) {
						build.push(this.guild.headchannels[i])
						if (this.guild.headchannels[i] === this) build.push(that)
					}
					this.guild.headchannels = build
				}
				div.after(Channel.dragged[1])
			}
			this.guild.calculateReorder()
		})

		return div
	}
	createChannel(name, type) {
		fetch(instance.api + "/guilds/" + this.guild.id + "/channels", {
			method: "POST",
			headers: this.headers,
			body: JSON.stringify({
				name,
				type,
				parent_id: this.id,
				permission_overwrites: []
			})
		})
	}
	editChannel() {
		let name = this.name
		let topic = this.topic
		let nsfw = this.nsfw
		const thisid = this.id
		const thistype = this.type
		const full = new Dialog(
			["hdiv",
				["vdiv",
					["textbox", "Channel name:", this.name, event => {
						name = event.target.value
					}],
					["mdbox", "Channel topic:", this.topic, event => {
						topic = event.target.value
					}],
					["checkbox", "NSFW Channel", this.nsfw, event => {
						nsfw = event.target.checked
					}],
					["button", "", "submit", function() {
						fetch(instance.api + "/channels/" + thisid, {
							method: "PATCH",
							headers: this.headers,
							body: JSON.stringify({
								name,
								type: thistype,
								topic,
								bitrate: 64000,
								user_limit: 0,
								nsfw,
								flags: 0,
								rate_limit_per_user: 0
							})
						})
						full.hide()
					}]
				]

			])
		full.show()
	}
	deleteChannel() {
		fetch(instance.api + "/channels/" + this.id, {
			method: "DELETE",
			headers: this.headers
		})
	}
	setReplying(message) {
		if (this.replyingto) this.replyingto.div.classList.remove("replying")
		this.replyingto = message
		this.replyingto.div.classList.add("replying")
		this.makereplybox()
	}
	makereplybox() {
		const replybox = document.getElementById("replybox")
		if (this.replyingto) {
			replybox.innerHTML = ""
			const span = document.createElement("span")
			span.textContent = "Replying to " + this.replyingto.author.username

			const close = document.createElement("button")
			close.textContent = "⦻"
			close.classList.add("cancelReply")
			close.addEventListener("click", () => {
				this.replyingto.div.classList.remove("replying")
				replybox.classList.add("hideReplyBox")
				this.replyingto = null
				replybox.innerHTML = ""
			})

			replybox.classList.remove("hideReplyBox")
			replybox.append(span)
			replybox.append(close)
		} else replybox.classList.add("hideReplyBox")
	}
	async getmessage(id) {
		if (this.messageids[id]) return this.messageids[id]

		const gety = await fetch(instance.api + "/channels/" + this.id + "/messages?limit=1&around=" + id, {
			headers: this.headers
		})
		const json = await gety.json()
		return new Message(json[0], this)
	}
	async getHTML() {
		if (this.owner != this.owner.owner.lookingguild) this.owner.loadGuild()

		if (this.localuser.channelfocus && this.localuser.channelfocus.myhtml) this.localuser.channelfocus.myhtml.classList.remove("viewChannel")
		this.myhtml.classList.add("viewChannel")

		this.owner.prevchannel = this
		this.owner.owner.channelfocus = this
		const prom = Message.wipeChanel()
		await this.putmessages()
		await prom
		this.makereplybox()
		this.buildmessages()

		history.pushState(null, "", "/channels/" + this.guild_id + "/" + this.id)
		document.getElementById("channelname").textContent = "#" + this.name
		document.getElementById("typebox").disabled = !this.canMessage
	}
	async putmessages() {
		if (this.messages.length >= 100 || this.allthewayup) return

		const res = await fetch(instance.api + "/channels/" + this.id + "/messages?limit=100", {
			headers: this.headers
		})

		const json = await res.json()
		if (json.length != 100) this.allthewayup = true

		for (const thing of json) {
			const messager = new Message(thing, this)
			if (this.messageids[messager.id] === void 0) {
				this.messageids[messager.id] = messager
				this.messages.push(messager)
			}
		}
	}
	delChannel(json) {
		const build = []
		for (const child of this.children) {
			if (child.id != json.id) build.push(child)
		}
		this.children = build
	}
	async grabmoremessages() {
		if (this.messages.length == 0 || this.allthewayup) return
		const out = this

		await fetch(instance.api + "/channels/" + this.id + "/messages?before=" + this.messages.at(-1).id + "&limit=100", {
			headers: this.headers
		}).then(j => {
			return j.json()
		}).then(response => {
			let next
			if (response.length < 100) out.allthewayup = true

			for (const i in response) {
				let messager
				if (next) messager = next
				else messager = new Message(response[i], this)

				if (response[Number(i) + 1] === void 0) next = void 0
				else next = new Message(response[Number(i) + 1], this)

				if (out.messageids[messager.id] === void 0) {
					out.messageids[messager.id] = messager
					out.buildmessage(messager, next)
					out.messages.push(messager)
				} else console.trace("How???")
			}
			//out.buildmessages()
		})
	}
	buildmessage(message, next) {
		const built = message.buildhtml(next)
		document.getElementById("messages").prepend(built)
	}
	buildmessages() {
		for (const i in this.messages) {
			const prev = this.messages[Number(i) + 1]
			const built = this.messages[i].buildhtml(prev)
			document.getElementById("messages").prepend(built)

			if (prev) {
				const prevDate = new Date(prev.timestamp)
				const currentDate = new Date(this.messages[i].timestamp)

				if (prevDate.toLocaleDateString() != currentDate.toLocaleDateString()) {
					const dateContainer = document.createElement("div")
					dateContainer.classList.add("replyflex")

					const line = document.createElement("hr")
					line.classList.add("reply")
					dateContainer.appendChild(line)

					const date = document.createElement("span")
					date.textContent = currentDate.toLocaleDateString(void 0, { weekday: "long", year: "numeric", month: "long", day: "numeric" })
					dateContainer.appendChild(date)

					const line2 = document.createElement("hr")
					line2.classList.add("reply")
					dateContainer.appendChild(line2)

					document.getElementById("messages").prepend(dateContainer)
				}
			}
		}
		document.getElementById("messagecontainer").scrollTop = document.getElementById("messagecontainer").scrollHeight
	}
	updateChannel(json) {
		this.type = json.type
		this.name = json.name
		this.parent_id = json.parent_id
		this.parent = null
		this.children = []
		this.guild_id = json.guild_id
		this.messageids = {}
		this.permission_overwrites = json.permission_overwrites
		this.topic = json.topic
		this.nsfw = json.nsfw
	}
	typingstart() {
		if (this.typing > Date.now()) return

		this.typing = Date.now() + 6000
		fetch(instance.api + "/channels/" + this.id + "/typing", {
			method: "POST",
			headers: this.headers
		})
	}
	get notification() {
		let notinumber = this.message_notifications
		if (notinumber == 3) notinumber = null
		notinumber ??= this.guild.message_notifications

		switch (notinumber) {
			case 0:
				return "all"
			case 1:
				return "mentions"
			case 2:
				return "none"
			case 3:
				return "default"
		}
	}
	async sendMessage(content, {attachments = [], replyingto = null}) {
		let replyjson
		if (replyingto) replyjson = {
			guild_id: replyingto.guild.id,
			channel_id: replyingto.channel.id,
			message_id: replyingto.id
		}

		if (attachments.length == 0) {
			const body = {
				content,
				nonce: Math.floor(Math.random() * 1000000000)
			}
			if (replyjson) body.message_reference = replyjson

			return await fetch(instance.api + "/channels/" + this.id + "/messages", {
				method: "POST",
				headers: this.headers,
				body: JSON.stringify(body)
			})
		} else {
			const formData = new FormData()
			const body = {
				content,
				nonce: Math.floor(Math.random() * 1000000000)
			}
			if (replyjson) body.message_reference = replyjson

			formData.append("payload_json", JSON.stringify(body))
			for (const i in attachments) {
				formData.append("files[" + i + "]", attachments[i])
			}

			return await fetch(instance.api + "/channels/" + this.id + "/messages", {
				method: "POST",
				body: formData,
				headers: {
					Authorization: this.headers.Authorization
				}
			})
		}
	}
	messageCreate(messagep) {
		if (!this.hasPermission("VIEW_CHANNEL")) return

		const messagez = new Message(messagep.d, this)
		this.lastmessageid = messagez.id
		if (messagez.author === this.localuser.user) {
			this.lastreadmessageid = messagez.id
			if (this.myhtml) this.myhtml.classList.remove("cunread")
		} else if (this.myhtml) this.myhtml.classList.add("cunread")

		this.guild.unreads()
		this.messages.unshift(messagez)
		const scrolly = document.getElementById("messagecontainer")
		this.messageids[messagez.id] = messagez

		let shouldScroll = false
		if (this.localuser.lookingguild.prevchannel === this) {
			shouldScroll = scrolly.scrollTop + scrolly.clientHeight > scrolly.scrollHeight - 20
			document.getElementById("messages").appendChild(messagez.buildhtml(this.messages[1]))
		}
		if (shouldScroll) scrolly.scrollTop = scrolly.scrollHeight

		if (messagez.author == this.localuser.user) return
		if (this.localuser.lookingguild.prevchannel === this && document.hasFocus()) return

		if (this.notification == "all" || (this.notification == "mentions" && messagez.mentionsuser(this.localuser.user))) this.notify(messagez)
	}
	notititle(message) {
		return message.author.username + " > " + this.guild.properties.name + " > " + this.name
	}
	async notify(message) {
		Audio.noises(Audio.getNotificationSound())
		if (!("Notification" in window)) return

		if (Notification.permission == "granted") {
			let noticontent = markdown(message.content).textContent
			if (message.embeds[0] && !noticontent)
				noticontent = message.embeds.find(embed => embed.json.title)?.json.title ||
					markdown(message.embeds.find(embed => embed.json.description)?.json.description).textContent

			if (message.system) noticontent ||= "System Message"
			else noticontent ||= "Blank Message"

			let imgurl = null
			const images = message.getimages()
			if (images.length > 0) {
				const image = images[0]
				imgurl ||= image.proxy_url || image.url
			}

			const notification = new Notification(this.notititle(message), {
				body: noticontent,
				icon: message.author.getpfpsrc(),
				image: imgurl
			})
			notification.addEventListener("click", () => {
				window.focus()
				this.getHTML()
			})
		} else if (Notification.permission != "denied") {
			const result = await Notification.requestPermission()
			if (result == "granted") this.notify(message)
		}
	}
}

Channel.setupcontextmenu()
