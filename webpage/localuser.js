"use strict"

let connectionSucceed = 0
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
		this.guildids = new Map()
		this.guildhtml = new Map()
		this.user = User.checkuser(ready.d.user, this)
		this.userinfo.username = this.user.username
		this.userinfo.pfpsrc = this.user.getpfpsrc()
		this.usersettings = null
		this.channelfocus = null
		this.lookingguild = null

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
			this.guildids.set(temp.id, temp)
		}

		const dmChannels = new Direct(ready.d.private_channels, this)
		this.guilds.push(dmChannels)
		this.guildids.set(dmChannels.id, dmChannels)

		for (const guildSettings of ready.d.user_guild_settings.entries) {
			this.guildids.get(guildSettings.guild_id).notisetting(guildSettings)
		}

		for (const thing of ready.d.read_state.entries) {
			const guild = this.resolveChannelFromID(thing.id)?.guild
			if (!guild) continue

			this.guildids.get(guild.id).channelids[thing.channel_id].readStateInfo(thing)
		}
		this.typing = []
	}
	outoffocus() {
		document.getElementById("servers").innerHTML = ""
		document.getElementById("channels").innerHTML = ""
		this.lookingguild = null
		if (this.channelfocus) this.channelfocus.infinite.delete()
		this.channelfocus = null
	}
	unload() {
		if (this.heartbeatTimeout) clearTimeout(this.heartbeatTimeout)
		this.initialized = false
		this.outoffocus()
		this.guilds = []
		this.guildids = new Map()
		this.ws.close(1000)
		SnowFlake.clear()
		User.clear()
	}
	lastSequence = null
	async initwebsocket() {
		let returny = null
		const promise = new Promise(resolve => {
			returny = resolve
		})
		this.ws = new WebSocket(instance.gateway + "/?v=9&encoding=json" + ("DecompressionStream" in window ? "&compress=zlib-stream" : ""))

		this.ws.addEventListener("open", () => {
			console.log("WebSocket connected")
			this.ws.send(JSON.stringify({
				op: 2,
				d: {
					token: this.token,
					capabilities: 16381,
					properties: {
						os: "Redacted",
						device: "Redacted",
						browser: "Jank Client (Tomato fork)",
						client_build_number: 0,
						release_channel: "Custom"
					},
					compress: "DecompressionStream" in window,
					presence: {
						status: "online",
						since: Date.now(),
						activities: [],
						afk: false
					}
				}
			}))
		})

		let ds
		let w
		let r
		let arr
		if ("DecompressionStream" in window) {
			ds = new DecompressionStream("deflate")
			w = ds.writable.getWriter()
			r = ds.readable.getReader()
			arr = new Uint8Array()
		}

		let build = ""
		this.ws.addEventListener("message", async event => {
			let temp
			if (event.data instanceof Blob) {
				const buff = await event.data.arrayBuffer()
				const array = new Uint8Array(buff)
				const temparr = new Uint8Array(array.length + arr.length)
				temparr.set(arr, 0)
				temparr.set(array, arr.length)
				arr = temparr
				const len = array.length
				if (!(array[len - 1] == 255 && array[len - 2] == 255 && array[len - 3] == 0 && array[len - 4] == 0)) return

				w.write(arr.buffer)
				arr = new Uint8Array()

				while (true) {
					const read = await r.read()
					const data = new TextDecoder().decode(read.value)
					if (data == "") break

					build += data
					try {
						temp = JSON.parse(build)
						build = ""
						if (temp.op == 0 && temp.t == "READY") returny()
						this.handleEvent(temp)
					} catch {}
				}
			} else temp = JSON.parse(event.data)

			if (temp.op == 0 && temp.t == "READY") returny()
			this.handleEvent(temp)
		})

		this.ws.addEventListener("close", event => {
			console.log("WebSocket closed with code " + event.code)

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

						document.getElementById("load-desc").textContent = "This shouldn't take long"
					})
				}, 200 + (errorBackoff * 2800))
			} else document.getElementById("load-desc").textContent = "Unable to connect to the Spacebar server. Please try logging out and back in."
		})

		await promise
	}
	handleEvent(json) {
		console.log(json)

		if (json.s) this.lastSequence = json.s

		if (json.op == 0) {
			switch (json.t) {
				case "MESSAGE_CREATE":
					if (this.initialized) this.messageCreate(json)
					break
				case "MESSAGE_DELETE":
					SnowFlake.getSnowFlakeFromID(json.d.id, Message).getObject().deleteEvent()
					break
				case "READY":
					this.gottenReady(json)
					this.genusersettings()
					break
				case "MESSAGE_UPDATE":
					const message = SnowFlake.getSnowFlakeFromID(json.d.id, Message).getObject()
					message.giveData(json.d)
					break
				case "MESSAGE_REACTION_ADD":
					const messageReactionAdd = SnowFlake.getSnowFlakeFromID(json.d.message_id, Message).getObject()
					messageReactionAdd.handleReactionAdd(json.d)
					break
				case "MESSAGE_REACTION_REMOVE":
					const messageReactionRemove = SnowFlake.getSnowFlakeFromID(json.d.message_id, Message).getObject()
					messageReactionRemove.handleReactionRemove(json.d)
					break
				case "TYPING_START":
					if (this.initialized) this.typingStart(json)
					break
				case "USER_UPDATE":
					if (this.initialized) {
						const user = SnowFlake.getSnowFlakeFromID(json.d.id, User).getObject()
						if (user) user.userupdate(json.d)
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
					const guildy = this.guildids.get(json.d.id)
					this.guildids.delete(json.d.id)
					this.guilds.splice(this.guilds.indexOf(guildy), 1)
					guildy.html.remove()

					if (this.guilds.length <= 1) document.getElementById("bottomseparator").setAttribute("hidden", "")
					break
				}
				case "GUILD_CREATE": {
					const guildy = new Guild(json.d, this, this.user)
					this.guilds.push(guildy)

					document.getElementById("bottomseparator").removeAttribute("hidden")
					this.guildids.set(guildy.id, guildy)
					document.getElementById("servers").insertBefore(guildy.generateGuildIcon(), document.getElementById("bottomseparator"))
					break
				}
			}
		} else if (json.op == 1) this.ws.send(JSON.stringify({ op: 1, d: this.lastSequence }))
		else if (json.op == 10) {
			this.heartbeatInterval = json.d.heartbeat_interval

			setTimeout(() => {
				this.ws.send(JSON.stringify({ op: 1, d: this.lastSequence }))
			}, Math.round(json.d.heartbeat_interval * Math.random()))
		} else if (json.op == 11) {
			this.heartbeatTimeout = setTimeout(() => {
				if (connectionSucceed == 0) connectionSucceed = Date.now()

				this.ws.send(JSON.stringify({ op: 1, d: this.lastSequence }))
			}, this.heartbeatInterval)
		}
	}
	resolveChannelFromID(ID) {
		return this.guilds.find(guild => guild.channelids[ID])?.channelids[ID]
	}
	updateChannel(json) {
		SnowFlake.getSnowFlakeFromID(json.guild_id, Guild).getObject().updateChannel(json)

		if (json.guild_id == this.lookingguild.snowflake) this.loadGuild(json.guild_id)
	}
	createChannel(json) {
		json.guild_id ??= "@me"
		SnowFlake.getSnowFlakeFromID(json.guild_id, Guild).getObject().createChannelpac(json)

		if (json.guild_id == this.lookingguild.snowflake) this.loadGuild(json.guild_id)
	}
	delChannel(json) {
		json.guild_id ??= "@me"
		this.guildids.get(json.guild_id).delChannel(json)

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
		document.getElementById("discriminator").textContent = "#" + this.user.discriminator
	}
	isAdmin() {
		return this.lookingguild.isAdmin()
	}
	loadGuild(id) {
		const guild = this.guildids.get(id) || this.guildids.get("@me")

		if (this.lookingguild) this.lookingguild.html.classList.remove("serveropen")
		this.lookingguild = guild

		if (guild.html) guild.html.classList.add("serveropen")
		else setTimeout(() => {
			if (guild.html) guild.html.classList.add("serveropen")
		}, 200)

		document.getElementById("servername").textContent = guild.properties.name
		document.getElementById("channels").innerHTML = ""
		document.getElementById("channels").appendChild(guild.getHTML())
		return guild
	}
	async buildservers() {
		const outdiv = document.createElement("div")
		const serverlist = document.getElementById("servers")
		serverlist.innerHTML = ""

		const homeButton = document.createElement("p")
		homeButton.classList.add("home", "servericon")
		homeButton.appendChild(await LocalUser.loadSVG("home"))
		homeButton.all = this.guildids.get("@me")
		homeButton.onclick = function() {
			this.all.loadGuild()
			this.all.loadChannel()
		}

		this.guildids.get("@me").html = outdiv
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
		if (this.guilds.length <= 1) hr2.setAttribute("hidden", "")
		serverlist.appendChild(hr2)

		const joinCreateButton = document.createElement("p")
		joinCreateButton.classList.add("home", "servericon")
		joinCreateButton.appendChild(await LocalUser.loadSVG("add"))
		serverlist.appendChild(joinCreateButton)
		joinCreateButton.addEventListener("click", () => {
			this.createGuild()
		})

		const guildDiscoveryButton = document.createElement("div")
		guildDiscoveryButton.classList.add("home", "servericon")
		guildDiscoveryButton.appendChild(await LocalUser.loadSVG("guildDiscovery"))
		serverlist.appendChild(guildDiscoveryButton)
		guildDiscoveryButton.addEventListener("click", () => {
			this.guildDiscovery()
		})
	}
	createGuild() {
		let inviteurl = ""
		const inviteError = document.createElement("span")

		let serverName = ""
		const serverCreateError = document.createElement("span")

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
			["Create server", [
				"vdiv",
					["textbox",
						"Server name",
						"",
						function() {
							serverName = this.value
						}
					],
					["html", serverCreateError],
					["button",
						"",
						"Submit",
						async () => {
							const res = await fetch(instance.api + "/guilds", {
								method: "POST",
								headers: this.headers,
								body: JSON.stringify({
									name: serverName
								})
							})
							if (res.ok) full.hide()
							else {
								const json = await res.json()
								serverCreateError.textContent = json.message || "An error occurred (response code " + res.status + ")"
								console.error("Unable to create guild", json)
							}
						}
					]
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
		title.textContent = "Server discovery (" + json.total + " entries)"
		container.appendChild(title)

		const guilds = document.createElement("div")
		guilds.id = "discovery-guild-content"

		json.guilds.forEach(guild => {
			const content = document.createElement("div")
			content.classList.add("discovery-guild")

			if (guild.banner) {
				const banner = document.createElement("img")
				banner.classList.add("banner")
				banner.crossOrigin = "anonymous"
				banner.src = instance.cdn + "/icons/" + guild.id + "/" + guild.banner + ".png?size=256"
				banner.alt = ""
				banner.loading = "lazy"
				content.appendChild(banner)
			}

			const nameContainer = document.createElement("div")
			nameContainer.classList.add("flex")

			const img = document.createElement("img")
			img.classList.add("pfp", "servericon")
			img.crossOrigin = "anonymous"
			img.src = instance.cdn + "/" + (guild.icon ? ("icons/" + guild.id + "/" + guild.icon + ".png?size=48") : "embed/avatars/3.png")
			img.alt = ""
			img.loading = "lazy"
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
		this.guildids.get(messagep.d.guild_id).channelids[messagep.d.channel_id].messageCreate(messagep)
		this.unreads()
	}
	unreads() {
		for (const thing of this.guilds) {
			if (thing.id == "@me") continue

			thing.unreads(this.guildhtml.get(thing.id))
		}
	}
	typingStart(typing) {
		if (this.channelfocus.snowflake == typing.d.channel_id) {
			const memb = typing.d.member
			if (memb.id == this.user.id) return

			let already = false
			for (const thing of this.typing) {
				if (thing[0] == memb.id) {
					thing[2] = Date.now()
					already = true
					break
				}
			}
			if (!already) this.typing.push([memb.id, memb.nick || memb.user.global_name || memb.user.username, Date.now()])

			this.rendertyping()
			setTimeout(this.rendertyping.bind(this), 5000)
		}
	}
	updatepfp(file) {
		const reader = new FileReader()
		reader.readAsDataURL(file)
		reader.onload = () => {
			fetch(instance.api + "/users/@me", {
				method: "PATCH",
				headers: this.headers,
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

		let hypouser = this.user.clone()
		const regen = () => {
			hypothetcialprofie.innerHTML = hypouser.buildprofile(-1, -1).innerHTML
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
						["mdbox", "Bio:", this.user.bio.rawString, event => {
							hypouser.bio = new MarkDown(event.target.value, thisuser)
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
			], () => {}, () => {
				hypouser = this.user.clone()
				regen()
				file = null
				newprouns = null
				newbio = null
				newTheme = null
			}
		)

		const connectionContainer = document.createElement("div")
		connectionContainer.id = "connection-container"
		this.userConnections = new Dialog(
			["html",
				connectionContainer
			], () => {}, async () => {
				connectionContainer.innerHTML = ""

				const res = await fetch(instance.api + "/connections", {
					headers: this.headers
				})
				const json = await res.json()

				Object.keys(json).sort(key => json[key].enabled ? -1 : 1).forEach(key => {
					const connection = json[key]

					const container = document.createElement("div")
					container.textContent = key.charAt(0).toUpperCase() + key.slice(1)

					if (connection.enabled) {
						container.addEventListener("click", async () => {
							const connectionRes = await fetch(instance.api + "/connections/" + key + "/authorize", {
								headers: this.headers
							})
							const connectionJSON = await connectionRes.json()
							window.open(connectionJSON.url, "_blank", "noopener noreferrer")
						})
					} else {
						container.classList.add("disabled")
						container.title = "This connection has been disabled server-side."
					}

					connectionContainer.appendChild(container)
				})
			}
		)

		let appName = ""
		const appListContainer = document.createElement("div")
		appListContainer.id = "app-list-container"
		this.devPortal = new Dialog(
			["vdiv",
				["hdiv",
					["textbox", "Name:", appName, event => {
						appName = event.target.value
					}],
					["button",
						"",
						"Create application",
						async () => {
							if (appName.trim().length == 0) return alert("Please enter a name for the application.")

							const res = await fetch(instance.api + "/applications", {
								method: "POST",
								headers: this.headers,
								body: JSON.stringify({
									name: appName
								})
							})
							const json = await res.json()
							this.manageApplication(json.id)
							this.devPortal.hide()
						}
					]
				],
				["html",
					appListContainer
				]
			], () => {}, async () => {
				appListContainer.innerHTML = ""

				const res = await fetch(instance.api + "/applications", {
					headers: this.headers
				})
				const json = await res.json()

				json.forEach(application => {
					const container = document.createElement("div")

					if (application.cover_image) {
						const cover = document.createElement("img")
						cover.crossOrigin = "anonymous"
						cover.src = instance.cdn + "/app-icons/" + application.id + "/" + application.cover_image + ".png?size=256"
						cover.alt = ""
						cover.loading = "lazy"
						container.appendChild(cover)
					}

					const name = document.createElement("h2")
					name.textContent = application.name + (application.bot ? " (Bot)" : "")
					container.appendChild(name)

					container.addEventListener("click", async () => {
						this.devPortal.hide()
						this.manageApplication(application.id)
					})
					appListContainer.appendChild(container)
				})
			}
		)
	}
	async manageApplication(appId) {
		const res = await fetch(instance.api + "/applications/" + appId, {
			headers: this.headers
		})
		const json = await res.json()

		const fields = {}
		const appDialog = new Dialog(
			["vdiv",
				["title",
					"Editing " + json.name
				],
				["hdiv",
					["textbox", "Application name:", json.name, event => {
						fields.name = event.target.value
					}],
					["mdbox", "Description:", json.description, event => {
						fields.description = event.target.value
					}],
					["vdiv",
						json.icon ? ["img", instance.cdn + "/app-icons/" + appId + "/" + json.icon + ".png?size=256", [128, 128]] : ["text", "No icon"],
						["fileupload", "Application icon:", event => {
							const reader = new FileReader()
							reader.readAsDataURL(event.target.files[0])
							reader.onload = () => {
								fields.icon = reader.result
							}
						}]
					]
				],
				["hdiv",
					["textbox", "Privacy policy URL:", json.privacy_policy_url || "", event => {
						fields.privacy_policy_url = event.target.value
					}],
					["textbox", "Terms of Service URL:", json.terms_of_service_url || "", event => {
						fields.terms_of_service_url = event.target.value
					}]
				],
				["hdiv",
					["checkbox", "Make bot publicly inviteable?", json.bot_public, event => {
						fields.bot_public = event.target.checked
					}],
					["checkbox", "Require code grant to invite the bot?", json.bot_require_code_grant, event => {
						fields.bot_require_code_grant = event.target.checked
					}]
				],
				["hdiv",
					["button",
						"",
						"Save changes",
						async () => {
							const updateRes = await fetch(instance.api + "/applications/" + appId, {
								method: "PATCH",
								headers: this.headers,
								body: JSON.stringify(fields)
							})
							if (updateRes.ok) appDialog.hide()
							else {
								const updateJSON = await updateRes.json()
								alert("An error occurred: " + updateJSON.message)
							}
						}
					],
					["button",
						"",
						(json.bot ? "Manage" : "Add") + " bot",
						async () => {
							if (!json.bot) {
								if (!confirm("Are you sure you want to add a bot to this application? There's no going back.")) return

								const updateRes = await fetch(instance.api + "/applications/" + appId + "/bot", {
									method: "POST",
									headers: this.headers
								})
								const updateJSON = await updateRes.json()
								alert("Bot token:\n" + updateJSON.token)
							}

							appDialog.hide()
							this.manageBot(appId)
						}
					]
				]
			]
		)
		appDialog.show()
	}
	async manageBot(appId) {
		const res = await fetch(instance.api + "/applications/" + appId, {
			headers: this.headers
		})
		const json = await res.json()
		if (!json.bot) return alert("For some reason, this application doesn't have a bot (yet).")

		const fields = {
			username: json.bot.username,
			avatar: json.bot.avatar ? (instance.cdn + "/app-icons/" + appId + "/" + json.bot.avatar + ".png?size=256") : ""
		}
		const botDialog = new Dialog(
			["vdiv",
				["title",
					"Editing bot: " + json.bot.username
				],
				["hdiv",
					["textbox", "Bot username:", json.bot.username, event => {
						fields.username = event.target.value
					}],
					["vdiv",
						fields.avatar ? ["img", fields.avatar, [128, 128]] : ["text", "No avatar"],
						["fileupload", "Bot avatar:", event => {
							const reader = new FileReader()
							reader.readAsDataURL(event.target.files[0])
							reader.onload = () => {
								fields.avatar = reader.result
							}
						}]
					]
				],
				["hdiv",
					["button",
						"",
						"Save changes",
						async () => {
							const updateRes = await fetch(instance.api + "/applications/" + appId + "/bot", {
								method: "PATCH",
								headers: this.headers,
								body: JSON.stringify(fields)
							})
							if (updateRes.ok) botDialog.hide()
							else {
								const updateJSON = await updateRes.json()
								alert("An error occurred: " + updateJSON.message)
							}
						}
					],
					["button",
						"",
						"Reset token",
						async () => {
							if (!confirm("Are you sure you want to reset the bot token? Your bot will stop working until you update it.")) return

							const updateRes = await fetch(instance.api + "/applications/" + appId + "/bot/reset", {
								method: "POST",
								headers: this.headers
							})
							const updateJSON = await updateRes.json()
							alert("New token:\n" + updateJSON.token)
							botDialog.hide()
						}
					]
				]
			]
		)
		botDialog.show()
	}
	static async loadSVG(name = "") {
		const res = await fetch("/img/" + name + ".svg", {
			headers: {
				Accept: "image/svg+xml"
			},
			cache: "force-cache"
		})
		const xml = await res.text()
		const parser = new DOMParser()
		return parser.parseFromString(xml, "image/svg+xml").documentElement
	}
}
