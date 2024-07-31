"use strict"

class User {
	static contextmenu = new Contextmenu()
	static setUpContextMenu() {
		this.contextmenu.addbutton("Copy user id", function() {
			navigator.clipboard.writeText(this.id)
		})
		this.contextmenu.addbutton("Message user", function() {
			fetch(instance.api + "/users/@me/channels", {
				method: "POST",
				headers: this.localuser.headers,
				body: JSON.stringify({
					recipients: [this.id]
				})
			})
		})
	}

	static userids = {}
	static clear() {
		this.userids = {}
	}
	static checkuser(userjson, owner) {
		if (User.userids[userjson.id]) return User.userids[userjson.id]

		const tempuser = new User(userjson, owner)
		User.userids[userjson.id] = tempuser
		return tempuser
	}
	get info() {
		return this.owner.info
	}
	get localuser() {
		return this.owner
	}
	get id() {
		return this.snowflake.id
	}

	constructor(userjson, owner) {
		this.owner = owner
		if (!owner) console.error("missing localuser")

		for (const thing of Object.keys(userjson)) {
			if (thing == "bio") {
				this.bio = new MarkDown(userjson[thing], this.localuser)
				continue
			}
			if (thing === "id") {
				this.snowflake = new SnowFlake(userjson[thing], this)
				continue
			}

			this[thing] = userjson[thing]
		}
		this.hypotheticalpfp = false
	}
	async resolvemember(guild) {
		return await Member.resolve(this, guild)
	}
	clone() {
		return new User({
			username: this.username,
			id: this.id + "#clone",
			public_flags: this.public_flags,
			discriminator: this.discriminator,
			avatar: this.avatar,
			accent_color: this.accent_color,
			banner: this.banner,
			bio: this.bio.rawString,
			premium_since: this.premium_since,
			premium_type: this.premium_type,
			bot: this.bot,
			theme_colors: this.theme_colors,
			pronouns: this.pronouns,
			badge_ids: this.badge_ids
		}, this.owner)
	}
	buildpfp() {
		const pfp = document.createElement("img")
		pfp.crossOrigin = "anonymous"
		pfp.src = this.getpfpsrc()
		pfp.alt = ""
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
		return instance.cdn + "/avatars/" + this.id + "/" + this.avatar + ".png?size=64"
	}
	buildprofile(x, y, type = "author") {
		if (Contextmenu.currentmenu != "") Contextmenu.currentmenu.remove()

		let nickname, username, discriminator, bio, pronouns
		if (type == "author") {
			username = this.username
			nickname = this.username

			bio = this.bio
			discriminator = this.discriminator
			pronouns = this.pronouns
		}

		const div = document.createElement("div")
		if (x == -1) div.classList.add("hypoprofile", "flexttb")
		else {
			div.style.left = x + "px"
			div.style.top = y + "px"
			div.classList.add("profile", "flexttb")
		}

		const pfp = this.buildpfp()
		div.appendChild(pfp)

		const userbody = document.createElement("div")
		userbody.classList.add("infosection")
		div.appendChild(userbody)
		const usernamehtml = document.createElement("h2")
		usernamehtml.textContent = nickname
		userbody.appendChild(usernamehtml)

		const discrimatorhtml = document.createElement("h3")
		discrimatorhtml.classList.add("tag")
		discrimatorhtml.textContent = username + "#" + discriminator
		userbody.appendChild(discrimatorhtml)

		const pronounshtml = document.createElement("p")
		pronounshtml.textContent = pronouns
		pronounshtml.classList.add("pronouns")
		userbody.appendChild(pronounshtml)

		const rule = document.createElement("hr")
		userbody.appendChild(rule)
		userbody.appendChild(bio.makeHTML())

		if (x != -1) {
			Contextmenu.currentmenu = div
			document.body.appendChild(div)
			Contextmenu.keepOnScreen(div)
		}
		return div
	}
	profileclick(obj, author) {
		obj.onclick = event => {
			event.stopPropagation()
			this.buildprofile(event.clientX, event.clientY, author)
		}
	}
	contextMenuBind(html, guild) {
		if (guild && guild.id != "@me") {
			Member.resolve(this, guild).then(member => {
				member.contextMenuBind(html)
			}).catch(() => {})
		}

		this.profileclick(html)
		User.contextmenu.bind(html, this)
	}
	static async resolve(id, localuser) {
		const res = await fetch(instance.api + "/users/" + id + "/profile", {
			headers: localuser.headers
		})
		return new User(await res.json(), localuser)
	}
}

User.setUpContextMenu()
