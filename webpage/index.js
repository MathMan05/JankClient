function setDynamicHeight() {
	const servertdHeight = document.getElementById("servertd").offsetHeight + document.getElementById("typebox").offsetHeight + document.getElementById("pasteimage").offsetHeight
	document.documentElement.style.setProperty("--servertd-height", servertdHeight + "px")
}
const resizeObserver = new ResizeObserver(() => {
	setDynamicHeight()
})
resizeObserver.observe(document.getElementById("servertd"))
resizeObserver.observe(document.getElementById("typebox"))
resizeObserver.observe(document.getElementById("pasteimage"))
setDynamicHeight()


const token = gettoken()
let ws
initwebsocket()
let READY

function createbutton(text, clickevent = () => {}) {
	const textb = document.createElement("tr")
	const intext = document.createElement("button")
	textb.button = intext
	intext.classList.add("contextbutton")
	intext.textContent = text
	textb.appendChild(intext)
	intext.onclick = clickevent
	return textb
}

let currentmenu = ""
document.addEventListener("click", event => {
	if (currentmenu == "") {
		return
	}
	if (!currentmenu.contains(event.target)) {
		currentmenu.remove()
		currentmenu = ""
	}
})
let replyingto = null
lacechannel(document.getElementById("channels"))
function lacechannel(c) {
	c.addEventListener("contextmenu", event => {
		event.preventDefault()
		event.stopImmediatePropagation()
		makemenuc.bind(c)(event.currentTarget, event.clientX, event.clientY)
	})
}

function createchannels(fincall) {
	let name = ""
	let catagory = 1
	console.log(fincall)
	const channelselect = new fullscreen(
		["vdiv",
			["radio", "select channel type",
				["voice", "text", "announcement"],
				function(e) {
					console.log(e)
					catagory = { text: 0, voice: 2, announcement: 5, catagory: 4 }[e]
				}
			],
			["textbox", "Name of channel", "", event => {
				name = event.target.value
			}],
			["button", "", "submit", () => {
				fincall(name, catagory)
				channelselect.hide()
			}]
		])
	channelselect.show()
}
function createcatagory(fincall) {
	let name = ""
	const category = 4
	console.log(fincall)
	const channelselect = new fullscreen(
		["vdiv",
			["textbox", "Name of catagory", "", event => {
				name = event.target.value
			}],
			["button", "", "submit", () => {
				fincall(name, category)
				channelselect.hide()
			}]
		])
	channelselect.show()
}
function editchannelf(channel) {
	channel.editChannel()
}

let editing = false
let thisuser = null

function makemenuc(divmessage, x, y) {
	if (currentmenu != "") currentmenu.remove()

	const build = document.createElement("table")
	if (x != -1) build.classList.add("contextmenu")

	if (divmessage.classList.contains("channel")) {
		const copyidbutton = createbutton("copy channel id", () => {
			navigator.clipboard.writeText(divmessage.all.id)
		})
		copyidbutton.button.all = divmessage.all
		build.appendChild(copyidbutton)

		const readall = createbutton("Mark as read", () => {
			channel.readbottom()
		})
		readall.button.all = divmessage.all
		build.appendChild(readall)

		if (thisuser.isAdmin()) {
			const deleteChannel = createbutton("Delete channel", () => {
				channel.deleteChannel()
			})
			deleteChannel.button.all = divmessage.all
			build.appendChild(deleteChannel)

			const editchannel = createbutton("edit channel", () => {
				editchannelf(channel)
			})
			editchannel.button.all = divmessage.all
			build.appendChild(editchannel)
		}
	} else {
		if (thisuser.isAdmin()) {
			const createchannel = createbutton("create channel", () => {
				createchannels(thisuser.lookingguild.createChannel.bind(thisuser.lookingguild))
			})
			createchannel.button.all = divmessage.all
			build.appendChild(createchannel)

			const createcat = createbutton("create catagory", () => {
				createcatagory(thisuser.lookingguild.createChannel.bind(thisuser.lookingguild))
			})
			createcat.button.all = divmessage.all
			build.appendChild(createcat)
		}
	}

	if (divmessage.userid == READY.d.user.id) {
		const editbut = createbutton("edit", () => {
			console.log("Editing", divmessage)
			editing = divmessage.all.id
			document.getElementById("typebox").value = divmessage.all.content
		})
		editbut.button.all = divmessage.all
		console.log(editbut)
		build.appendChild(editbut)
	}
	if (x != -1) {
		build.style.top = y + "px"
		build.style.left = x + "px"
	}
	document.body.appendChild(build)
	currentmenu = build
}
function makemenu(divmessage, x, y) {
	if (currentmenu != "") currentmenu.remove()
	const build = document.createElement("table")
	if (x != -1) build.classList.add("contextmenu")

	const copybutton = createbutton("copy raw text", () => {
		navigator.clipboard.writeText(divmessage.all.content)
	})
	copybutton.button.all = divmessage.all
	build.appendChild(copybutton)

	const replybutton = createbutton("reply", () => {
		if (replyingto) replyingto.classList.remove("replying")
		replyingto = divmessage
		replyingto.classList.add("replying")
	})
	replybutton.button.all = divmessage.all
	build.appendChild(replybutton)

	const copyidbutton = createbutton("copy message id", () => {
		navigator.clipboard.writeText(divmessage.all.id)
	})
	copyidbutton.button.all = divmessage.all
	build.appendChild(copyidbutton)

	const dmbutton = createbutton("Message user", () => {
		fetch("https://spacebar-api.vanillaminigames.net/api/v9/users/@me/channels", {
			method: "POST",
			body: JSON.stringify({ recipients: [divmessage.all.author.id] }),
			headers: {
				"Content-type": "application/json; charset=UTF-8",
				Authorization: token
			}
		})
	})
	dmbutton.button.all = divmessage.all
	build.appendChild(dmbutton)

	if (divmessage.userid == READY.d.user.id) {
		const editbut = createbutton("edit", () => {
			editing = divmessage.all.id
			document.getElementById("typebox").value = divmessage.all.content
		})
		editbut.button.all = divmessage.all
		console.log(editbut)
		build.appendChild(editbut)
	}

	if (x != -1) {
		build.style.top = y + "px"
		build.style.left = x + "px"
	}
	document.body.appendChild(build)
	currentmenu = build
}

