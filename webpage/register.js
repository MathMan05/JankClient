const registertry = async event => {
	event.preventDefault()

	if (document.getElementById("pass1").value != document.getElementById("pass2").value) {
		document.getElementById("wrong").textContent = "Passwords don't match"
		return
	}

	const email = document.getElementById("email").value
	const apiUrl = new URL(JSON.parse(localStorage.getItem("instanceEndpoints")).api).toString()

	const res = await fetch(apiUrl + "/auth/register", {
		method: "POST",
		headers: {
			"Content-Type": "application/json"
		},
		body: JSON.stringify({
			date_of_birth: document.getElementById("birthdate").value,
			email,
			username: document.getElementById("uname").value,
			password: document.getElementById("pass1").value,
			consent: document.getElementById("tos-check").checked
		})
	})

	const json = await res.json()
	if (json.token) {
		localStorage.setItem("userinfos", JSON.stringify({
			currentuser: email + apiUrl,
			users: {
				[email + apiUrl]: {
					email,
					pfpsrc: null,
					serverurls: JSON.parse(localStorage.getItem("instanceEndpoints")),
					username: document.getElementById("uname").value,
					token: json.token
				}
			},
			preferences: {
				theme: "dark",
				notifications: false,
				notisound: "three"
			}
		}))
		location.href = "/channels/@me"
	} else {
		console.log(json)
		document.getElementById("wrong").textContent = json.errors[Object.keys(json.errors)[0]]._errors[0].message
	}
}

document.addEventListener("DOMContentLoaded", () => {
	document.getElementById("register").addEventListener("submit", registertry)

	let TOSa = document.getElementById("TOSa")
	checkInstance.alt = async () => {
		const apiurl = new URL(JSON.parse(localStorage.getItem("instanceEndpoints")).api)
		const tosPage = (await (await fetch(apiurl.toString() + "/ping")).json()).instance.tosPage
		if (tosPage) {
			document.getElementById("TOSbox").innerHTML = "I agree to the <a id=\"TOSa\" target=\"_blank\" rel=\"noopener\">Terms of Service</a>:"
			TOSa = document.getElementById("TOSa")
			TOSa.href = tosPage

			document.getElementById("tos-check").disabled = false
			document.getElementById("tos-check").checked = false
		} else {
			document.getElementById("TOSbox").textContent = "This instance has no Terms of Service."
			TOSa = null

			document.getElementById("tos-check").disabled = true
			document.getElementById("tos-check").checked = true
		}
		console.log("Found ToS page: " + tosPage)
	}
})
