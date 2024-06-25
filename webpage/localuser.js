"use strict"

function userSettings() {
	thisuser.usersettings.show()
}

let packets = 1
let heartbeatInterval = 0
let errorBackoff = 0
const wsCodesRetry = new Set([4000, 4003, 4005, 4007, 4008, 4009])

class localuser {
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
		this.user = user.checkuser(ready.d.user)
		this.userinfo.username = this.user.username
		this.userinfo.pfpsrc = this.user.getpfpsrc()
		this.usersettings = null
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

		const dmChannels = new direct(ready.d.private_channels, this)
		this.guilds.push(dmChannels)
		this.guildids[dmChannels.id] = dmChannels

		for (const guildSettings of ready.d.user_guild_settings.entries) {
			this.guildids[guildSettings.guild_id].notisetting(guildSettings)
		}

		for (const m of ready.d.merged_members) {
			const guild = this.guildids[m[0].guild_id]
			guild.giveMember(new member(m[0], guild))
		}

		for (const thing of ready.d.read_state.entries) {
			const guild = this.resolveGuildidFromChannelID(thing.id)
			if (!guild) continue

			const guildid = guild.id
			this.guildids[guildid].channelids[thing.channel_id].readStateInfo(thing)
		}
		this.typing = []
	}
	outoffocus() {
		document.getElementById("servers").textContent = ""
		document.getElementById("channels").textContent = ""
		document.getElementById("messages").textContent = ""
		this.lookingguild = null
		this.channelfocus = null
	}
	unload() {
		this.initialized = false
		clearInterval(this.wsinterval)
		this.outoffocus()
		this.guilds = []
		this.guildids = {}
		this.ws.close(4000)
	}
	async initwebsocket() {
		let returny = null
		const promise = new Promise(res => {
			returny = res
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
						browser: "Jank Client",
						client_build_number: 0,
						release_channel: "Custom",
						browser_user_agent: navigator.userAgent
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
			try {
				const json = JSON.parse(event.data)
				console.log(json)
				if (json.op == 0) {
					switch (json.t) {
						case "MESSAGE_CREATE":
							if (this.initialized) this.messageCreate(json)
							break
						case "READY":
							this.gottenReady(json)
							READY = json
							this.genusersettings()
							returny()
							break
						case "MESSAGE_UPDATE":
							if (this.initialized && location.pathname.split("/")[3] == json.d.channel_id) {
								const find = json.d.id
								for (const message of messagelist) {
									if (message.all.id === find) {
										message.all.content = json.d.content
										message.txt.innerHTML = markdown(json.d.content).innerHTML
										break
									}
								}
							}
							break
						case "TYPING_START":
							if (this.initialized) this.typingStart(json)
							break
						case "USER_UPDATE":
							if (this.initialized) {
								const users = user.userids[json.d.id]
								console.log(users, json.d.id)

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
							break
						}
						case "GUILD_CREATE": {
							const guildy = new guild(json.d, this)
							this.guilds.push(guildy)
							this.guildids[guildy.id] = guildy
							document.getElementById("servers").insertBefore(guildy.generateGuildIcon(), document.getElementById("bottomseperator"))
						}
					}
				} else if (json.op == 10) {
					heartbeatInterval = setInterval(() => {
						this.ws.send(JSON.stringify({ op: 1, d: packets }))
					}, json.d.heartbeat_interval)
					packets = 1
				} else if (json.op != 11) packets++
			} catch (error) {
				console.error(error)
			}
		})

		this.ws.addEventListener("close", event => {
			console.log("WebSocket closed with code " + event.code)
			if (heartbeatInterval) clearInterval(heartbeatInterval)

			if (((event.code > 1000 && event.code < 1016) || wsCodesRetry.has(event.code)) && thisuser === this) {
				document.getElementById("load-desc").textContent = "Unable to connect to the Spacebar server, retrying..."
				this.unload()
				document.getElementById("loading").classList.remove("doneloading")
				document.getElementById("loading").classList.add("loading")

				setTimeout(() => {
					document.getElementById("load-desc").textContent = "Retrying..."

					this.initwebsocket().then(_ => {
						thisuser.loaduser()
						thisuser.init()
						document.getElementById("loading").classList.add("doneloading")
						document.getElementById("loading").classList.remove("loading")
					})
				}, 200 + (errorBackoff++ * 3000))
			}
		})

		await promise
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
			const guildLoaded = this.loadGuild(loc[4])
			guildLoaded.loadChannel(loc[5])
			this.channelfocus = guildLoaded.channelids[loc[5]]
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
		let guild = this.guildids[id]
		if (!guild) guild = this.guildids["@me"]

		this.lookingguild = guild
		document.getElementById("servername").textContent = guild.properties.name
		document.getElementById("channels").innerHTML = ""
		document.getElementById("channels").appendChild(guild.getHTML())
		return guild
	}
	buildservers() {
		const serverlist = document.getElementById("servers")
		serverlist.innerHTML = ""

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

		for (const guild of this.guilds) {
			if (guild instanceof direct) {
				guild.unreaddms()
				continue
			}

			const divy = guild.generateGuildIcon()
			serverlist.append(divy)
		}
		this.unreads()

		const br2 = document.createElement("hr")
		br2.classList.add("lightbr")
		br2.id = "bottomseperator"
		serverlist.appendChild(br2)

		const div2 = document.createElement("div")
		div2.textContent = "+"
		div2.classList.add("home", "servericon")
		serverlist.appendChild(div2)
		div2.addEventListener("click", () => {
			this.createGuild()
		})
	}
	createGuild() {
		let inviteurl = ""
		const error = document.createElement("span")

		const full = new fullscreen(["tabs", [
			["Join using invite", [
				"vdiv",
					["textbox",
						"Invite Link/Code",
						"",
						function() {
							inviteurl = this.value
						}
					],
					["html", error],
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
								error.textContent = json.message || "An error occurred (response code " + res.status + ")"
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
	messageCreate(messagep) {
		messagep.d.guild_id ??= "@me"
		this.guildids[messagep.d.guild_id].channelids[messagep.d.channel_id].messageCreate(messagep, this.channelfocus.id == messagep.d.channel_id)
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

		let hypouser = new user(thisuser.user)
		function regen() {
			hypothetcialprofie.textContent = ""
			const hypoprofile = buildprofile(-1, -1, hypouser)

			hypothetcialprofie.appendChild(hypoprofile)
		}
		regen()
		this.usersettings = new fullscreen(
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
						["textbox", "Pronouns:", thisuser.user.pronouns, event => {
							hypouser.pronouns = event.target.value
							newprouns = event.target.value
							regen()
						}],
						["mdbox", "Bio:", thisuser.user.bio, event => {
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
				["select", "Notification sound:", voice.sounds, e => {
					voice.setNotificationSound(voice.sounds[e.target.selectedIndex])
					voice.noises(voice.sounds[e.target.selectedIndex])
				},	voice.sounds.indexOf(voice.getNotificationSound())],
				["button", "update user content:", "submit", () => {
					if (file !== null) thisuser.updatepfp(file)
					if (newprouns !== null) thisuser.updatepronouns(newprouns)
					if (newbio !== null) thisuser.updatebio(newbio)
					if (newTheme !== null) {
						thisuser.updateSettings({theme: newTheme})
						localStorage.setItem("theme", newTheme)

						setTheme(newTheme)
					}
				}]
			], () => {}, (() => {
				hypouser = user.checkuser(thisuser.user)
				regen()
				file = null
				newprouns = null
				newbio = null
				newTheme = null
			}))
	}
}
