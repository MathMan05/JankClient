class member {
	constructor(memberjson) {
		for (const thing of Object.keys(memberjson)) {
			this[thing] = memberjson[thing]
		}
		this.user = new user(this.user)
	}
	hasRole(ID) {
		for (const thing of this.roles) {
			console.log(this.roles)
			if (thing.id === ID) {
				return true
			}
		}
		return false
	}
	isAdmin() {
		console.log(this)
		return this.guild.properties.owner_id === this.user.id
	}
}
