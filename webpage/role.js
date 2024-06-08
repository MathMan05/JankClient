class role {
	constructor(json) {
		for (const thing of Object.keys(json)) {
			this[thing] = json[thing]
		}
	}
}
