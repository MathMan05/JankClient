"use strict"

// eslint-disable-next-line no-unused-vars
class InfiniteScroller {
	minDist = 3000
	maxDist = 8000
	HTMLElements = []
	constructor(getIDFromOffset, getHTMLFromID, destroyFromID, reachesBottom = () => {}) {
		this.getIDFromOffset = getIDFromOffset
		this.getHTMLFromID = getHTMLFromID
		this.destroyFromID = destroyFromID
		this.reachesBottom = reachesBottom
	}
	async getDiv(initialId) {
		const div = document.createElement("div")
		div.classList.add("messagecontainer")
		const scroll = document.createElement("div")
		scroll.classList.add("flexttb")
		div.append(scroll)
		this.div = div
		this.interval = setInterval(this.updatestuff.bind(this), 100)
		this.scroll = scroll
		this.scroll.addEventListener("scroll", this.watchForChange.bind(this))
		new ResizeObserver(this.watchForChange.bind(this)).observe(div)
		new ResizeObserver(this.watchForChange.bind(this)).observe(scroll)

		await this.firstElement(initialId)
		this.updatestuff()
		await this.watchForChange().then(() => {
			this.updatestuff()
		})
		return div
	}
	updatestuff() {
		this.scrollBottom = this.scroll.scrollHeight - this.scroll.scrollTop - this.scroll.clientHeight
		this.scrollTop = this.scroll.scrollTop
		if (this.scrollBottom) this.reachesBottom()
	}
	async firstElement(id) {
		const html = await this.getHTMLFromID(id)
		this.scroll.append(html)
		this.HTMLElements.push([html, id])
	}
	currrunning = false
	async addedBottom() {
		this.updatestuff()
		const scrollBottom = this.scrollBottom
		await this.watchForChange()
		if (scrollBottom < 30) this.scroll.scrollTop = this.scroll.scrollHeight
	}
	async watchForTop() {
		let again = false
		if (this.scrollTop == 0) {
			this.scrollTop = 1
			this.scroll.scrollTop = 1
		}

		if (this.scrollTop < this.minDist) {
			const previd = this.HTMLElements.at(0)[1]
			const nextid = await this.getIDFromOffset(previd, 1)
			if (nextid) {
				again = true
				const html = await this.getHTMLFromID(nextid)
				this.scroll.prepend(html)
				this.HTMLElements.unshift([html, nextid])
				this.scrollTop += 60
			}
		}

		if (this.scrollTop > this.maxDist) {
			again = true
			const html = this.HTMLElements.shift()
			await this.destroyFromID(html[1])
			this.scrollTop -= 60
		}

		if (again) await this.watchForTop()
	}
	async watchForBottom() {
		let again = false
		const scrollBottom = this.scrollBottom
		if (scrollBottom < this.minDist) {
			const previd = this.HTMLElements.at(-1)[1]
			const nextid = await this.getIDFromOffset(previd, -1)
			if (nextid) {
				again = true
				const html = await this.getHTMLFromID(nextid)
				this.scroll.append(html)
				this.HTMLElements.push([html, nextid])
				this.scrollBottom += 60
				if (scrollBottom < 30) this.scroll.scrollTop = this.scroll.scrollHeight
			}
		}

		if (scrollBottom > this.maxDist) {
			again = true
			const html = this.HTMLElements.pop()
			await this.destroyFromID(html[1])
			this.scrollBottom -= 60
		}

		if (again) await this.watchForBottom()
	}
	async watchForChange() {
		if (this.currrunning) return

		this.currrunning = true
		if (!this.div) {
			this.currrunning = false
			return
		}
		await Promise.allSettled([this.watchForBottom(), this.watchForTop()])
		this.currrunning = false
	}
	async focus(id, flash = true) {
		let element
		for (const thing of this.HTMLElements) {
			if (thing[1] == id) element = thing[0]
		}

		if (element) {
			if (flash) {
				element.scrollIntoView({
					behavior: "smooth",
					block: "center"
				})
				await new Promise(resolve => {
					setTimeout(resolve, 1000)
				})

				element.classList.remove("jumped")
				await new Promise(resolve => {
					setTimeout(resolve, 100)
				})
				element.classList.add("jumped")
			} else element.scrollIntoView()
		} else {
			for (const thing of this.HTMLElements) {
				await this.destroyFromID(thing[1])
			}

			this.HTMLElements = []
			await this.firstElement(id)
			this.updatestuff()
			await this.watchForChange()
			await new Promise(resolve => {
				setTimeout(resolve, 100)
			})
			await this.focus(id, true)
		}
	}
	async delete() {
		for (const thing of this.HTMLElements) {
			await this.destroyFromID(thing[1])
		}
		this.HTMLElements = []
		clearInterval(this.interval)
		if (this.div) this.div.remove()
		this.scroll = null
		this.div = null
	}
}
