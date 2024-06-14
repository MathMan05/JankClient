"use strict"

let usersettings
function genusersettings() {
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
	usersettings = new fullscreen(
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
function userSettings() {
	usersettings.show()
}

let packets = 1
let heartbeatInterval = 0
let errorBackoff = 0
const wsCodesRetry = new Set([4000, 4003, 4005, 4007, 4008, 4009])

class localuser {
	constructor() {
		this.initwebsocket()
		this.initialized = false
	}

	gottenReady(ready) {
		this.initialized = true
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
	initwebsocket() {
		this.ws = new WebSocket(instance.gateway + "/?v=9&encoding=json")

		this.ws.addEventListener("open", () => {
			console.log("WebSocket connected")
			this.ws.send(JSON.stringify({
				op: 2,
				d: {
					token,
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
							this.loaduser()
							READY = json
							this.init()
							genusersettings()
							document.getElementById("loading").classList.add("doneloading")
							document.getElementById("loading").classList.remove("loading")
							break
						case "MESSAGE_UPDATE":
							if (this.initialized && window.location.pathname.split("/")[3] == json.d.channel_id) {
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

			if ((event.code > 1000 && event.code < 1016) || wsCodesRetry.has(event.code)) {
				document.getElementById("load-desc").textContent = "Unable to connect to the Spacebar server, retrying..."

				setTimeout(() => {
					document.getElementById("load-desc").textContent = "Retrying..."
					this.initwebsocket()
				}, 200 + (errorBackoff++ * 3000))
			}
		})
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
								headers: {
									"Content-type": "application/json; charset=UTF-8",
									Authorization: token
								}
							})
							if (res.ok) inviteModal.hide()
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
				? typingUsers.slice(-1).join(", ") + " and " + typingUsers.at(-1) + " are typing"
				: typingUsers[0] + " is typing"
		} else document.getElementById("typing").classList.add("hidden")
	}
}
