"use strict"

// eslint-disable-next-line no-unused-vars
class Role {
	constructor(json, owner) {
		for (const thing of Object.keys(json)) {
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
	getColor() {
		if (this.color == 0) return null

		return "#" + this.color.toString(16).padStart(6, "0")
	}
}
