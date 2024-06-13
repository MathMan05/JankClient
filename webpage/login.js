"use strict"

async function login(username, password) {
	const options = {
		method: "POST",
		headers: {
			"Content-Type": "application/json; charset=UTF-8"
		},
		body: JSON.stringify({
			login: username,
			password,
			undelete: false
		})
	}
	try {
		const info = JSON.parse(localStorage.getItem("instanceEndpoints"))
		const url = new URL(info.login)
		return await fetch(url.origin + "/api/auth/login", options).then(response => response.json())
			.then(response => {
				console.log(response)
				if (response.message == "Invalid Form Body") return response.errors.login._errors[0].message

				localStorage.setItem("token", response.token)
				location.href = "/channels/@me"
				return response.token
			})
	} catch (error) {
		console.error("Error:", error)
	}
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
