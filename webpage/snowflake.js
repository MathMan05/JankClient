"use strict"

// eslint-disable-next-line no-unused-vars
class SnowFlake {
	static SnowFlakes = new Map()
	// eslint-disable-next-line unicorn/consistent-function-scoping
	static FinalizationRegistry = new FinalizationRegistry(a => {
		SnowFlake.SnowFlakes.get(a[1]).delete(a[0])
	})
	constructor(id, obj) {
		if (!obj) {
			this.id = id
			return
		}
		if (!SnowFlake.SnowFlakes.get(obj.constructor)) SnowFlake.SnowFlakes.set(obj.constructor, new Map())

		if (SnowFlake.SnowFlakes.get(obj.constructor).get(id)) {
			const snowflake = SnowFlake.SnowFlakes.get(obj.constructor).get(id).deref()
			snowflake.obj = obj

			if (snowflake) {
				snowflake.obj = obj
				// eslint-disable-next-line no-constructor-return
				return snowflake
			}
			SnowFlake.SnowFlakes.get(obj.constructor).delete(id)
		}
		this.id = id
		SnowFlake.SnowFlakes.get(obj.constructor).set(id, new WeakRef(this))
		SnowFlake.FinalizationRegistry.register(this, [id, obj.constructor])
		this.obj = obj
	}
	static clear() {
		this.SnowFlakes = new Map()
	}
	static getSnowFlakeFromID(id, type) {
		if (!SnowFlake.SnowFlakes.get(type)) {
			SnowFlake.SnowFlakes.set(type, new Map())
		}
		const snowflake = SnowFlake.SnowFlakes.get(type).get(id)
		if (snowflake) {
			const obj = snowflake.deref()
			if (obj) return obj

			SnowFlake.SnowFlakes.get(type).delete(id)
		}

		const newSnowflake = new SnowFlake(id, void 0)
		SnowFlake.SnowFlakes.get(type).set(id, new WeakRef(newSnowflake))
		SnowFlake.FinalizationRegistry.register(this, [id, type])
		return newSnowflake
	}
	static hasSnowFlakeFromID(id, type) {
		if (!SnowFlake.SnowFlakes.get(type)) return false

		const flake = SnowFlake.SnowFlakes.get(type).get(id)
		if (flake) {
			const flake2 = flake.deref()?.getObject()
			return Boolean(flake2)
		}

		return false
	}
	getUnixTime() {
		try {
			return Number((BigInt(this.id) >> 22n) + 1420070400000n)
		} catch {
			console.error(`The ID is corrupted, it's ${this.id} when it should be some number.`)
			return 0
		}
	}
	toString() {
		return this.id
	}
	getObject() {
		return this.obj
	}
}
