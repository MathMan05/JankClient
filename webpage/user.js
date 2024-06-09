const usercache = {}
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
		if (usercache[this.id + "+" + guild.id]) return usercache[this.id + "+" + guild.id]

		const tempy = new Promise((resolve, reject) => {
			usercache[this.id + "+" + guild.id] = { done: false }
			fetch(instance.api + "/users/" + this.id + "/profile?with_mutual_guilds=true&with_mutual_friends_count=false&guild_id=" + guild.id)
				.then(res => res.json()).then(str => {
					return new member(str)
				})
		})
		usercache[this.id + "+" + guild.id] = tempy
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
		else return instance.cdn + "/avatars/" + this.id + "/" + this.avatar + ".png"
	}
	createjankpromises() {
		new Promise(_ => {})
	}
}
