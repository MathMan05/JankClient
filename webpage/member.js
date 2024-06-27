class Member {
	static already = {}
	constructor(memberjson, owner) {
		if (!owner) console.error("Guild not included in the creation of a member object")

		this.owner = owner
		let membery = memberjson
		if (memberjson.guild_member) {
			membery = memberjson.guild_member
			this.user = memberjson.user
		}

		for (const thing of Object.keys(membery)) {
			if (thing == "guild") continue

			this[thing] = membery[thing]
		}
		this.user = User.checkuser(this.user)
	}
	get guild() {
		return this.owner
	}
	get localuser() {
		return this.guild.localuser
	}
	static async resolve(user, guild) {
		if (!Member.already[guild.id]) {
			Member.already[guild.id] = {}
		} else if (Member.already[guild.id][user.id]) {
			const memb = Member.already[guild.id][user.id]
			if (memb instanceof Promise) {
				return await memb
			}
			return memb
		}

		const promise = fetch(instance.api + "/users/" + user.id + "/profile?with_mutual_guilds=true&with_mutual_friends_count=true&guild_id=" + guild.id, {
			headers: guild.headers
		}).then(res => res.json()).then(json => {
			const memb = new Member(json, guild)
			Member.already[guild.id][user.id] = memb
			guild.fillMember(memb)
			return memb
		})

		Member.already[guild.id][user.id] = promise
		return await promise
	}
	hasRole(ID) {
		for (const role of this.roles) {
			if (role.id == ID) return true
		}
		return false
	}
	getColor() {
		for (const r of this.roles) {
			const color = r.getColor()
			if (color) return color
		}
		return ""
	}
	isAdmin() {
		return this.guild.properties.owner_id == this.user.id
	}
}
