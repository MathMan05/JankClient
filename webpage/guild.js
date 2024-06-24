"use strict"

class guild {
	static contextmenu = new contextmenu()
	static setupcontextmenu() {
		guild.contextmenu.addbutton("Copy guild id", function() {
			navigator.clipboard.writeText(this.id)
		})

		guild.contextmenu.addbutton("Mark as read", function() {
			this.markAsRead()
		})

		guild.contextmenu.addbutton("Create Invite", function() {
			console.log(this)
		}, null, () => true, () => false)

		guild.contextmenu.addbutton("Notifications", function() {
			this.setnotifcation()
		})

		guild.contextmenu.addbutton("Leave guild", function() {
			this.confirmleave()
		}, null, g => g.properties.owner_id != g.member.user.id)

		guild.contextmenu.addbutton("Delete guild", function() {
			this.confirmDelete()
		}, null, g => g.properties.owner_id == g.member.user.id)
	}

	constructor(json, owner) {
		if (json == -1) return

		console.log(json)
		this.owner = owner
		this.headers = {
			"Content-Type": "application/json; charset=UTF-8",
			Authorization: this.owner.userinfo.token
		}

		this.channels = []
		this.channelids = {}
		this.id = json.id
		this.properties = json.properties
		this.roles = []
		this.roleids = {}
		this.prevchannel = void 0
		this.message_notifications = 0

		for (const roley of json.roles) {
			const roleh = new role(roley)
			this.roles.push(roleh)
			this.roleids[roleh.id] = roleh
		}
		for (const thing of json.channels) {
			const temp = new channel(thing, this)
			this.channels.push(temp)
			this.channelids[temp.id] = temp
		}
		this.headchannels = []
		for (const thing of this.channels) {
			if (thing.resolveparent(this)) {
				this.headchannels.push(thing)
			}
		}
	}
	printServers() {
		let build = ""
		for (const thing of this.headchannels) {
			build += (thing.name + ":" + thing.position) + "\n"
			for (const thingy of thing.children) {
				build += ("   " + thingy.name + ":" + thingy.position) + "\n"
			}
		}
	}
	calculateReorder() {
		let position = -1
		const build = []
		for (const thing of this.headchannels) {
			const thisthing = { id: thing.id }
			if (thing.position <= position) {
				thisthing.position = position + 1
				thing.position = thisthing.position
			}
			position = thing.position
			if (thing.move_id && thing.move_id != thing.parent_id) {
				thing.parent_id = thing.move_id
				thisthing.parent_id = thing.parent_id
				thing.move_id = void 0
			}
			if (thisthing.position || thisthing.parent_id) {
				build.push(thisthing)
				console.log(this.channelids[thisthing.parent_id])
			}
			if (thing.children.length > 0) {
				const things = thing.calculateReorder()
				for (const thing2 of things) {
					build.push(thing2)
				}
			}
		}
		console.log(build)
		this.printServers()
		if (build.length == 0) return

		fetch(instance.api + "/guilds/" + this.id + "/channels", {
			method: "PATCH",
			headers: this.headers,
			body: JSON.stringify(build)
		})
	}
	get localuser() {
		return this.owner
	}
	loadChannel(id) {
		this.owner.channelfocus = id
		this.channelids[id].getHTML()
	}
	sortchannels() {
		this.headchannels.sort((a, b) => a.position - b.position)
	}
	unreads(html) {
		if (html) this.html = html
		else html = this.html

		let read = true
		for (const thing of this.channels) {
			if (thing.hasunreads) {
				console.log(thing)
				read = false
				break
			}
		}
		if (!html) return

		if (read) html.children[0].classList.remove("notiunread")
		else html.children[0].classList.add("notiunread")
	}
	getHTML() {
		this.sortchannels()
		this.printServers()

		const build = document.createElement("div")
		if (this.id == "@me") build.classList.add("dm-container")
		for (const thing of this.headchannels) {
			build.appendChild(thing.createguildHTML(this.isAdmin()))
		}
		return build
	}
	isAdmin() {
		return this.member.isAdmin()
	}
	async markAsRead() {
		const build = {read_states: []}
		for (const thing of this.channels) {
			if (thing.hasunreads) {
				build.read_states.push({channel_id: thing.id, message_id: thing.lastmessageid, read_state_type: 0})
				thing.lastreadmessageid = thing.lastmessageid
				thing.myhtml.classList.remove("cunread")
			}
		}
		this.unreads()
		fetch(instance.api + "/read-states/ack-bulk", {
			method: "POST",
			headers: this.headers,
			body: JSON.stringify(build)
		})
	}
	fillMember(member) {
		member.guild = this
		const realroles = []
		for (const thing of member.roles) {
			realroles.push(this.getRole(thing))
		}
		member.guild = this
		member.roles = realroles
		return member
	}
	giveMember(member) {
		this.fillMember(member)
		this.member = member
	}
	getRole(ID) {
		return this.roleids[ID]
	}
	hasRole(r) {
		if (typeof r != "string") r = r.id
		return this.member.hasRole(r)
	}
	loadChannel(ID) {
		if (ID && this.channelids[ID]) {
			this.channelids[ID].getHTML()
			return
		}
		if (this.prevchannel) {
			console.log(this.prevchannel)
			this.prevchannel.getHTML()
			return
		}
		for (const thing of this.channels) {
			if (thing.children.length == 0) {
				thing.getHTML()
				return
			}
		}
	}
	loadGuild() {
		this.localuser.loadGuild(this.id)
	}
	updateChannel(json) {
		this.channelids[json.id].updateChannel(json)
		this.headchannels = []
		for (const thing of this.channels) {
			thing.children = []
		}
		for (const thing of this.channels) {
			if (thing.resolveparent(this)) this.headchannels.push(thing)
		}
		this.printServers()
	}
	createChannelpac(json) {
		const thischannel = new channel(json, this)
		this.channelids[json.id] = thischannel
		this.channels.push(thischannel)
		thischannel.resolveparent(this)
		if (!thischannel.parent) this.headchannels.push(thischannel)

		this.calculateReorder()
		this.printServers()
	}
	delChannel(json) {
		delete this.channelids[json.id]
		const build = []
		for (const thing of this.channels) {
			if (thing.id == json.id) {
				if (thing.parent) thing.parent.delChannel(json)
			} else build.push(thing)
		}
		this.channels = build
	}
	createChannel(name, type) {
		fetch(instance.api + "/guilds/" + this.id + "/channels", {
			method: "POST",
			headers: this.headers,
			body: JSON.stringify({ name, type })
		})
	}
	notisetting(settings) {
		this.message_notifications = settings.message_notifications
	}
	setnotifcation() {
		let noti = this.message_notifications
		const notiselect = new fullscreen(
		["vdiv",
			["radio","select notifications type",
				["all","only mentions","none"],
				function(e) {
					noti = ["all","only mentions","none"].indexOf(e)
				},
				noti
			],
			["button","","submit", () => {
				fetch(instance.api.toString() + "/v9/users/@me/guilds/settings",{
					method: "PATCH",
					headers: this.headers,
					body: JSON.stringify({
						guilds: {
							[this.id]: {
								message_notifications: noti
							}
						}
					})
				})
				this.message_notifications = noti
			}]
		])
		notiselect.show()
	}
	confirmleave() {
		const full = new fullscreen([
			"vdiv",
			["title",
				"Are you sure you want to leave?"
			],
			["hdiv",
				["button",
				"",
				"Yes, I'm sure",
				async () => {
					await this.leave()
					full.hide()
				}
				],
				["button",
				"",
				"Nevermind",
				_ => {
					full.hide()
				}
				]

			]
		])
		full.show()
	}
	async leave() {
		return fetch(instance.api.toString() + "/users/@me/guilds/" + this.id, {
			method: "DELETE",
			headers: this.headers
		})
	}
	generateGuildIcon() {
		const divy = document.createElement("div")
		divy.classList.add("servernoti")

		const noti = document.createElement("div")
		noti.classList.add("unread")
		divy.append(noti)
		this.localuser.guildhtml[this.id] = divy
		if (this.properties.icon === null) {
			const div = document.createElement("div")
			div.textContent = this.properties.name.split(" ").map(e => e[0]).join("")
			div.classList.add("blankserver", "servericon")
			divy.appendChild(div)
			div.onclick = () => {
				this.loadGuild()
				this.loadChannel()
			}
			guild.contextmenu.bind(div, this)
		} else {
			const img = document.createElement("img")
			img.classList.add("pfp", "servericon")
			img.src = instance.cdn + "/icons/" + this.properties.id + "/" + this.properties.icon + ".png"
			divy.appendChild(img)
			img.onclick = () => {
				this.loadGuild()
				this.loadChannel()
			}
			guild.contextmenu.bind(img, this)
		}
		return divy
	}
	confirmDelete() {
		let confirmname = ""
		const full = new fullscreen([
			"vdiv",
			["title",
				"Are you sure you want to delete " + this.properties.name + "?"
			],
			["textbox",
				"Name of server:",
				"",
				function() {
					confirmname = this.value
				}
			],
			["hdiv",
				["button",
				"",
				"Yes, I'm sure",
				async () => {
					console.log(confirmname)
					if (confirmname == this.properties.name) return

					await this.delete()
					full.hide()
				}
				],
				["button",
				"",
				"Nevermind",
				_ => {
					full.hide()
				}
				]

			]
		])
		full.show()
	}
	async delete() {
		return fetch(instance.api.toString() + "/guilds/" + this.id + "/delete", {
			method: "POST",
			headers: this.headers
		})
	}
}

guild.setupcontextmenu()
