"use strict"

class Channel {
	idToPrev = new Map()
	idToNext = new Map()
	static contextmenu = new Contextmenu()
	static setupcontextmenu() {
		this.contextmenu.addbutton("Copy channel id", function() {
			navigator.clipboard.writeText(this.id)
		})

		this.contextmenu.addbutton("Mark as read", function() {
			this.readbottom()
		})

		this.contextmenu.addbutton("Settings", function() {
			this.generateSettings()
		})

		this.contextmenu.addbutton("Delete channel", function() {
			this.deleteChannel()
		}, null, owner => owner.isAdmin())

		this.contextmenu.addbutton("Edit channel", function() {
			editchannel(this)
		}, null, owner => owner.isAdmin())
	}
	generateSettings() {
		this.sortPerms()
		const settings = new Settings("Settings for " + this.name)
		const s1 = settings.addButton("roles")
		s1.options.push(new RoleList(this.permission_overwritesar, this.guild, this.updateRolePermissions.bind(this), true))
		settings.show()
	}
	sortPerms() {
		this.permission_overwritesar.sort((a, b) => {
			return this.guild.roles.findIndex(role => role.id == a[0]) - this.guild.roles.findIndex(role => role.id == b[0])
		})
	}

	setUpInfiniteScroller() {
		const ids = {}
		this.infinite = new InfiniteScroller((async (id, offset) => {
			if (offset == 1) {
				if (this.idToPrev.has(id)) return this.idToPrev.get(id)
				else {
					await this.grabmoremessages(id)
					return this.idToPrev.get(id)
				}
			} else {
				return this.idToNext.get(id)
			}
		}), (id => {
			let res
			const promise = new Promise(_ => {
				res = _
			})
			const html = this.messageids.get(id).buildhtml(this.messageids.get(this.idToPrev.get(id)), promise)
			ids[id] = res
			return html
		}), (id => {
			ids[id]()
			delete ids[id]
			return true
		}), this.readbottom.bind(this))
	}

