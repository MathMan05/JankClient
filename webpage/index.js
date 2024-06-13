"use strict"

const instanceParsed = JSON.parse(localStorage.getItem("instanceEndpoints"))
let instance = {}
if (instanceParsed) {
	instance = {
		api: new URL(instanceParsed.api).toString(),
		cdn: new URL(instanceParsed.cdn).toString(),
		gateway: new URL(instanceParsed.gateway).toString(),
		wellknown: new URL(instanceParsed.wellknown).toString()
	}
	Object.keys(instance).forEach(key => {
		if (instance[key].endsWith("/")) instance[key] = instance[key].slice(0, -1)
	})
	instance.api = instance.api + "/v9"
	console.log("Set connection endpoints", instance)
} else location.href = "/login.html"

const setTheme = theme => {
	if (theme == "light") {
		document.body.classList.remove("dark-theme")
		document.body.classList.add("light-theme")
	} else {
		document.body.classList.remove("light-theme")
		document.body.classList.add("dark-theme")
	}
}
const setDynamicHeight = () => {
	const servertdHeight = document.getElementById("servertd").offsetHeight + document.getElementById("typebox").offsetHeight + document.getElementById("pasteimage").offsetHeight
	document.documentElement.style.setProperty("--servertd-height", servertdHeight + "px")
}

const token = gettoken()
let inviteModal

let packets = 1
const serverz = 0
const serverid = []

let editing = false
let thisuser = null

document.addEventListener("DOMContentLoaded", () => {
	const resizeObserver = new ResizeObserver(() => {
		setDynamicHeight()
	})
	resizeObserver.observe(document.getElementById("servertd"))
	resizeObserver.observe(document.getElementById("typebox"))
	resizeObserver.observe(document.getElementById("pasteimage"))
	setDynamicHeight()

	setTheme(localStorage.getItem("theme"))

	let currentInvite = "dUZGRa"
	inviteModal = new fullscreen(
		["vdiv",
			["textbox", "Enter invite code/URL:", "dUZGRa", event => {
				currentInvite = event.target.value.split("/").pop()
			}],
			["button", "Join:", "submit", async () => {
				const res = await fetch(instance.api + "/invites/" + currentInvite, {
					method: "POST",
					headers: {
						"Content-type": "application/json; charset=UTF-8",
						Authorization: token
					}
				})
				if (res.ok) inviteModal.hide()
				else {
					const json = await res.json()
					console.error("Unable to join guild using " + currentInvite, json)
				}
			}]
		], () => {}, (() => {
			currentInvite = "dUZGRa"
		}))

	const menu = new contextmenu("create backclick")
	menu.addbutton("Create channel", () => {
		createchannels(thisuser.lookingguild.createChannel.bind(thisuser.lookingguild))
	}, null, () => thisuser.isAdmin())

	menu.addbutton("Create category", () => {
		createcategory(thisuser.lookingguild.createChannel.bind(thisuser.lookingguild))
	}, null, () => thisuser.isAdmin())
	menu.bind(document.getElementById("channels"))
})


function gettoken() {
	const temp = localStorage.getItem("token")
	if (!temp) location.href = "/login.html"
	return temp
}

let ws
initwebsocket()
let READY

let currentmenu = ""
document.addEventListener("click", event => {
	if (currentmenu == "") return

	if (!currentmenu.contains(event.target)) {
		currentmenu.remove()
		currentmenu = ""
	}
})
let replyingto = null

function createchannels(fincall) {
	let name = ""
	let type = 0
	const channelselect = new fullscreen(
		["vdiv",
			["radio", "select channel type",
				["voice", "text", "announcement"],
				value => {
					type = { text: 0, voice: 2, announcement: 5, category: 4 }[value]
				},
				1
			],
			["textbox", "Name of channel", "", event => {
				name = event.target.value
			}],
			["button", "", "submit", () => {
				fincall(name, type)
				channelselect.hide()
			}]
		])
	channelselect.show()
}
function createcategory(fincall) {
	let name = ""
	const category = 4
	const channelselect = new fullscreen(
		["vdiv",
			["textbox", "Name of category", "", event => {
				name = event.target.value
			}],
			["button", "", "submit", () => {
				fincall(name, category)
				channelselect.hide()
			}]
		])
	channelselect.show()
}
function editchannel(channel) {
	channel.editChannel()
}

