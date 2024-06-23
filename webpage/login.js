"use strict"

class specialuser {
	constructor(json) {
		if (json instanceof specialuser) throw new Error("Input for specialuser must not be instance of specialuser")

		const instanceURLs = {
			api: new URL(json.serverurls.api).toString(),
			cdn: new URL(json.serverurls.cdn).toString(),
			gateway: new URL(json.serverurls.gateway).toString(),
			wellknown: new URL(json.serverurls.wellknown).toString()
		}
		Object.keys(instanceURLs).forEach(key => {
			if (instanceURLs[key].endsWith("/")) instanceURLs[key] = instanceURLs[key].slice(0, -1)
		})
		instanceURLs.api = instanceURLs.api + "/v9"
		this.serverurls = instanceURLs

		this.email = json.email
		this.token = json.token
		this.loggedin = json.loggedin
		this.json = json
		if (!this.serverurls || !this.email || !this.token) {
			console.error("There are fundamentally missing pieces of info missing from this user")
		}
	}
	set pfpsrc(newPfp) {
		this.json.pfpsrc = newPfp
		this.updateLocal()
	}
	get pfpsrc() {
		return this.json.pfpsrc
	}
	set username(newName) {
		this.json.username = newName
		this.updateLocal()
	}
	get username() {
		return this.json.username
	}
	get uid() {
		return this.email + this.serverurls.wellknown
	}
	toJSON() {
		return this.json
	}
	updateLocal() {
		const info = getBulkInfo()
		info.users[this.uid] = this.toJSON()
		localStorage.setItem("userinfos", JSON.stringify(info))
	}
}

function getBulkUsers() {
	const json = getBulkInfo()
	for (const user in json.users) {
		json.users[user] = new specialuser(json.users[user])
	}
	return json
}
function getBulkInfo() {
	return JSON.parse(localStorage.getItem("userinfos"))
}
function setDefaults() {
	const userinfos = getBulkInfo()
	if (!userinfos) {
		localStorage.setItem("userinfos", JSON.stringify({
			currentuser: null,
			users: {},
			preferences: {
				theme: "dark",
				notifications: false,
				notisound: "three"
			}
		}))
	}

	if (userinfos.users === void 0) userinfos.users = {}
	if (userinfos.preferences === void 0) {
		userinfos.preferences = {
			theme: "Dark",
			notifcations: false,
			notisound: "three"
		}
	}
	if (userinfos.preferences && userinfos.preferences.notisound === void 0) {
		userinfos.preferences.notisound = "three"
	}
	localStorage.setItem("userinfos", JSON.stringify(userinfos))
}
setDefaults()

function adduser(user) {
	user = new specialuser(user)
	const info = getBulkInfo()
	info.users[user.uid] = user
	info.currentuser = user.uid
	localStorage.setItem("userinfos", JSON.stringify(info))
}

async function login(username, password) {
	const info = JSON.parse(localStorage.getItem("instanceEndpoints"))
	const url = new URL(info.login)

	const res = await fetch(url.origin + "/api/auth/login", {
		method: "POST",
		headers: {
			"Content-Type": "application/json; charset=UTF-8"
		},
		body: JSON.stringify({
			login: username,
			password,
			undelete: false
		})
	})

	const json = await res.json()
	console.log(json)
	if (json.message == "Invalid Form Body") return Object.values(json.errors)[0]._errors[0].message

	//this.serverurls||!this.email||!this.token
	adduser({serverurls: info, email: username, token: json.token})
	location.href = "/channels/@me"
	return json.token
}

async function setInstance(url) {
	url = new URL(url)

	async function attempt(aurl) {
		const info = await fetch(aurl.toString() + (aurl.pathname.includes("api") ? "" : "api") + "/policies/instance/domains")
			.then(x => x.json())

		return {
			api: info.apiEndpoint,
			gateway: info.gateway,
			cdn: info.cdn,
			wellknown: url,
			login: aurl.toString()
		}
	}
	try {
		return await attempt(url)
	} catch {}

	const wellKnown = await fetch(url.origin + "/.well-known/spacebar")
		.then(x => x.json())
		.then(x => new URL(x.api))
	return await attempt(wellKnown)
}

async function check(event) {
	event.preventDefault()
	const h = await login(event.srcElement[1].value, event.srcElement[2].value)
	document.getElementById("wrong").textContent = h
}

let instancein
let verify
async function checkInstance() {
	try {
		verify.textContent = "Checking Instance"
		localStorage.setItem("instanceEndpoints", JSON.stringify(await setInstance(instancein.value)))
		verify.textContent = "Instance is all good"
		if (checkInstance.alt) checkInstance.alt()

		setTimeout(() => {
			verify.textContent = ""
		}, 3000)
	} catch (e) {
		console.warn("Check Instance Error", e)
		verify.textContent = "Invalid Instance, try again"
	}
}

document.addEventListener("DOMContentLoaded", async () => {
	if (!document.getElementById("form")) return

	document.getElementById("form").addEventListener("submit", check)

	instancein = document.getElementById("instancein")
	verify = document.getElementById("verify")
	let timeout = 0

	instancein.addEventListener("keydown", () => {
		verify.textContent = "Waiting to check Instance"
		if (timeout) clearTimeout(timeout)
		timeout = setTimeout(checkInstance, 1000)
	})

	if (localStorage.getItem("instanceEndpoints")) instancein.value = JSON.parse(localStorage.getItem("instanceEndpoints")).wellknown
	else {
		try {
			const wellknownRes = await fetch(location.origin + "/.well-known/spacebar")
			instancein.value = new URL((await wellknownRes.json()).api).toString()
			console.log("Found well-known on current origin: " + instancein.value)
		} catch {
			instancein.value = "https://spacebar.chat/"
		}
		checkInstance()
	}
})
