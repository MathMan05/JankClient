"use strict"

// eslint-disable-next-line no-unused-vars
class User {
	static userids = {}
	static checkuser(userjson) {
		if (User.userids[userjson.id]) return User.userids[userjson.id]

		const tempuser = new User(userjson)
		User.userids[userjson.id] = tempuser
		return tempuser
	}
	constructor(userjson) {
		for (const thing of Object.keys(userjson)) {
			this[thing] = userjson[thing]
		}
		this.hypotheticalpfp = false
	}
	async resolvemember(guild) {
		await Member.resolve(this, guild)
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