	constructor(json, owner) {
		if (json == -1) return

		this.type = json.type
		this.owner = owner
		this.headers = this.owner.headers
		this.name = json.name
		this.id = json.id
		this.parent_id = json.parent_id
		this.parent = null
		this.children = []
		this.guild_id = json.guild_id
		this.messageids = new Map()
		this.topic = json.topic
		this.nsfw = json.nsfw
		this.position = json.position
		this.lastreadmessageid = null
		this.lastmessageid = json.last_message_id
		this.setUpInfiniteScroller()

		this.permission_overwrites = {}
		this.permission_overwritesar = []
		for (const override of json.permission_overwrites) {
			this.permission_overwrites[override.id] = new Permissions(override.allow, override.deny)
			this.permission_overwritesar.push([override.id, this.permission_overwrites[override.id]])
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
	createGuildHTML(admin = false) {
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
				childrendiv.appendChild(channel2.createGuildHTML(admin))
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
		if (confirm("Do you really want to delete the channel \"" + this.name + "\"?")) fetch(instance.api + "/channels/" + this.id, {
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
		if (this.messageids.has(id)) return this.messageids.get(id)

		const gety = await fetch(instance.api + "/channels/" + this.id + "/messages?limit=1&around=" + id, {
			headers: this.headers
		})
		const json = await gety.json()
		return new Message(json[0], this)
	}
	static genid = 0
	async getHTML() {
		const id = ++Channel.genid
		if (this.owner != this.localuser.lookingguild) this.owner.loadGuild()

		if (this.localuser.channelfocus && this.localuser.channelfocus.myhtml) this.localuser.channelfocus.myhtml.classList.remove("viewChannel")
		this.myhtml.classList.add("viewChannel")

		this.owner.prevchannel = this
		this.localuser.channelfocus = this
		const prom = this.infinite.delete()
		await this.putmessages()
		await prom
		if (id != Channel.genid) return

		this.makereplybox()
		this.buildmessages()

		history.pushState(null, "", "/channels/" + this.guild_id + "/" + this.id)
		document.getElementById("channelname").textContent = "#" + this.name

		if (this.canMessage) {
			document.getElementById("typebox").disabled = false
			document.getElementById("typebox").placeholder = ""
		} else {
			document.getElementById("typebox").disabled = true
			document.getElementById("typebox").placeholder = "You cannot send messages here"
		}
	}
	async putmessages() {
		if (this.allthewayup) return

		const res = await fetch(instance.api + "/channels/" + this.id + "/messages?limit=100", {
			headers: this.headers
		})

		const json = await res.json()
		if (json.length != 100) this.allthewayup = true

		let prev
		for (const thing of json) {
			const message = new Message(thing, this)
			if (prev) {
				this.idToNext.set(message.id, prev.id)
				this.idToPrev.set(prev.id, message.id)
			}
			prev = message

			if (this.messageids.get(message.id) === void 0) this.messageids.get(message.id) = message
		}
	}
	delChannel(json) {
		const build = []
		for (const child of this.children) {
			if (child.id != json.id) build.push(child)
		}
		this.children = build
	}
	async grabmoremessages(id) {
		if (this.allthewayup) return

		const res = await fetch(instance.api + "/channels/" + this.id + "/messages?before=" + id + "&limit=100", {
			headers: this.headers
		})
		const json = await res.json()

		let next
		if (json.length < 100) this.allthewayup = true

		let previd = id
		for (const i in json) {
			let messager
			if (next) messager = next
			else messager = new Message(json[i], this)

			if (json[Number(i) + 1] === void 0) next = void 0
			else next = new Message(json[Number(i) + 1], this)

			if (this.messageids.get(messager.id) === void 0) {
				this.idToNext.set(messager.id, previd)
				this.idToPrev.set(previd, messager.id)
				previd = messager.id
				this.messageids.set(messager.id, messager)
			} else console.trace("How???")
		}
	}
	buildmessage(message, next) {
		const built = message.buildhtml(next)
		document.getElementById("messages").prepend(built)
	}
	buildmessages() {
		const messages = document.getElementById("channelw")
		messages.innerHTML = ""
		messages.append(this.infinite.getDiv(this.lastmessageid))
	}
	updateChannel(json) {
		this.type = json.type
		this.name = json.name
		this.parent_id = json.parent_id
		this.parent = null
		this.children = []
		this.guild_id = json.guild_id
		this.messageids = new Map()
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
			message_id: replyingto.id
		}

		const body = {
			content,
			nonce: Math.floor(Math.random() * 1000000000)
		}
		if (replyjson) body.message_reference = replyjson

		if (attachments.length == 0) return await fetch(instance.api + "/channels/" + this.id + "/messages", {
			method: "POST",
			headers: this.headers,
			body: JSON.stringify(body)
		})

		const formData = new FormData()

		formData.append("payload_json", JSON.stringify(body))
		for (const i in attachments) {
			formData.append("files[" + i + "]", attachments[i])
		}

		return await fetch(instance.api + "/channels/" + this.id + "/messages", {
			method: "POST",
			headers: {
				Authorization: this.headers.Authorization
			},
			body: formData
		})
	}
	messageCreate(messagep) {
		if (!this.hasPermission("VIEW_CHANNEL")) return

		const messagez = new Message(messagep.d, this)
		this.idToNext.set(this.lastmessageid, messagez.id)
		this.idToPrev.set(messagez.id, this.lastmessageid)
		this.lastmessageid = messagez.id
		this.messageids.set(messagez.id, messagez)

		if (messagez.author === this.localuser.user) {
			this.lastreadmessageid = messagez.id
			if (this.myhtml) this.myhtml.classList.remove("cunread")
		} else if (this.myhtml) this.myhtml.classList.add("cunread")

		this.guild.unreads()
		this.infinite.addedBottom()

		if (messagez.author === this.localuser.user) return
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
			let noticontent = message.content.textContent
			// TODO: Sync from upstream
			/*if (message.embeds[0] && !noticontent)
				noticontent = message.embeds.find(embed => embed.json.title)?.json.title ||
					markdown(message.embeds.find(embed => embed.json.description)?.json.description).textContent*/

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
	async addRoleToPerms(role) {
		await fetch(instance.api + "/channels/" + this.id + "/permissions/" + role.id, {
			method: "PUT",
			headers: this.headers,
			body: JSON.stringify({
				allow: "0",
				deny: "0",
				id: role.id,
				type: 0
			})
		})
		const perm = new Permissions("0", "0")
		this.permission_overwrites[role.id] = perm
		this.permission_overwritesar.push([role.id, perm])
	}
	async updateRolePermissions(id, perms) {
		const permision = this.permission_overwrites[id]
		permision.allow = perms.allow
		permision.deny = perms.deny
		await fetch(instance.api + "/channels/" + this.id + "/permissions/" + id, {
			method: "PUT",
			headers: this.headers,
			body: JSON.stringify({
				allow: permision.allow.toString(),
				deny: permision.deny.toString(),
				id,
				type: 0
			})
		})
	}
}

Channel.setupcontextmenu()
