"use strict"

const users = getBulkUsers()
if (!users.currentuser) location.href = "/login"
console.log(users)
let instance = users.users[users.currentuser].serverurls

// eslint-disable-next-line no-unused-vars
let READY

let thisuser = new LocalUser(users.users[users.currentuser])
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
	const servertdHeight = document.getElementById("servertd").offsetHeight + document.getElementById("typediv").offsetHeight + document.getElementById("pasteimage").offsetHeight
	document.documentElement.style.setProperty("--servertd-height", servertdHeight + "px")
}

const userSettings = () => {
	thisuser.usersettings.show()
}

document.addEventListener("DOMContentLoaded", async () => {
	const resizeObserver = new ResizeObserver(() => {
		setDynamicHeight()
	})
	resizeObserver.observe(document.getElementById("servertd"))
	resizeObserver.observe(document.getElementById("replybox"))
	resizeObserver.observe(document.getElementById("pasteimage"))
	setDynamicHeight()

	if (localStorage.getItem("theme")) setTheme(localStorage.getItem("theme"))
	else if (window.matchMedia("(prefers-color-scheme: light)").matches) setTheme("light")

	const menu = new Contextmenu()
	menu.addbutton("Create channel", () => {
		thisuser.lookingguild.createchannels()
	}, null, () => thisuser.isAdmin())

	menu.addbutton("Create category", () => {
		thisuser.lookingguild.createcategory()
	}, null, () => thisuser.isAdmin())
	menu.bind(document.getElementById("channels"))

	const userinfo = document.getElementById("userinfo")
	const userdock = document.getElementById("userdock")
	userinfo.addEventListener("click", event => {
		const table = document.createElement("table")
		table.classList.add("accountSwitcher")

		for (const thing of Object.values(users.users)) {
			const tr = document.createElement("tr")
			const td = document.createElement("td")

			const userinfoTable = document.createElement("table")
			userinfoTable.classList.add("switchtable")

			const row = document.createElement("tr")
			const pfpcell = document.createElement("td")
			row.append(pfpcell)
			userinfoTable.append(row)
			td.append(userinfoTable)

			const pfp = document.createElement("img")
			pfp.crossOrigin = "anonymous"
			pfp.src = thing.pfpsrc
			pfp.alt = ""
			pfp.classList.add("pfp")
			pfpcell.append(pfp)

			const usertd = document.createElement("td")
			row.append(usertd)
			const user = document.createElement("div")
			user.append(thing.username)
			user.append(document.createElement("br"))

			const span = document.createElement("span")
			span.classList.add("serverURL")
			span.textContent = new URL(thing.serverurls.wellknown).hostname
			user.append(span)
			usertd.append(user)

			tr.append(td)
			table.append(tr)
			tr.addEventListener("click", () => {
				thisuser.unload()
				document.getElementById("loading").classList.remove("doneloading")
				document.getElementById("loading").classList.add("loading")
				thisuser = new LocalUser(thing)
				instance = thing.serverurls
				users.currentuser = thing.uid
				localStorage.setItem("userinfos", JSON.stringify(users))
				thisuser.initwebsocket().then(() => {
					thisuser.loaduser()
					thisuser.init()
					document.getElementById("loading").classList.add("doneloading")
					document.getElementById("loading").classList.remove("loading")
				})
			})
		}

		const tr = document.createElement("tr")
		const td = document.createElement("td")
		td.append("Switch accounts ⇌")
		td.addEventListener("click", () => {
			location.href = "/login"
		})
		tr.append(td)
		table.append(tr)

		if (Contextmenu.currentmenu != "") Contextmenu.currentmenu.remove()
		Contextmenu.currentmenu = table
		userdock.before(table)
		event.stopImmediatePropagation()
	})

	document.getElementById("settings").addEventListener("click", userSettings)

	if ("serviceWorker" in navigator) {
		navigator.serviceWorker.register("/service.js")

		/*const subscription = await navigator.serviceWorker.ready.then(async registration => {
			const sub = await registration.pushManager.getSubscription()
			if (sub) return sub

			const res = await fetch(instance.api + "/notifications/webpush/vapidKey")
			if (!res.ok) throw new Error("Failed to get VAPID key: " + res.status + " " + res.statusText)

			return registration.pushManager.subscribe({
				userVisibleOnly: true,
				applicationServerKey: await res.text()
			})
		})

		await fetch(instance.api + "/notifications/webpush/subscribe", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Authorization: users.users[users.currentuser].token
			},
			body: JSON.stringify(subscription)
		})
		console.log("Subscribed to push notifications")*/
	}
})

// eslint-disable-next-line no-unused-vars
const requestTestNotif = async () => {
	fetch(instance.api + "/notifications/webpush/testNotification", {
		headers: {
			"Content-Type": "application/json",
			Authorization: users.users[users.currentuser].token
		}
	})
}

// eslint-disable-next-line no-unused-vars
const editchannel = channel => {
	channel.editChannel()
}

// eslint-disable-next-line no-unused-vars
const messagelist = []

let images = []

let replyingto = null
const typebox = document.getElementById("typebox")
typebox.addEventListener("keyup", event => {
	const channel = thisuser.channelfocus

	if (event.key == "Enter" && !event.shiftKey) {
		event.preventDefault()

		if (channel.editing) {
			channel.editing.edit(typebox.value)
			channel.editing = null
		} else {
			if (typebox.value == "") return

			replyingto = thisuser.channelfocus.replyingto
			const replying = replyingto
			if (replyingto) replyingto.div.classList.remove("replying")

			channel.replyingto = null
			channel.sendMessage(typebox.value, {
				attachments: images,
				replyingto: replying
			})
			thisuser.channelfocus.makereplybox()
		}

		images = []
		document.getElementById("pasteimage").innerHTML = ""

		typebox.value = ""
	} else channel.typingstart()
})
typebox.addEventListener("keydown", event => {
	if (event.key == "Enter" && !event.shiftKey) event.preventDefault()
})

document.addEventListener("paste", event => {
	Array.from(event.clipboardData.files).forEach(f => {
		const file = File.initFromBlob(f)
		event.preventDefault()
		const html = file.upHTML(images, f)
		document.getElementById("pasteimage").appendChild(html)
		images.push(f)
	})
})

let triggered = false
document.getElementById("messagecontainer").addEventListener("scroll", () => {
	const messagecontainer = document.getElementById("messagecontainer")
	if (messagecontainer.scrollTop < 2000) {
		if (!triggered && thisuser.lookingguild) {
			thisuser.lookingguild.prevchannel.grabmoremessages().then(() => {
				triggered = false
				if (messagecontainer.scrollTop == 0) messagecontainer.scrollTop = 1
			})
		}
		triggered = true
	} else if (Math.abs(messagecontainer.scrollHeight - messagecontainer.scrollTop - messagecontainer.clientHeight) < 3)
		thisuser.lookingguild.prevchannel.readbottom()
})

if (screen.width <= 600) {
	document.getElementById("channelw").onclick = () => {
		document.getElementById("channels").parentNode.classList.add("collapse")
		document.getElementById("servertd").classList.add("collapse")
		document.getElementById("servers").classList.add("collapse")
	}
	document.getElementById("mobileback").textContent = "#"
	document.getElementById("mobileback").onclick = () => {
		document.getElementById("channels").parentNode.classList.remove("collapse")
		document.getElementById("servertd").classList.remove("collapse")
		document.getElementById("servers").classList.remove("collapse")
	}
}
