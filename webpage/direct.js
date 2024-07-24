class Group extends Channel {
	constructor(json, owner) {
		super(-1, owner)

		this.message_notifications = 0
		this.owner = owner
		this.headers = this.guild.headers
		this.name = json.recipients[0]?.username
		if (json.recipients[0]) this.user = User.checkuser(json.recipients[0], this.localuser)
		else this.user = this.localuser.user

		this.name ??= this.localuser.user.username
		this.id = json.id
		this.parent_id = null
		this.parent = null
		this.children = []
		this.guild_id = "@me"
		this.messageids = new Map()
		this.permission_overwrites = {}
		this.lastmessageid = json.last_message_id
		this.lastmessageid ??= "0"
		this.mentions = 0

		this.setUpInfiniteScroller()
	}
	createGuildHTML() {
		const div = document.createElement("div")
		div.classList.add("channeleffects")
		const myhtml = document.createElement("span")
		myhtml.textContent = this.name
		div.appendChild(this.user.buildpfp())
		div.appendChild(myhtml)

		div.all = this
		div.onclick = function() {
			this.all.getHTML()
		}
		return div
	}
	async getHTML() {
		const id = ++Channel.genid
		if (this.guild !== this.localuser.lookingguild) this.guild.loadGuild()

		if (this.localuser.channelfocus && this.localuser.channelfocus.myhtml) this.localuser.channelfocus.myhtml.classList.remove("viewChannel")
		this.myhtml.classList.add("viewChannel")

		this.guild.prevchannel = this
		this.localuser.channelfocus = this
		const prom = this.infinite.delete()
		await this.putmessages()
		await prom
		if (id != Channel.genid) return

		this.buildmessages()
		history.pushState(null, "", "/channels/" + this.guild_id + "/" + this.id)
		document.getElementById("channelname").textContent = "@" + this.name
	}
	messageCreate(messagep) {
		const messagez = new Message(messagep.d, this)
		this.idToNext(this.lastmessageid, messagez.id)
		this.idToPrev.set(messagez.id, this.lastmessageid)
		this.lastmessageid = messagez.id
		this.messageids.set(messagez.id, messagez)

		if (messagez.author === this.localuser.user) {
			this.lastreadmessageid = messagez.id

			if (this.myhtml) this.myhtml.classList.remove("cunread")
		} else if (this.myhtml) this.myhtml.classList.add("cunread")
		this.unreads()
		this.infinite.addedBottom()

		if (messagez.author == this.localuser.user) return
		if (this.localuser.lookingguild.prevchannel === this && document.hasFocus()) return

		if (this.notification == "all" || (this.notification == "mentions" && messagez.mentionsuser(this.localuser.user))) this.notify(messagez)
	}
	notititle(message) {
		return message.author.username
	}
	unreads() {
		const sentdms = document.getElementById("sentdms")
		let current = null
		for (const thing of sentdms.children) {
			if (thing.all === this) current = thing
		}

		if (this.hasunreads) {
			if (current) {
				current.noti.textContent = this.mentions
				return
			}

			const div = document.createElement("div")
			div.classList.add("servericon")
			const noti = document.createElement("div")
			noti.classList.add("unread", "notiunread", "pinged")
			noti.textContent = this.mentions

			div.noti = noti
			div.append(noti)
			const buildpfp = this.user.buildpfp()
			div.all = this
			buildpfp.classList.add("mentioned")
			div.append(buildpfp)
			sentdms.append(div)
			div.onclick = notif => {
				notif.guild.loadGuild()
				notif.getHTML()
			}
		} else if (current) current.remove()
	}
	isAdmin() {
		return false
	}
	hasPermission() {
		return true
	}
}

// eslint-disable-next-line no-unused-vars
class Direct extends Guild {
	constructor(json, owner) {
		super(-1, owner, null)
		this.owner = owner
		this.headers = this.localuser.headers
		this.message_notifications = 0

		this.channels = []
		this.channelids = {}
		this.id = "@me"
		this.properties = {}
		this.roles = []
		this.roleids = {}
		this.prevchannel = void 0
		this.properties.name = "Direct Messages"
		for (const thing of json) {
			const temp = new Group(thing, this)
			this.channels.push(temp)
			this.channelids[temp.id] = temp
		}
		this.headchannels = this.channels
	}
	createChannelpac(json) {
		const thischannel = new Group(json, this)
		this.channelids[json.id] = thischannel
		this.channels.push(thischannel)
		this.calculateReorder()
	}
	sortchannels() {
		this.headchannels.sort((a, b) => {
			const result = (BigInt(a.lastmessageid) - BigInt(b.lastmessageid))
			return Number(-result)
		})
	}
	giveMember() {
		console.error("not a real guild, can't give member object")
	}
	getRole() {
		return null
	}
	hasRole() {
		return false
	}
	isAdmin() {
		return false
	}
	unreaddms() {
		for (const thing of this.channels) {
			thing.unreads()
		}
	}
}
