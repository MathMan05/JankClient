class group extends channel {
	constructor(json, owner) {
		super(-1)
		this.owner = owner
		this.messages = []
		this.name = json.recipients[0]?.username
		if (json.recipients[0]) this.user = user.checkuser(json.recipients[0])
		else this.user = this.owner.owner.user

		this.name ??= owner.owner.user.username
		this.id = json.id
		this.parent_id = null
		this.parent = null
		this.children = []
		this.guild_id = "@me"
		this.messageids = {}
		this.permission_overwrites = []
		this.lastmessageid = json.last_message_id
		this.lastmessageid ??= 0
		this.mentions = 0
	}
	createguildHTML() {
		const div = document.createElement("div")
		div.classList.add("channeleffects")
		const myhtml = document.createElement("span")
		myhtml.textContent = this.name
		div.appendChild(this.user.buildpfp())
		div.appendChild(myhtml)
		div.myinfo = this
		div.onclick = function() {
			this.myinfo.getHTML()
		}
		return div
	}
	getHTML() {
		this.owner.prevchannel = this
		this.owner.owner.channelfocus = this.id
		this.putmessages()
		history.pushState(null, null, "/channels/" + this.guild_id + "/" + this.id)
		document.getElementById("channelname").textContent = "@" + this.name
	}
	messageCreate(messagep, focus) {
		const messagez = new cmessage(messagep.d)
		this.lastmessageid = messagez.id
		if (messagez.author === this.owner.owner.user) this.lastreadmessageid = messagez.id

		this.messages.unshift(messagez)
		const scrolly = document.getElementById("messagecontainer")
		this.messageids[messagez.id] = messagez

		let shouldScroll = false
		if (this.owner.owner.lookingguild.prevchannel === this) {
			shouldScroll = scrolly.scrollTop + scrolly.clientHeight > scrolly.scrollHeight - 20
			messages.appendChild(messagez.buildhtml(this.messages[1]))
		}
		if (shouldScroll) scrolly.scrollTop = scrolly.scrollHeight

		if (this.owner.owner.lookingguild === this.owner) {
			const channellist = document.getElementById("channels").children[0]
			for (const thing of channellist.children) {
				if (thing.myinfo === this) {
					channellist.prepend(thing)
					console.log(thing.myinfo)
					break
				}
				console.log(thing.myinfo, this, thing.myinfo === this)
			}
		}
		this.unreads()
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
			div.classList.add("servernoti")
			const noti = document.createElement("div")
			noti.classList.add("unread", "notiunread", "pinged")
			noti.textContent = this.mentions

			div.noti = noti
			div.append(noti)
			const buildpfp = this.user.buildpfp()
			div.all = this
			buildpfp.classList.add("mentioned")
			console.log(this)
			div.append(buildpfp)
			sentdms.append(div)
			div.onclick = function() {
				this.all.owner.loadGuild()
				this.all.getHTML()
			}
		} else if (current) current.remove()
	}
}

class direct extends guild {
	constructor(json, owner) {
		super(-1)
		console.log(json)
		this.owner = owner
		if (!this.owner) console.error("Owner was not included, please fix")

		this.channels = []
		this.channelids = {}
		this.id = "@me"
		this.properties = {}
		this.roles = []
		this.roleids = {}
		this.prevchannel = void 0
		this.properties.name = "Direct Messages"
		for (const thing of json) {
			const temp = new group(thing, this)
			this.channels.push(temp)
			this.channelids[temp.id] = temp
		}
		this.headchannels = this.channels
	}
	createChannelpac(json) {
		const thischannel = new group(json, this.owner)
		this.channelids[json.id] = thischannel
		this.channels.push(thischannel)
		this.calculateReorder()
		this.printServers()
	}
	sortchannels() {
		this.headchannels.sort((a, b) => {
			const result = (BigInt(a.lastmessageid) - BigInt(b.lastmessageid))
			return Number(-result)
		})
	}
	giveMember(member) {
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
