import{ Guild }from"./guild.js";
import{ Channel }from"./channel.js";
import{ Message }from"./message.js";
import{ Localuser }from"./localuser.js";
import{ User }from"./user.js";
import{
	channeljson,
	dirrectjson,
	memberjson,
	messagejson,
}from"./jsontypes.js";
import{ Permissions }from"./permissions.js";
import{ SnowFlake }from"./snowflake.js";
import{ Contextmenu }from"./contextmenu.js";
import { I18n } from "./i18n.js";

class Direct extends Guild{
	declare channelids: { [key: string]: Group };
	getUnixTime(): number{
		throw new Error("Do not call this for Direct, it does not make sense");
	}
	constructor(json: dirrectjson[], owner: Localuser){
		super(-1, owner, null);
		this.message_notifications = 0;
		this.owner = owner;
		if(!this.localuser){
			console.error("Owner was not included, please fix");
		}
		this.headers = this.localuser.headers;
		this.channels = [];
		this.channelids = {};
		// @ts-ignore
		this.properties = {};
		this.roles = [];
		this.roleids = new Map();
		this.prevchannel = undefined;
		this.properties.name = "Direct Messages";
		for(const thing of json){
			const temp = new Group(thing, this);
			this.channels.push(temp);
			this.channelids[temp.id] = temp;
			this.localuser.channelids.set(temp.id, temp);
		}
		this.headchannels = this.channels;
	}
	createChannelpac(json: any){
		const thischannel = new Group(json, this);
		this.channelids[thischannel.id] = thischannel;
		this.channels.push(thischannel);
		this.sortchannels();
		this.printServers();
		return thischannel;
	}
	delChannel(json: channeljson){
		const channel = this.channelids[json.id];
		super.delChannel(json);
		if(channel){
			channel.del();
		}
	}
	giveMember(_member: memberjson){
		console.error("not a real guild, can't give member object");
	}
	getRole(/* ID: string */){
		return null;
	}
	hasRole(/* r: string */){
		return false;
	}
	isAdmin(){
		return false;
	}
	unreaddms(){
		for(const thing of this.channels){
			(thing as Group).unreads();
		}
	}
}

const dmPermissions = new Permissions("0");
dmPermissions.setPermission("ADD_REACTIONS", 1);
dmPermissions.setPermission("VIEW_CHANNEL", 1);
dmPermissions.setPermission("SEND_MESSAGES", 1);
dmPermissions.setPermission("EMBED_LINKS", 1);
dmPermissions.setPermission("ATTACH_FILES", 1);
dmPermissions.setPermission("READ_MESSAGE_HISTORY", 1);
dmPermissions.setPermission("MENTION_EVERYONE", 1);
dmPermissions.setPermission("USE_EXTERNAL_EMOJIS", 1);
dmPermissions.setPermission("USE_APPLICATION_COMMANDS", 1);
dmPermissions.setPermission("USE_EXTERNAL_STICKERS", 1);
dmPermissions.setPermission("USE_EMBEDDED_ACTIVITIES", 1);
dmPermissions.setPermission("USE_SOUNDBOARD", 1);
dmPermissions.setPermission("USE_EXTERNAL_SOUNDS", 1);
dmPermissions.setPermission("SEND_VOICE_MESSAGES", 1);
dmPermissions.setPermission("SEND_POLLS", 1);
dmPermissions.setPermission("USE_EXTERNAL_APPS", 1);

dmPermissions.setPermission("CONNECT", 1);
dmPermissions.setPermission("SPEAK", 1);
dmPermissions.setPermission("STREAM", 1);
dmPermissions.setPermission("USE_VAD", 1);

