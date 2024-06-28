"use strict"

// eslint-disable-next-line no-unused-vars
class Member {
	static already = {}
	constructor(memberjson, owner, error = false) {
		this.error = error
		if (!owner) console.error("Guild not included in the creation of a member object")

		if (memberjson.code == 404) return

		this.owner = owner
		let membery = memberjson
		this.roles = []
		if (!error) {
			if (memberjson.guild_member) membery = memberjson.guild_member
			this.user = memberjson.user
		}

		for (const thing of Object.keys(membery)) {
			if (thing == "guild" || thing == "owner") continue

			if (thing == "roles") {
				for (const strrole of membery.roles) {
					const role = this.guild.getRole(strrole)
					this.roles.push(role)
				}
			}
		}

		console.log(memberjson)
		if (error) this.user = memberjson
		else this.user = User.checkuser(this.user, owner.localuser)
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
		if (unknown instanceof User) user = unknown
		else return new Member(unknown, guild)

		if (!Member.already[guild.id]) Member.already[guild.id] = {}
		else if (Member.already[guild.id][user.id]) {
			const memb = Member.already[guild.id][user.id]

			if (memb instanceof Promise) return await memb
			return memb
		}

		const promise = fetch(instance.api + "/users/" + user.id + "/profile?with_mutual_guilds=true&with_mutual_friends_count=true" + (guild.id == "@me" ? "" : "&guild_id=" + guild.id), {
			headers: guild.headers
		}).then(res => res.json()).then(json => {
			const memb = new Member(json, guild)
			Member.already[guild.id][user.id] = memb
			return memb
		})

		Member.already[guild.id][user.id] = promise

		try {
			return await promise
		} catch {
			const memb = new Member(user, guild, true)
			Member.already[guild.id][user.id] = memb
			return memb
		}
	}
	hasRole(ID) {
		for (const role of this.roles) {
			if (role.id == ID) return true
		}
		return false
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
		for (const role of this.roles) {
			if (role.permissions.hasPermission("ADMINISTRATOR")) return true
		}

		return this.guild.properties.owner_id == this.user.id
	}
}
