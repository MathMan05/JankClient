class role {
	constructor(json, owner) {
		for (const thing of Object.keys(json)) {
			this[thing] = json[thing]
		}
		this.permissions = new permissions(json.permissions)
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