// @ts-ignore I need to look into this lol
class Group extends Channel{
	user: User;
	static contextmenu = new Contextmenu<Group, undefined>("channel menu");
	static setupcontextmenu(){
		this.contextmenu.addbutton(()=>I18n.getTranslation("DMs.copyId"), function(this: Group){
			navigator.clipboard.writeText(this.id);
		});

		this.contextmenu.addbutton(()=>I18n.getTranslation("DMs.markRead"), function(this: Group){
			this.readbottom();
		});

		this.contextmenu.addbutton(()=>I18n.getTranslation("DMs.close"), function(this: Group){
			this.deleteChannel();
		});

		this.contextmenu.addbutton(()=>I18n.getTranslation("user.copyId"), function(){
			navigator.clipboard.writeText(this.user.id);
		});
	}
	constructor(json: dirrectjson, owner: Direct){
		super(-1, owner, json.id);
		this.owner = owner;
		this.headers = this.guild.headers;
		this.name = json.recipients[0]?.username;
		if(json.recipients[0]){
			this.user = new User(json.recipients[0], this.localuser);
		}else{
			this.user = this.localuser.user;
		}
		this.name ??= this.localuser.user.username;
	this.parent_id!;
	this.parent!;
	this.children = [];
	this.guild_id = "@me";
	this.permission_overwrites = new Map();
	this.lastmessageid = json.last_message_id;
	this.mentions = 0;
	this.setUpInfiniteScroller();
	this.updatePosition();
	}
	updatePosition(){
		if(this.lastmessageid){
			this.position = SnowFlake.stringToUnixTime(this.lastmessageid);
		}else{
			this.position = 0;
		}
		this.position = -Math.max(this.position, this.getUnixTime());
	}
	createguildHTML(){
		const div = document.createElement("div");
		Group.contextmenu.bindContextmenu(div, this,undefined);
		this.html = new WeakRef(div);
		div.classList.add("flexltr","liststyle");
		const myhtml = document.createElement("span");
		myhtml.classList.add("ellipsis");
		myhtml.textContent = this.name;
		div.appendChild(this.user.buildpfp());
		div.appendChild(myhtml);
		(div as any).myinfo = this;
		div.onclick = _=>{
			this.getHTML();
			const toggle = document.getElementById("maintoggle") as HTMLInputElement;
			toggle.checked = true;
		};

		return div;
	}
	async getHTML(){
		const id = ++Channel.genid;
		if(this.localuser.channelfocus){
			this.localuser.channelfocus.infinite.delete();
		}
		if(this.guild !== this.localuser.lookingguild){
			this.guild.loadGuild();
		}
		this.guild.prevchannel = this;
		this.localuser.channelfocus = this;
		const prom = this.infinite.delete();
		history.pushState(null, "", "/channels/" + this.guild_id + "/" + this.id);
		this.localuser.pageTitle("@" + this.name);
		(document.getElementById("channelTopic") as HTMLElement).setAttribute("hidden","");

		const loading = document.getElementById("loadingdiv") as HTMLDivElement;
		Channel.regenLoadingMessages();

		loading.classList.add("loading");
		this.rendertyping();
		await this.putmessages();
		await prom;
		this.localuser.getSidePannel();
		if(id !== Channel.genid){
			return;
		}
		this.buildmessages();
		(document.getElementById("typebox") as HTMLDivElement).contentEditable ="" + true;
	}
	messageCreate(messagep: { d: messagejson }){
		const messagez = new Message(messagep.d, this);
		if(this.lastmessageid){
			this.idToNext.set(this.lastmessageid, messagez.id);
			this.idToPrev.set(messagez.id, this.lastmessageid);
		}
		this.lastmessageid = messagez.id;
		if(messagez.author === this.localuser.user){
			this.lastreadmessageid = messagez.id;
			if(this.myhtml){
				this.myhtml.classList.remove("cunread");
			}
		}else{
			if(this.myhtml){
				this.myhtml.classList.add("cunread");
			}
		}
		this.unreads();
		this.updatePosition();
		this.infinite.addedBottom();
		this.guild.sortchannels();
		if(this.myhtml){
			const parrent = this.myhtml.parentElement as HTMLElement;
			parrent.prepend(this.myhtml);
		}
		if(this === this.localuser.channelfocus){
			if(!this.infinitefocus){
				this.tryfocusinfinate();
			}
			this.infinite.addedBottom();
		}
		this.unreads();
		if(messagez.author === this.localuser.user){
			return;
		}
		if(
			this.localuser.lookingguild?.prevchannel === this &&
	document.hasFocus()
		){
			return;
		}
		if(this.notification === "all"){
			this.notify(messagez);
		}else if(
			this.notification === "mentions" &&
	messagez.mentionsuser(this.localuser.user)
		){
			this.notify(messagez);
		}
	}
	notititle(message: Message){
		return message.author.username;
	}
	readbottom(){
		super.readbottom();
		this.unreads();
	}
	all: WeakRef<HTMLElement> = new WeakRef(document.createElement("div"));
	noti: WeakRef<HTMLElement> = new WeakRef(document.createElement("div"));
	del(){
		const all = this.all.deref();
		if(all){
			all.remove();
		}
		if(this.myhtml){
			this.myhtml.remove();
		}
	}
	unreads(){
		const sentdms = document.getElementById("sentdms") as HTMLDivElement; //Need to change sometime
		const current = this.all.deref();
		if(this.hasunreads){
			{
				const noti = this.noti.deref();
				if(noti){
					noti.textContent = this.mentions + "";
					return;
				}
			}
			const div = document.createElement("div");
			div.classList.add("servernoti");
			const noti = document.createElement("div");
			noti.classList.add("unread", "notiunread", "pinged");
			noti.textContent = "" + this.mentions;
			this.noti = new WeakRef(noti);
			div.append(noti);
			const buildpfp = this.user.buildpfp();
			this.all = new WeakRef(div);
			buildpfp.classList.add("mentioned");
			div.append(buildpfp);
			sentdms.append(div);
			div.onclick = _=>{
				this.guild.loadGuild();
				this.getHTML();
				const toggle = document.getElementById("maintoggle") as HTMLInputElement;
				toggle.checked = true;
			};
		}else if(current){
			current.remove();
		}else{
		}
	}
	isAdmin(): boolean{
		return false;
	}
	hasPermission(name: string): boolean{
		return dmPermissions.hasPermission(name);
	}
}
export{ Direct, Group };

Group.setupcontextmenu()
