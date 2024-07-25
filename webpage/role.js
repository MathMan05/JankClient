"use strict"

// eslint-disable-next-line no-unused-vars
class Role {
	constructor(json, owner) {
		this.headers = owner.headers
		this.info = owner.info

		for (const thing of Object.keys(json)) {
			if (thing == "id") {
				this.snowflake = new SnowFlake(json.id, this)
				continue
			}
			this[thing] = json[thing]
		}
		this.permissions = new Permissions(json.permissions)
		this.owner = owner
	}
	get guild() {
		return this.owner
	}
	get localuser() {
		return this.guild.localuser
	}
	get id() {
		return this.snowflake.id
	}
	getColor() {
		if (this.color == 0) return null

		return "#" + this.color.toString(16).padStart(6, "0")
	}
}
