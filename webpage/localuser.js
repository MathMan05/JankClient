class localuser {
	constructor(ready) {
		this.ready = ready
		this.guilds = []
		this.guildids = {}
		this.user = user.checkuser(ready.d.user)
		this.channelfocus = null
		this.lookingguild = null
		this.guildhtml = {}

		this.settings = this.ready.d.user_settings
		localStorage.setItem("theme", this.settings.theme)
		setTheme(this.settings.theme)

		for (const thing of ready.d.guilds) {
			const temp = new guild(thing, this)
			this.guilds.push(temp)
			this.guildids[temp.id] = temp
		}

		const temp = new direct(ready.d.private_channels, this)
		this.guilds.push(temp)
		this.guildids[temp.id] = temp

		for (const thing of ready.d.merged_members) {
			const mergedMember = new member(thing[0])
			this.guildids[mergedMember.guild_id].giveMember(mergedMember)
		}

		for (const thing of ready.d.read_state.entries) {
			const guild = this.resolveGuildidFromChannelID(thing.id)
			if (!guild) continue

			const guildid = guild.id
			this.guildids[guildid].channelids[thing.channel_id].readStateInfo(thing)
		}
		this.typing = []
	}
	resolveGuildidFromChannelID(ID) {
		let resolve = this.guilds.find(guild => guild.channelids[ID])
		resolve ??= void 0
		return resolve
	}
	updateChannel(json) {
		this.guildids[json.guild_id].updateChannel(json)
		if (json.guild_id == this.lookingguild.id) {
			this.loadGuild(json.guild_id)
		}
	}
	createChannel(json) {
		json.guild_id ??= "@me"
		this.guildids[json.guild_id].createChannelpac(json)
		if (json.guild_id == this.lookingguild.id) {
			this.loadGuild(json.guild_id)
		}
	}
	delChannel(json) {
		json.guild_id ??= "@me"
		this.guildids[json.guild_id].delChannel(json)
		if (json.guild_id == this.lookingguild.id) this.loadGuild(json.guild_id)
	}
	init() {
		const loc = location.href.split("/")
		if (loc[3] == "channels") {
			const guild = this.loadGuild(loc[4])
			guild.loadChannel(loc[5])
			this.channelfocus = loc[5]
		}
		this.buildservers()
	}
	loaduser() {
		document.getElementById("username").textContent = this.user.username
		document.getElementById("userpfp").src = this.user.getpfpsrc()
		document.getElementById("status").textContent = this.settings.status
	}
	isAdmin() {
		return this.lookingguild.isAdmin()
	}
	loadGuild(id) {
		const guild = this.guildids[id]
		this.lookingguild = guild
		document.getElementById("servername").textContent = guild.properties.name
		document.getElementById("channels").innerHTML = ""
		document.getElementById("channels").appendChild(guild.getHTML())
		return guild
	}
	buildservers() {
		const serverlist = document.getElementById("servers")

		const div = document.createElement("div")
		div.textContent = "⌂"
		div.classList.add("home", "servericon")
		div.all = this.guildids["@me"]
		serverlist.appendChild(div)
		div.onclick = function() {
			this.all.loadGuild()
			this.all.loadChannel()
		}
		const sentdms = document.createElement("div")
		sentdms.classList.add("sentdms")
		serverlist.append(sentdms)
		sentdms.id = "sentdms"

		const br = document.createElement("hr")
		br.classList.add("lightbr")
		serverlist.appendChild(br)

		for (const thing of this.guilds) {
			if (thing instanceof direct) {
				thing.unreaddms()
				continue
			}
			const divy = document.createElement("div")
			divy.classList.add("servernoti")

			const noti = document.createElement("div")
			noti.classList.add("unread")
			divy.append(noti)
			this.guildhtml[thing.id] = divy
			if (thing.properties.icon === null) {
				const div2 = document.createElement("div")
				let build = ""
				for (const char of thing.properties.name.split(" ")) build += char[0]

				div2.textContent = build
				div2.classList.add("blankserver", "servericon")
				divy.appendChild(div2)
				div2.all = thing
				div2.onclick = function() {
					this.all.loadGuild()
					this.all.loadChannel()
				}
			} else {
				const img = document.createElement("img")
				img.classList.add("pfp", "servericon")
				img.crossOrigin = "anonymous"
				img.src = instance.cdn + "/icons/" + thing.properties.id + "/" + thing.properties.icon + ".png"
				divy.appendChild(img)
				img.all = thing
				img.onclick = function() {
					console.log(this.all.loadGuild)
					this.all.loadGuild()
					this.all.loadChannel()
				}
			}
			serverlist.append(divy)
		}
		this.unreads()

		const br2 = document.createElement("hr")
		br2.classList.add("lightbr")
		serverlist.appendChild(br2)

		const div2 = document.createElement("div")
		div2.textContent = "+"
		div2.classList.add("home", "servericon")
		serverlist.appendChild(div2)
		div2.addEventListener("click", () => {
			inviteModal.show()
		})
	}
	messageCreate(messagep) {
		messagep.d.guild_id ??= "@me"
		this.guildids[messagep.d.guild_id].channelids[messagep.d.channel_id].messageCreate(messagep, this.channelfocus == messagep.d.channel_id)
		this.unreads()
	}
	unreads() {
		for (const thing of this.guilds) {
			if (thing.id == "@me") continue

			thing.unreads(this.guildhtml[thing.id])
		}
	}
	typingStart(typing) {
		if (this.channelfocus == typing.d.channel_id) {
			const memb = typing.d.member
			let name
			if (memb.id == this.user.id) return

			if (memb.nick) name = memb.nick
			else name = memb.user.username

			let already = false
			for (const thing of this.typing) {
				if (thing[0] == name) {
					thing[1] = Date.now()
					already = true
					break
				}
			}
			if (!already) {
				this.typing.push([name, Date.now()])
			}
			setTimeout(this.rendertyping.bind(this), 10000)
			this.rendertyping()
		}
	}
	updatepfp(file) {
		const reader = new FileReader()
		reader.readAsDataURL(file)
		reader.onload = function() {
			fetch(instance.api + "/users/@me", {
				method: "PATCH",
				headers: {
					"Content-type": "application/json; charset=UTF-8",
					Authorization: token
				},
				body: JSON.stringify({
					avatar: reader.result
				})
			})
			console.log(reader.result)
		}
	}
	updatepronouns(pronouns) {
		fetch(instance.api + "/users/@me/profile", {
			method: "PATCH",
			headers: {
				"Content-type": "application/json; charset=UTF-8",
				Authorization: token
			},
			body: JSON.stringify({
				pronouns
			})
		})
	}
	updatebio(bio) {
		fetch(instance.api + "/users/@me/profile", {
			method: "PATCH",
			headers: {
				"Content-type": "application/json; charset=UTF-8",
				Authorization: token
			},
			body: JSON.stringify({
				bio
			})
		})
	}
	updateSettings(settings = {}) {
		fetch(instance.api + "/users/@me/settings", {
			method: "PATCH",
			headers: {
				"Content-type": "application/json; charset=UTF-8",
				Authorization: token
			},
			body: JSON.stringify(settings)
		})
	}
	rendertyping() {
		const typingtext = document.getElementById("typing")
		const typingUsers = []
		let showing = false
		let i = 0
		for (const thing of this.typing) {
			i++
			if (thing[1] > Date.now() - 5000) {
				typingUsers.push(thing[0])
				showing = true
			}
		}

		if (showing) {
			typingtext.classList.remove("hidden")
			document.getElementById("typingtext").textContent = typingUsers.length > 1
				? typingUsers.slice(-1).join(", ") + " and " + typingUsers.at(-1) + " are typing"
				: typingUsers[0] + " is typing"
		} else typingtext.classList.add("hidden")
	}
}
