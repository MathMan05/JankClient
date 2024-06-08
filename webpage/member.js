class member {
	constructor(memberjson) {
		for (const thing of Object.keys(memberjson)) {
			this[thing] = memberjson[thing]
		}
		this.user = user.checkuser(this.user)
	}
	hasRole(ID) {
		for (const role of this.roles) {
			if (role.id == ID) return true
		}
		return false
	}
	isAdmin() {
		return this.guild.properties.owner_id == this.user.id
	}
}
