"use strict"


class Member {
	static already = {}
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

	constructor(memberjson, owner, error = false) {
		this.error = error
		if (!owner) console.error("Guild not included in the creation of a member object")

		this.owner = owner
		this.headers = this.owner.headers
		let member = memberjson
		this.roles = []
		if (!error && memberjson.guild_member) member = memberjson.guild_member

		for (const thing of Object.keys(member)) {
			if (thing == "guild" || thing == "owner") continue

			if (thing == "roles") {
				for (const strrole of member.roles) {
					const role = SnowFlake.getSnowFlakeFromID(strrole, Role).getObject()
					this.roles.push(role)
				}
				continue
			}

			this[thing] = memberjson[thing]
		}

		if (error) this.user = memberjson
		else {
			if (SnowFlake.getSnowFlakeFromID(this?.id, User)) {
				this.user = SnowFlake.getSnowFlakeFromID(this.id, User).getObject()
				return
			}
			this.user = User.checkuser(member.user, owner.localuser)
		}
	}
	get guild() {
		return this.owner
	}
	get localuser() {
		return this.guild.localuser
	}
	get info() {
		return this.owner.info
	}
	static async resolve(unknown, guild) {
		if (!(guild instanceof Guild)) console.error(guild)

		let user
		let id
		if (unknown instanceof User) {
			user = unknown
			id = user.snowflake
		} else if (typeof unknown == "string") id = new SnowFlake(unknown, void 0)
		else return new Member(unknown, guild)

		if (!Member.already[guild.id]) Member.already[guild.id] = {}
		else if (Member.already[guild.id][id]) {
			const memb = Member.already[guild.id][id]

			if (memb instanceof Promise) return await memb
			return memb
		}

		const fetchPromise = fetch(instance.api + "/users/" + id + "/profile?with_mutual_guilds=true&with_mutual_friends_count=true" + (guild.id == "@me" ? "" : "&guild_id=" + guild.id), {
			headers: guild.headers
		})
		fetchPromise.catch(console.warn)
		const promise = fetchPromise.then(res => res.json()).then(json => {
			const memb = new Member(json, guild)
			Member.already[guild.id][id] = memb
			return memb
		})

		Member.already[guild.id][id] = promise

		try {
			return await promise
		} catch {
			const memb = new Member(user, guild, true)
			Member.already[guild.id][id] = memb
			return memb
		}
	}
	hasRole(ID) {
		return this.roles.some(role => role.id == ID)
	}
	getColor() {
		if (!this.roles) return ""

		for (const r of this.roles) {
			const color = r.getColor()
			if (color) return color
		}
		return ""
	}
	isAdmin() {
		return this.guild.properties.owner_id == this.user.id || this.roles.some(role => role.permissions.hasPermission("ADMINISTRATOR"))
	}
	contextMenuBind(html) {
		if (html.tagName == "SPAN") {
			if (this.error) {
				const error = document.createElement("span")
				error.textContent = "!"
				error.classList.add("membererror")
				html.after(error)
				return
			}

			html.style.color = this.getColor()
		}

		this.profileclick(html)
		Member.contextmenu.bind(html)
	}
	profileclick() {
		//to be implemented
	}
}

Member.setUpContextMenu()
