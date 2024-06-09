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
		const info = JSON.parse(localStorage.getItem("instanceinfo"))
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

document.addEventListener("DOMContentLoaded", () => {
	document.getElementById("form").addEventListener("submit", check)

	const instancein = document.getElementById("instancein")
	const verify = document.getElementById("verify")
	let timeout = 0

	async function checkInstance() {
		try {
			verify.textContent = "Checking Instance"
			localStorage.setItem("instanceinfo", JSON.stringify(await setInstance(instancein.value)))
			verify.textContent = "Instance is all good"
			if (checkInstance.alt) checkInstance.alt()

			setTimeout(_ => {
				verify.textContent = ""
			}, 3000)
		} catch (e) {
			console.warn("Check Instance Error", e)
			verify.textContent = "Invalid Instance, try again"
		}
	}

	instancein.addEventListener("keydown", () => {
		verify.textContent = "Waiting to check Instance"
		if (timeout) clearTimeout(timeout)
		timeout = setTimeout(checkInstance, 1000)
	})

	if (localStorage.getItem("instanceinfo")) instancein.value = JSON.parse(localStorage.getItem("instanceinfo")).wellknown
	else checkInstance("https://spacebar.chat/")
})