const messagelist = []
function buildprofile(x, y, user, type = "author") {
	if (currentmenu != "") currentmenu.remove()

	let nickname, username, discriminator, bio, bot, pronouns
	if (type == "author") {
		console.log(user)
		username = user.username
		nickname = user.username

		bio = user.bio
		discriminator = user.discriminator
		pronouns = user.pronouns
		bot = user.bot
	}

	const div = document.createElement("table")
	if (x == -1) div.classList.add("hypoprofile")
	else {
		div.style.left = x + "px"
		div.style.top = y + "px"
		div.classList.add("profile")
	}

	const pfp = user.buildpfp()
	const pfprow = document.createElement("tr")
	div.appendChild(pfprow)
	pfprow.appendChild(pfp)

	const userbody = document.createElement("tr")
	userbody.classList.add("infosection")
	div.appendChild(userbody)
	const usernamehtml = document.createElement("h2")
	usernamehtml.textContent = nickname
	userbody.appendChild(usernamehtml)

	const discrimatorhtml = document.createElement("h3")
	discrimatorhtml.classList.add("tag")
	discrimatorhtml.textContent = username + "#" + discriminator
	userbody.appendChild(discrimatorhtml)

	const pronounshtml = document.createElement("p")
	pronounshtml.textContent = pronouns
	pronounshtml.classList.add("pronouns")
	userbody.appendChild(pronounshtml)

	const rule = document.createElement("hr")
	userbody.appendChild(rule)
	const biohtml = markdown(bio)
	userbody.appendChild(biohtml)

	if (x != -1) {
		currentmenu = div
		document.body.appendChild(div)
	}
	return div
}
function profileclick(obj, author) {
	obj.onclick = event => {
		event.stopPropagation()
		buildprofile(event.clientX, event.clientY, author)
	}
}

const images = []
const imageshtml = []

const typebox = document.getElementById("typebox")
typebox.addEventListener("keyup", enter)
typebox.addEventListener("keydown", event => {
    if (event.key == "Enter" && !event.shiftKey) event.preventDefault()
})

async function enter(event) {
	thisuser.lookingguild.prevchannel.typingstart()

	if (event.key == "Enter" && !event.shiftKey) {
		event.preventDefault()
		if (editing) {
			fetch(instance.api + "/channels/" + window.location.pathname.split("/")[3] + "/messages/" + editing, {
				method: "PATCH",
				headers: {
					"Content-type": "application/json; charset=UTF-8",
					Authorization: token
				},
				body: JSON.stringify({ content: typebox.value })
			})
			typebox.value = ""
			editing = false
		} else {
			let replyjson = false
			if (replyingto) {
				replyjson = {
					guild_id: replyingto.all.guild_id,
					channel_id: replyingto.all.channel_id,
					message_id: replyingto.all.id
				}
				replyingto.classList.remove("replying")
			}

			replyingto = false
			if (images.length == 0) {
				const body = {
					content: typebox.value,
					nonce: Math.floor(Math.random() * 1000000000)
				}
				typebox.value = ""
				if (replyjson) body.message_reference = replyjson

				console.log("Sending message:", body)
				fetch(instance.api + "/channels/" + window.location.pathname.split("/")[3] + "/messages", {
					method: "POST",
					headers: {
						"Content-type": "application/json; charset=UTF-8",
						Authorization: token
					},
					body: JSON.stringify(body)
				})
			} else {
				const formData = new FormData()
				const body = {
					content: typebox.value,
					nonce: Math.floor(Math.random() * 1000000000)
				}
				if (replyjson) body.message_reference = replyjson

				formData.append("payload_json", JSON.stringify(body))
				for (const i in images) {
					console.log(images[i])
					formData.append("files[" + i + "]", images[i])
				}
				const data = formData.entries()
				console.log(data.next(), data.next(), data.next())
				await fetch(instance.api + "/channels/" + window.location.pathname.split("/")[3] + "/messages", {
					method: "POST",
					body: formData,
					headers: {
						Authorization: token
					}
				})

				while (images.length != 0) {
					images.pop()
					document.getElementById("pasteimage").removeChild(imageshtml.pop())
				}
				typebox.value = ""
			}
		}
	}
}

let heartbeatInterval = 0
let errorBackoff = 0
const wsCodesRetry = new Set([4000, 4003, 4005, 4007, 4008, 4009])

