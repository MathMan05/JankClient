"use strict"

class user {
	static userids = {}
	static checkuser(userjson) {
		if (user.userids[userjson.id]) return user.userids[userjson.id]

		const tempuser = new user(userjson)
		user.userids[userjson.id] = tempuser
		return tempuser
	}
	constructor(userjson) {
		for (const thing of Object.keys(userjson)) {
			this[thing] = userjson[thing]
		}
		this.hypotheticalpfp = false
	}
	async resolvemember(guild) {
		await member.resolve(this, guild)
	}
	buildpfp() {
		const pfp = document.createElement("img")
		pfp.crossOrigin = "anonymous"
		pfp.src = this.getpfpsrc(this.id, this.avatar)
		pfp.classList.add("pfp")
		pfp.classList.add("userid:" + this.id)
		return pfp
	}
	userupdate(json) {
		if (json.avatar != this.avatar) this.changepfp(json.avatar)
	}
	changepfp(update) {
		this.avatar = update
		this.hypotheticalpfp = false
		const src = this.getpfpsrc()
		for (const thing of document.getElementsByClassName("userid:" + this.id)) thing.src = src
	}
	getpfpsrc() {
		if (this.hypotheticalpfp) return this.avatar

		if (this.avatar === null) return instance.cdn + "/embed/avatars/3.png"
		return instance.cdn + "/avatars/" + this.id + "/" + this.avatar + ".png"
	}
}
