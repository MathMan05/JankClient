"use strict"

const getBulkInfo = () => {
	return JSON.parse(localStorage.getItem("userinfos"))
}

class SpecialUser {
	constructor(json) {
		if (json instanceof SpecialUser) throw new Error("Input for SpecialUser must not be instance of SpecialUser")

		const instanceURLs = {
			api: new URL(json.serverurls.api).toString(),
			cdn: new URL(json.serverurls.cdn).toString(),
			gateway: new URL(json.serverurls.gateway).toString(),
			wellknown: new URL(json.serverurls.wellknown).toString()
		}
		Object.keys(instanceURLs).forEach(key => {
			if (instanceURLs[key].endsWith("/")) instanceURLs[key] = instanceURLs[key].slice(0, -1)
		})
		if (!/\/v\d+$/.test(instanceURLs.api)) instanceURLs.api += "/v9"
		this.serverurls = instanceURLs

		this.email = json.email
		this.token = json.token
		this.loggedin = json.loggedin
		this.json = json
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

// eslint-disable-next-line no-unused-vars
const getBulkUsers = () => {
	const json = getBulkInfo()
	for (const user in json.users) {
		json.users[user] = new SpecialUser(json.users[user])
	}
	return json
}

const setDefaults = () => {
	let userinfos = getBulkInfo()
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
		userinfos = getBulkInfo()
	}

	if (userinfos.users === void 0) userinfos.users = {}
	if (userinfos.preferences === void 0) {
		userinfos.preferences = {
			theme: "dark",
			notifcations: false,
			notisound: "three"
		}
	}
	if (userinfos.preferences && userinfos.preferences.notisound === void 0)
		userinfos.preferences.notisound = "three"

	localStorage.setItem("userinfos", JSON.stringify(userinfos))
}
setDefaults()

const adduser = user => {
	user = new SpecialUser(user)
	const info = getBulkInfo()
	info.users[user.uid] = user
	info.currentuser = user.uid
	localStorage.setItem("userinfos", JSON.stringify(info))
}

const login = async (username, password, captcha) => {
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
			undelete: false,
			captcha_key: captcha
		})
	})

	const json = await res.json()
	console.log(json)
	if (json.message == "Invalid Form Body") return Object.values(json.errors)[0]._errors[0].message

	if (json.captcha_sitekey) {
		const capt = document.getElementById("h-captcha")
		if (capt.children.length) {
			if (json.captcha_servicejson.captcha_service == "hcaptcha") hcaptcha.reset()
			else location.reload()
		} else {
			const capty = document.createElement("div")
			capty.classList.add("h-captcha")
			capty.setAttribute("data-sitekey", json.captcha_sitekey)

			const script = document.createElement("script")
			if (json.captcha_service == "recaptcha") script.src = "https://www.google.com/recaptcha/api.js?render=" + json.captcha_sitekey
			else if (json.captcha_service == "hcaptcha") script.src = "https://js.hcaptcha.com/1/api.js"
			else console.error("Unknown captcha service " + json.captcha_service + " found in login response!")

			capt.append(script)
			capt.append(capty)
		}
	} else {
		adduser({serverurls: info, email: username, token: json.token})
		location.href = "/channels/@me"
	}
}

const setInstance = async url => {
	url = new URL(url)

	const attempt = async aurl => {
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

const check = async event => {
	event.preventDefault()
	const error = await login(event.srcElement[1].value, event.srcElement[2].value, event.srcElement[3].value)
	document.getElementById("wrong").textContent = error || ""
}

let instancein
let verify
const checkInstance = async () => {
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

const setTheme = theme => {
	if (theme == "light") {
		document.body.classList.remove("dark-theme")
		document.body.classList.add("light-theme")
	} else {
		document.body.classList.remove("light-theme")
		document.body.classList.add("dark-theme")
	}
}

document.addEventListener("DOMContentLoaded", async () => {
	if (localStorage.getItem("theme")) setTheme(localStorage.getItem("theme"))
	else if (window.matchMedia("(prefers-color-scheme: light)").matches) setTheme("light")

	if (!document.getElementById("instancein")) return

	if (document.getElementById("form")) document.getElementById("form").addEventListener("submit", check)

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