function initwebsocket() {
	ws = new WebSocket(instance.gateway + "/?v=9&encoding=json")

	ws.addEventListener("open", () => {
		console.log("WebSocket connected")
		ws.send(JSON.stringify({
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

	ws.addEventListener("message", event => {
		try {
			const temp = JSON.parse(event.data)
			console.log(temp)
			if (temp.op == 0) {
				switch (temp.t) {
					case "MESSAGE_CREATE":
						if (thisuser) thisuser.messageCreate(temp)
						break
					case "READY":
						thisuser = new localuser(temp)
						thisuser.loaduser()
						READY = temp
						thisuser.init()
						genusersettings()
						document.getElementById("loading").classList.add("doneloading")
						document.getElementById("loading").classList.remove("loading")
						break
					case "MESSAGE_UPDATE":
						if (thisuser && window.location.pathname.split("/")[3] == temp.d.channel_id) {
							const find = temp.d.id
							// eslint-disable-next-line sonarjs/no-empty-collection
							for (const message of messagelist) {
								if (message.all.id === find) {
									message.all.content = temp.d.content
									message.txt.innerHTML = markdown(temp.d.content).innerHTML
									break
								}
							}
						}
						break
					case "TYPING_START":
						if (thisuser) thisuser.typingStart(temp)
						break
					case "USER_UPDATE":
						if (thisuser) {
							const users = user.userids[temp.d.id]
							console.log(users, temp.d.id)

							if (users) users.userupdate(temp.d)
						}
						break
					case "CHANNEL_UPDATE":
						if (thisuser) thisuser.updateChannel(temp.d)
						break
					case "CHANNEL_CREATE":
						if (thisuser) thisuser.createChannel(temp.d)
						break
					case "CHANNEL_DELETE":
						if (thisuser) thisuser.delChannel(temp.d)
						break
				}
			} else if (temp.op == 10) {
				heartbeatInterval = setInterval(() => {
					ws.send(JSON.stringify({ op: 1, d: packets }))
				}, temp.d.heartbeat_interval)
				packets = 1
			} else if (temp.op != 11) packets++
		} catch (error) {
			console.error(error)
		}
	})

	ws.addEventListener("close", event => {
		console.log("WebSocket closed with code " + event.code)
		if (heartbeatInterval) clearInterval(heartbeatInterval)

		if ((event.code > 1000 && event.code < 1016) || wsCodesRetry.has(event.code)) {
			document.getElementById("load-desc").textContent = "Unable to connect to the Spacebar server, retrying..."

			setTimeout(() => {
				document.getElementById("load-desc").textContent = "Retrying..."
				initwebsocket()
			}, 200 + (errorBackoff++ * 3000))
		}
	})
}

function createunknown(fname, fsize, src) {
	const div = document.createElement("table")
	div.classList.add("unknownfile")
	const nametr = document.createElement("tr")
	div.append(nametr)
	const fileicon = document.createElement("td")
	nametr.append(fileicon)
	fileicon.append("🗎")
	fileicon.classList.add("fileicon")
	fileicon.rowSpan = "2"
	const nametd = document.createElement("td")
	if (src) {
		const a = document.createElement("a")
		a.href = src
		a.textContent = fname
		nametd.append(a)
	} else {
		nametd.textContent = fname
	}

	nametd.classList.add("filename")
	nametr.append(nametd)
	const sizetr = document.createElement("tr")
	const size = document.createElement("td")
	sizetr.append(size)
	size.textContent = "Size:" + filesizehuman(fsize)
	size.classList.add("filesize")
	div.appendChild(sizetr)
	return div
}

function filesizehuman(fsize) {
	const i = fsize == 0 ? 0 : Math.floor(Math.log(fsize) / Math.log(1024))
	return (fsize / Math.pow(1024, i)).toFixed(2) + " " + ["Bytes", "Kilobytes", "Megabytes", "Gigabytes", "Terabytes"][i]
}

function filetohtml(file) {
	if (file.type.startsWith("image/")) {
		const img = document.createElement("img")
		img.crossOrigin = "anonymous"
		const blob = URL.createObjectURL(file)
		img.src = blob
		return img
	} else {
		console.log("Unsupported file " + file.name + " for embedding into message")
		return createunknown(file.name, file.size)
	}
}
document.addEventListener("paste", async e => {
	Array.from(e.clipboardData.files).forEach(async file => {
		e.preventDefault()
		const html = filetohtml(file)
		document.getElementById("pasteimage").appendChild(html)
		images.push(file)
		imageshtml.push(html)
	})
})

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

let triggered = false
document.getElementById("messagecontainer").addEventListener("scroll", e => {
	const messagecontainer = document.getElementById("messagecontainer")
	if (messagecontainer.scrollTop < 2000) {
		if (!triggered) {
			thisuser.lookingguild.prevchannel.grabmoremessages().then(() => {
				triggered = false
				if (messagecontainer.scrollTop == 0) messagecontainer.scrollTop = 1
			})
		}
		triggered = true
	} else {
		if (Math.abs(messagecontainer.scrollHeight - messagecontainer.scrollTop - messagecontainer.clientHeight) < 3) {
			thisuser.lookingguild.prevchannel.readbottom()
		}
	}
})
