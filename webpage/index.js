"use strict"

const users = getBulkUsers()
if (!users.currentuser) location.href = "/login"
const info = users.users[users.currentuser].serverurls
console.log(users)
const token = users.users[users.currentuser].token

let ws
let READY

let thisuser = new localuser(users.users[users.currentuser])
thisuser.initwebsocket().then(() => {
	thisuser.loaduser()
	thisuser.init()
	document.getElementById("loading").classList.add("doneloading")
	document.getElementById("loading").classList.remove("loading")
})

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

const serverz = 0
const serverid = []

let editing = false
let currentmenu = ""

document.addEventListener("DOMContentLoaded", () => {
	const resizeObserver = new ResizeObserver(() => {
		setDynamicHeight()
	})
	resizeObserver.observe(document.getElementById("servertd"))
	resizeObserver.observe(document.getElementById("typebox"))
	resizeObserver.observe(document.getElementById("pasteimage"))
	setDynamicHeight()

	setTheme(localStorage.getItem("theme"))

	const menu = new contextmenu()
	menu.addbutton("Create channel", () => {
		createchannels(thisuser.lookingguild.createChannel.bind(thisuser.lookingguild))
	}, null, () => thisuser.isAdmin())

	menu.addbutton("Create category", () => {
		createcategory(thisuser.lookingguild.createChannel.bind(thisuser.lookingguild))
	}, null, () => thisuser.isAdmin())
	menu.bind(document.getElementById("channels"))
	const userinfo = document.getElementById("userinfo")
	const userdock = document.getElementById("userdock")
	userinfo.addEventListener("click",event => {
		const table = document.createElement("table")
		for (const thing of Object.values(users.users)) {
			console.log(thing.pfpsrc)
			const tr = document.createElement("tr")
			const td = document.createElement("td")

			const userinfoTable = document.createElement("table")
			userinfoTable.classList.add("switchtable")
			const row = document.createElement("tr")
			userinfoTable.append(row)
			const pfpcell = document.createElement("td")
			row.append(pfpcell)
			const pfp = document.createElement("img")
			pfpcell.append(pfp)

			const usertd = document.createElement("td")
			row.append(usertd)
			const user = document.createElement("div")
			usertd.append(user)
			user.append(thing.username)
			user.append(document.createElement("br"))
			const span = document.createElement("span")
			span.textContent = thing.serverurls.wellknown.hostname
			user.append(span)
			span.classList.add("serverURL")

			pfp.src = thing.pfpsrc
			pfp.classList.add("pfp")
			td.append(userinfoTable)

			tr.append(td)
			table.append(tr)
			tr.addEventListener("click",_ => {
				thisuser.unload()
				document.getElementById("loading").classList.remove("doneloading")
				document.getElementById("loading").classList.add("loading")
				thisuser = new localuser(thing)
				window.info = thing.serverurls
				users.currentuser = thing.uid
				localStorage.setItem("userinfos",JSON.stringify(users))
				thisuser.initwebsocket().then(() => {
					thisuser.loaduser()
					thisuser.init()
					document.getElementById("loading").classList.add("doneloading")
					document.getElementById("loading").classList.remove("loading")
				})
			})
		}
		{
			const tr = document.createElement("tr")
			const td = document.createElement("td")
			tr.append(td)
			td.append("Switch accounts ⇌")
			td.addEventListener("click",_ => {
				window.location.href = "/login.html"
			})
			table.append(tr)
		}
		table.classList.add("accountSwitcher")

		if (currentmenu != "") currentmenu.remove()
		currentmenu = table
		console.log(table)
		userdock.append(table)
		event.stopImmediatePropagation()
	})
})


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
				headers: thisuser.headers,
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
					headers: thisuser.headers,
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
						Authorization: thisuser.token
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

if ("serviceWorker" in navigator) navigator.serviceWorker.register("/service.js")
