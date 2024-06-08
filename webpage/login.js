async function login(username, password) {
	const options = {
		method: "POST",
		body: JSON.stringify({
			login: username,
			password,
			undelete: false
		}),
		headers: {
			"Content-type": "application/json; charset=UTF-8"
		}
	}
	try {
		return await fetch("https://spacebar-api.vanillaminigames.net/api/auth/login", options).then(response => response.json())
			.then(response => {
				console.log(response, response.message)
				if (response.message == "Invalid Form Body") {
					return response.errors.login._errors[0].message
				}
				localStorage.setItem("token", response.token)
				window.location.href = "/channels/@me"
				return response.token
			})
	} catch (error) {
		console.error("Error:", error)
	}
}

function gettoken() {
	const temp = localStorage.getItem("token")
	if (!temp) location.href = "/login.html"
	return temp
}

async function check(e) {
	e.preventDefault()
	const h = await login(e.srcElement[0].value, e.srcElement[1].value)
	document.getElementById("wrong").textContent = h
	console.log(h)
}
if (document.getElementById("form")) {
	document.getElementById("form").addEventListener("submit", check)
}
