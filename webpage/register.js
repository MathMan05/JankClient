async function registertry(event) {
	event.preventDefault()
	const elements = event.srcElement
	const email = elements[1].value
	const username = elements[2].value
	if (elements[3].value != elements[4].value) {
		document.getElementById("wrong").textContent = "Passwords don't match"
		return
	}
	const password = elements[3].value
	const dateofbirth = elements[5].value
	const apiurl = new URL(JSON.parse(localStorage.getItem("instanceEndpoints")).api)

	fetch(apiurl + "/auth/register", {
		method: "POST",
		headers: {
			"Content-Type": "application/json"
		},
		body: JSON.stringify({
			date_of_birth: dateofbirth,
			email,
			username,
			password,
			consent: elements[6].checked
		})
	}).then(res => {
		res.json().then(json => {
			if (json.token) {
				localStorage.setItem("token", json.token)
				location.href = "/channels/@me"
			} else {
				console.log(json)
				document.getElementById("wrong").textContent = json.errors[Object.keys(json.errors)[0]]._errors[0].message
			}
		})
	})
}

document.addEventListener("DOMContentLoaded", () => {
	document.getElementById("register").addEventListener("submit", registertry)

	let TOSa = document.getElementById("TOSa")
	async function tosLogic() {
		const apiurl = new URL(JSON.parse(localStorage.getItem("instanceEndpoints")).api)
		const tosPage = (await (await fetch(apiurl.toString() + "/ping")).json()).instance.tosPage
		if (tosPage) {
			document.getElementById("TOSbox").innerHTML = "I agree to the <a href=\"\" id=\"TOSa\" target=\"_blank\" rel=\"noopener\">Terms of Service</a>:"
			TOSa = document.getElementById("TOSa")
			TOSa.href = tosPage
		} else {
			document.getElementById("TOSbox").textContent = "This instance has no Terms of Service, accept them anyways:"
			TOSa = null
		}
		console.log("Found ToS page: " + tosPage)
	}
	checkInstance.alt = tosLogic
})
