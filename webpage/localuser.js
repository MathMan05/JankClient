"use strict"

let connectionSucceed = 0
let heartbeatInterval = 0
let errorBackoff = 0
const wsCodesRetry = new Set([4000, 4003, 4005, 4007, 4008, 4009])

// eslint-disable-next-line no-unused-vars
class LocalUser {
	constructor(userinfo) {
		this.token = userinfo.token
		this.userinfo = userinfo
		this.serverurls = this.userinfo.serverurls
		this.initialized = false
		this.headers = {
			"Content-Type": "application/json; charset=UTF-8",
			Authorization: this.userinfo.token
		}
	}

	gottenReady(ready) {
		this.initialized = true
		this.ready = ready
		this.guilds = []
		this.guildids = {}
		this.user = User.checkuser(ready.d.user, this)
		this.userinfo.username = this.user.username
		this.userinfo.pfpsrc = this.user.getpfpsrc()
		this.usersettings = null
		this.channelfocus = null
		this.lookingguild = null
		this.guildhtml = {}

		const members = {}
		for (const thing of ready.d.merged_members) {
			members[thing[0].guild_id] = thing[0]
		}

		this.settings = this.ready.d.user_settings
		localStorage.setItem("theme", this.settings.theme)
		setTheme(this.settings.theme)

		for (const thing of ready.d.guilds) {
			const temp = new Guild(thing, this, members[thing.id])
			this.guilds.push(temp)
			this.guildids[temp.id] = temp
		}

		const dmChannels = new Direct(ready.d.private_channels, this)
		this.guilds.push(dmChannels)
		this.guildids[dmChannels.id] = dmChannels

		for (const guildSettings of ready.d.user_guild_settings.entries) {
			this.guildids[guildSettings.guild_id].notisetting(guildSettings)
		}

		for (const thing of ready.d.read_state.entries) {
			const guild = this.resolveChannelFromID(thing.id)?.guild
			if (!guild) continue

			this.guildids[guild.id].channelids[thing.channel_id].readStateInfo(thing)
		}
		this.typing = []
	}
	outoffocus() {
		document.getElementById("servers").innerHTML = ""
		document.getElementById("channels").innerHTML = ""
		document.getElementById("messages").innerHTML = ""
		this.lookingguild = null
		this.channelfocus = null
	}
	unload() {
		this.initialized = false
		clearInterval(heartbeatInterval)
		this.outoffocus()
		this.guilds = []
		this.guildids = {}
		this.ws.close(1000)
	}
	async initwebsocket() {
		let returny = null
		const promise = new Promise(resolve => {
			returny = resolve
		})
		this.ws = new WebSocket(instance.gateway + "/?v=9&encoding=json")

		this.ws.addEventListener("open", () => {
			console.log("WebSocket connected")
			this.ws.send(JSON.stringify({
				op: 2,
				d: {
					token: this.token,
					capabilities: 16381,
					properties: {
						os: "Hidden",
						device: "Hidden",
						browser: "Jank Client",
						client_build_number: 0,
						release_channel: "Custom"
					},
					compress: false,
					presence: {
						status: "online",
						since: Date.now(),
						activities: [],
						afk: false
					}
				}
			}))
		})

		this.ws.addEventListener("message", event => {
			const json = JSON.parse(event.data)
			console.log(json)

			if (json.op == 0) {
				switch (json.t) {
					case "MESSAGE_CREATE":
						if (this.initialized) this.messageCreate(json)
						break
					case "READY":
						this.gottenReady(json)
						this.genusersettings()
						returny()
						break
					case "MESSAGE_UPDATE":
						if (this.initialized) {
							if (this.channelfocus.id == json.d.channel_id) {
								for (const message of document.getElementById("messages").children) {
									if (message.all && message.all.id == json.d.id) {
										message.all.content = json.d.content
										message.txt.innerHTML = markdown(json.d.content).innerHTML
										break
									}
								}
							} else this.resolveChannelFromID(json.d.channel_id).messages.find(msg => msg.id == json.d.channel_id).content = json.d.content
						}
						break
					case "MESSAGE_DELETE":
						this.guildids[json.d.guild_id].channelids[json.d.channel_id].messageids[json.d.id].deleteEvent()
						break
					case "TYPING_START":
						if (this.initialized) this.typingStart(json)
						break
					case "USER_UPDATE":
						if (this.initialized) {
							const users = User.userids[json.d.id]
							console.log(users, json.d)

							if (users) users.userupdate(json.d)
						}
						break
					case "CHANNEL_UPDATE":
						if (this.initialized) this.updateChannel(json.d)
						break
					case "CHANNEL_CREATE":
						if (this.initialized) this.createChannel(json.d)
						break
					case "CHANNEL_DELETE":
						if (this.initialized) this.delChannel(json.d)
						break
					case "GUILD_DELETE": {
						const guildy = this.guildids[json.d.id]
						delete this.guildids[json.d.id]
						this.guilds.splice(this.guilds.indexOf(guildy), 1)
						guildy.html.remove()

						if (this.guilds.length == 0) document.getElementById("bottomseparator").setAttribute("hidden", "")
						break
					}
					case "GUILD_CREATE": {
						const guildy = new Guild(json.d, this, this.user)
						this.guilds.push(guildy)
						this.guildids[guildy.id] = guildy

						document.getElementById("bottomseparator").removeAttribute("hidden")
						document.getElementById("servers").insertBefore(guildy.generateGuildIcon(), document.getElementById("bottomseparator"))
						break
					}
				}
			} else if (json.op == 1) this.ws.send(JSON.stringify({ op: 1, d: this.packets }))
			else if (json.op == 10) {
				this.packets = 1

				setTimeout(() => {
					this.ws.send(JSON.stringify({ op: 1, d: this.packets }))

					heartbeatInterval = setInterval(() => {
						if (connectionSucceed == 0) connectionSucceed = Date.now()

						console.log("Sending heartbeat at " + new Date().toTimeString())
						this.ws.send(JSON.stringify({ op: 1, d: this.packets }))
					}, json.d.heartbeat_interval)
				}, Math.round(json.d.heartbeat_interval * Math.random()))
			} else if (json.op != 11) this.packets++
		})

		this.ws.addEventListener("close", event => {
			console.log("WebSocket closed with code " + event.code + " at " + new Date().toTimeString())
			if (heartbeatInterval) clearInterval(heartbeatInterval)

			this.unload()
			document.getElementById("loading").classList.remove("doneloading")
			document.getElementById("loading").classList.add("loading")

			if (((event.code > 1000 && event.code < 1016) || wsCodesRetry.has(event.code))) {
				if (connectionSucceed != 0 && Date.now() > connectionSucceed + 20000) errorBackoff = 0
				else errorBackoff = Math.min(errorBackoff + 1, 40)
				connectionSucceed = 0

				document.getElementById("load-desc").innerHTML = "Unable to connect to the Spacebar server, retrying in <b>" + Math.round(0.2 + (errorBackoff * 2.8)) + "</b> seconds..."

				setTimeout(() => {
					document.getElementById("load-desc").textContent = "Retrying..."

					this.initwebsocket().then(() => {
						this.loaduser()
						this.init()
						document.getElementById("loading").classList.add("doneloading")
						document.getElementById("loading").classList.remove("loading")
					})
				}, 200 + (errorBackoff * 2800))
			} else document.getElementById("load-desc").textContent = "Unable to connect to the Spacebar server. Please try logging out and back in."
		})

		await promise
	}
	resolveChannelFromID(ID) {
		return this.guilds.find(guild => guild.channelids[ID])?.channelids[ID]
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
		this.buildservers()
		const loc = location.href.split("/")
		if (loc[3] == "channels") {
			const guildLoaded = this.loadGuild(loc[4])
			guildLoaded.loadChannel(loc[5])
			this.channelfocus = guildLoaded.channelids[loc[5]]
		}
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
		let guild = this.guildids[id]
		if (!guild) guild = this.guildids["@me"]
		if (this.lookingguild) this.lookingguild.html.classList.remove("serveropen")
		if (guild.html) guild.html.classList.add("serveropen")

		this.lookingguild = guild
		document.getElementById("servername").textContent = guild.properties.name
		document.getElementById("channels").innerHTML = ""
		document.getElementById("channels").appendChild(guild.getHTML())
		return guild
	}
	buildservers() {
		const outdiv = document.createElement("div")
		const serverlist = document.getElementById("servers")
		serverlist.innerHTML = ""

		const homeButton = document.createElement("p")
		homeButton.textContent = "⌂"
		homeButton.classList.add("home", "servericon")
		homeButton.all = this.guildids["@me"]
		homeButton.onclick = function() {
			this.all.loadGuild()
			this.all.loadChannel()
		}

		this.guildids["@me"].html = outdiv
		const unread = document.createElement("div")
		unread.classList.add("unread")
		outdiv.append(unread)
		outdiv.appendChild(homeButton)
		serverlist.append(outdiv)

		const sentdms = document.createElement("div")
		sentdms.classList.add("sentdms")
		serverlist.append(sentdms)
		sentdms.id = "sentdms"

		const hr = document.createElement("hr")
		hr.classList.add("lightbr")
		serverlist.appendChild(hr)

		for (const guild of this.guilds) {
			if (guild instanceof Direct) {
				guild.unreaddms()
				continue
			}

			const divy = guild.generateGuildIcon()
			serverlist.append(divy)
		}
		this.unreads()

		const hr2 = document.createElement("hr")
		hr2.id = "bottomseparator"
		hr2.classList.add("lightbr")
		if (this.guilds.length == 0) hr2.setAttribute("hidden", "")
		serverlist.appendChild(hr2)

		const joinCreateButton = document.createElement("p")
		joinCreateButton.textContent = "+"
		joinCreateButton.classList.add("home", "servericon")
		serverlist.appendChild(joinCreateButton)
		joinCreateButton.addEventListener("click", () => {
			this.createGuild()
		})

		const guildDiscoveryButton = document.createElement("p")
		guildDiscoveryButton.textContent = "🧭"
		guildDiscoveryButton.classList.add("home", "servericon")
		serverlist.appendChild(guildDiscoveryButton)
		guildDiscoveryButton.addEventListener("click", () => {
			this.guildDiscovery()
		})
	}
	createGuild() {
		let inviteurl = ""
		const inviteError = document.createElement("span")

		const full = new Dialog(["tabs", [
			["Join using invite", [
				"vdiv",
					["textbox",
						"Invite Link/Code",
						"",
						function() {
							inviteurl = this.value
						}
					],
					["html", inviteError],
					["button",
						"",
						"Submit",
						async () => {
							let parsed = ""
							if (inviteurl.includes("/")) parsed = inviteurl.split("/")[inviteurl.split("/").length - 1]
							else parsed = inviteurl

							const res = await fetch(instance.api + "/invites/" + parsed, {
								method: "POST",
								headers: this.headers
							})
							if (res.ok) full.hide()
							else {
								const json = await res.json()
								inviteError.textContent = json.message || "An error occurred (response code " + res.status + ")"
								console.error("Unable to join guild using " + inviteurl, json)
							}
						}
					]
			]],
			["Create Server", [
				"text", "Not currently implemented, sorry"
			]]
		]])
		full.show()
	}
	async guildDiscovery() {
		const container = document.createElement("div")
		container.textContent = "Loading..."

		const full = new Dialog(["html", container])
		full.show()

		const res = await fetch(instance.api + "/discoverable-guilds?limit=50", {
			headers: this.headers
		})
		if (!res.ok) return container.textContent = "An error occurred (response code " + res.status + ")"

		const json = await res.json()
		container.innerHTML = ""

		const title = document.createElement("h2")
		title.textContent = "Guild directory (" + json.total + " entries)"
		container.appendChild(title)

		const guilds = document.createElement("div")
		guilds.id = "directory-guild-content"

		json.guilds.forEach(guild => {
			const content = document.createElement("div")
			content.classList.add("discovery-guild")

			if (guild.banner) {
				const banner = document.createElement("img")
				banner.classList.add("banner")
				banner.crossOrigin = "anonymous"
				banner.src = instance.cdn + "/icons/" + guild.id + "/" + guild.banner + ".png?size=256"
				banner.alt = ""
				content.appendChild(banner)
			}

			const nameContainer = document.createElement("div")
			nameContainer.classList.add("flex")

			const img = document.createElement("img")
			img.classList.add("icon")
			img.crossOrigin = "anonymous"
			img.src = instance.cdn + "/" + (guild.icon ? ("icons/" + guild.id + "/" + guild.icon + ".png?size=48") : "embed/avatars/3.png")
			img.alt = ""
			nameContainer.appendChild(img)

			const name = document.createElement("h3")
			name.textContent = guild.name
			nameContainer.appendChild(name)
			content.appendChild(nameContainer)

			const desc = document.createElement("p")
			desc.textContent = guild.description
			content.appendChild(desc)

			content.addEventListener("click", async () => {
				const joinRes = await fetch(instance.api + "/guilds/" + guild.id + "/members/@me", {
					method: "PUT",
					headers: this.headers
				})
				if (joinRes.ok) full.hide()
			})
			guilds.appendChild(content)
		})
		container.appendChild(guilds)
	}
	messageCreate(messagep) {
		messagep.d.guild_id ??= "@me"
		this.guildids[messagep.d.guild_id].channelids[messagep.d.channel_id].messageCreate(messagep)
		this.unreads()
	}
	unreads() {
		for (const thing of this.guilds) {
			if (thing.id == "@me") continue

			thing.unreads(this.guildhtml[thing.id])
		}
	}
	typingStart(typing) {
		if (this.channelfocus.id == typing.d.channel_id) {
			const memb = typing.d.member
			if (memb.id == this.user.id) return

			const name = memb.nick || memb.user.global_name || memb.user.username

			let already = false
			for (const thing of this.typing) {
				if (thing[0] == memb.id) {
					thing[2] = Date.now()
					already = true
					break
				}
			}
			if (!already) this.typing.push([memb.id, name, Date.now()])

			this.rendertyping()
			setTimeout(this.rendertyping.bind(this), 5000)
		}
	}
	updatepfp(file) {
		const headers = this.headers
		const reader = new FileReader()
		reader.readAsDataURL(file)
		reader.onload = function() {
			fetch(instance.api + "/users/@me", {
				method: "PATCH",
				headers,
				body: JSON.stringify({
					avatar: reader.result
				})
			})
		}
	}
	updatepronouns(pronouns) {
		fetch(instance.api + "/users/@me/profile", {
			method: "PATCH",
			headers: this.headers,
			body: JSON.stringify({
				pronouns
			})
		})
	}
	updatebio(bio) {
		fetch(instance.api + "/users/@me/profile", {
			method: "PATCH",
			headers: this.headers,
			body: JSON.stringify({
				bio
			})
		})
	}
	updateSettings(settings = {}) {
		fetch(instance.api + "/users/@me/settings", {
			method: "PATCH",
			headers: this.headers,
			body: JSON.stringify(settings)
		})
	}
	rendertyping() {
		const typingUsers = []
		let showing = false
		for (const thing of this.typing) {
			if (thing[2] > Date.now() - 5000) {
				typingUsers.push(thing[1])
				showing = true
			}
		}

		if (showing) {
			document.getElementById("typing").classList.remove("hidden")
			document.getElementById("typingtext").textContent = typingUsers.length > 1
				? typingUsers.slice(1).join(", ") + " and " + typingUsers[0] + " are typing"
				: typingUsers[0] + " is typing"
		} else document.getElementById("typing").classList.add("hidden")
	}
	genusersettings() {
		const hypothetcialprofie = document.createElement("div")
		let file = null
		let newprouns = null
		let newbio = null
		let newTheme = null

		let hypouser = new User(this.user, this, true)
		const regen = () => {
			hypothetcialprofie.textContent = ""
			const hypoprofile = hypouser.buildprofile(-1, -1)

			hypothetcialprofie.appendChild(hypoprofile)
		}
		regen()

		this.usersettings = new Dialog(
			["vdiv",
				["hdiv",
					["vdiv",
						["fileupload", "upload pfp:", event => {
							file = event.target.files[0]
							const blob = URL.createObjectURL(event.target.files[0])
							hypouser.avatar = blob
							hypouser.hypotheticalpfp = true
							regen()
						}],
						["textbox", "Pronouns:", this.user.pronouns, event => {
							hypouser.pronouns = event.target.value
							newprouns = event.target.value
							regen()
						}],
						["mdbox", "Bio:", this.user.bio, event => {
							hypouser.bio = event.target.value
							newbio = event.target.value
							regen()
						}]
					],
					["vdiv",
						["html", hypothetcialprofie]
					]
				],
				["select", "Theme", ["Dark", "Light"], event => {
					newTheme = event.target.value == "Light" ? "light" : "dark"
				}, thisuser.settings.theme == "light" ? 1 : 0],
				["select", "Notification sound:", Audio.sounds, e => {
					Audio.setNotificationSound(Audio.sounds[e.target.selectedIndex])
					Audio.noises(Audio.sounds[e.target.selectedIndex])
				}, Audio.sounds.indexOf(Audio.getNotificationSound())],
				["button", "update user content:", "submit", () => {
					if (file !== null) this.updatepfp(file)
					if (newprouns !== null) this.updatepronouns(newprouns)
					if (newbio !== null) this.updatebio(newbio)
					if (newTheme !== null) {
						thisuser.updateSettings({theme: newTheme})
						localStorage.setItem("theme", newTheme)

						setTheme(newTheme)
					}
				}]
			], () => {}, (() => {
				hypouser = User.checkuser(this.user, this)
				regen()
				file = null
				newprouns = null
				newbio = null
				newTheme = null
			}))
	}
}
