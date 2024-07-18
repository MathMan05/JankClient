const main = async () => {
	const connection = location.href.split("/")[4]

	const data = getBulkInfo()
	const params = new URLSearchParams(location.search)
	if (!data || !data.currentuser || !params.has("code") || !params.has("state")) return location.href = "/login"

	const res = await fetch(data.users[data.currentuser].serverurls.api + "/connections/" + connection + "/callback", {
		method: "POST",
		headers: {
			Authorization: data.users[data.currentuser].token,
			"Content-Type": "application/json; charset=UTF-8"
		},
		body: JSON.stringify({
			code: params.get("code"),
			state: params.get("state"),
			insecure: false,
			friend_sync: false
		})
	})

	if (res.status == 204) {
		document.getElementById("status").textContent = "Successfully connected your " + connection.charAt(0).toUpperCase() + connection.slice(1) + " account!"
		document.getElementById("status-additional").textContent = "You will be redirected shortly."

		setTimeout(() => {
			location.href = "/channels/@me"
		}, 2500)
	} else {
		const json = await res.json()
		console.log(json)

		document.getElementById("status").textContent = "Failed to connect your " + connection.charAt(0).toUpperCase() + connection.slice(1) + " account!"
		document.getElementById("status-additional").textContent = json.error
	}
}
main()