const messagelist = []
function buildprofile(x, y, user, type = "author") {
	if (currentmenu != "") currentmenu.remove()

	let nickname, username, discriminator, bio, bot, pronouns, id, avatar
	if (type == "author") {
		console.log(user)
		username = user.username
		nickname = user.username

		bio = user.bio
		id = user.id
		discriminator = user.discriminator
		pronouns = user.pronouns
		bot = user.bot
		avatar = user.avatar
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
	obj.onclick = function(e) {
		console.log(e.clientX, e.clientY, author)
		buildprofile(e.clientX, e.clientY, author)
		e.stopPropagation()
	}
}

const images = []
const imageshtml = []

document.getElementById("typebox").addEventListener("keyup", enter)
console.log(document.getElementById("typebox"))
document.getElementById("typebox").onclick = console.log
async function enter(event) {
	thisuser.lookingguild.prevchannel.typingstart()
	const tis = document.getElementById("typebox")
	if (event.key == "Enter" && !event.shiftKey) {
		event.preventDefault()
		if (editing) {
			fetch("https://spacebar-api.vanillaminigames.net/api/channels/" + window.location.pathname.split("/")[3] + "/messages/" + editing, {
				method: "PATCH",
				headers: {
					"Content-type": "application/json; charset=UTF-8",
					Authorization: token
				},
				body: JSON.stringify({ content: tis.value })
			})
			tis.value = ""
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
					content: tis.value,
					nonce: Math.floor(Math.random() * 1000000000)
				}
				tis.value = ""
				if (replyjson) body.message_reference = replyjson

				console.log("Sending message:", body)
				fetch("https://spacebar-api.vanillaminigames.net/api/channels/" + window.location.pathname.split("/")[3] + "/messages", {
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
					content: tis.value,
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
				await fetch("https://spacebar-api.vanillaminigames.net/api/channels/" + window.location.pathname.split("/")[3] + "/messages", {
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
				tis.value = ""
			}
		}
	}
}

let packets = 1
const serverz = 0
const serverid = []


function initwebsocket() {
	ws = new WebSocket("wss://spacebar-api.vanillaminigames.net/?v=9&encoding=json")

	ws.addEventListener("open", event => {
		console.log("WebSocket connected")
		ws.send(JSON.stringify({
			op: 2,
			d: {
				token,
				capabilities: 16381,
				properties: {
					browser: "Harmony",
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

						if (temp.d.user_settings.theme == "light") {
							document.body.classList.remove("dark-theme")
							document.body.classList.add("light-theme")
						}
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
				console.log("heartbeat down")
				setInterval(() => {
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
	})
}

function getguildinfo() {
	const path = window.location.pathname.split("/")
	const channel = path[3]
	ws.send(JSON.stringify({ op: 14, d: { guild_id: path[2], channels: { [channel]: [[0, 99]] } } }))
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
function createunknownfile(file) {
	return createunknown(file.name, file.size)
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
		return createunknownfile(file)
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
			["radio", "Theme", ["dark", "light"], value => {
				newTheme = value
			}],
			["button", "update user content:", "submit", () => {
				if (file !== null) thisuser.updatepfp(file)
				if (newprouns !== null) thisuser.updatepronouns(newprouns)
				if (newbio !== null) thisuser.updatebio(newbio)
				if (newTheme !== null) {
					thisuser.updateSettings({theme: newTheme})
					document.body.classList.toggle("light", newTheme == "light")
				}
			}]
		], _ => {}, (() => {
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
