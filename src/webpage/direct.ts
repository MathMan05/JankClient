import{ Guild }from"./guild.js";
import{ Channel }from"./channel.js";
import{ Message }from"./message.js";
import{ Localuser }from"./localuser.js";
import{ User }from"./user.js";
import{channeljson,dirrectjson,memberjson,messagejson}from"./jsontypes.js";
import{ Permissions }from"./permissions.js";
import{ SnowFlake }from"./snowflake.js";
import{ Contextmenu }from"./contextmenu.js";
import { I18n } from "./i18n.js";
import { Float, FormError } from "./settings.js";

class Direct extends Guild{
	declare channelids: { [key: string]: Group };
	channels: Group[];
	getUnixTime(): number{
		throw new Error("Do not call this for Direct, it does not make sense");
	}
	constructor(json: dirrectjson[], owner: Localuser){
		super(-1, owner, null);
		this.message_notifications = 0;
		this.owner = owner;
		this.headers = this.localuser.headers;
		this.channels = [];
		this.channelids = {};
		// @ts-ignore
		this.properties = {};
		this.roles = [];
		this.roleids = new Map();
		this.prevchannel = undefined;
		this.properties.name = I18n.getTranslation("DMs.name");
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
	getHTML(){
		const ddiv=document.createElement("div");
		const build=super.getHTML();
		const freindDiv=document.createElement("div");
		freindDiv.classList.add("liststyle","flexltr","friendsbutton");

		const icon=document.createElement("span");
		icon.classList.add("svgicon","svg-friends","space");
		freindDiv.append(icon);

		freindDiv.append(I18n.getTranslation("friends.friends"));
		ddiv.append(freindDiv);
		freindDiv.onclick=()=>{
			this.loadChannel(null);
		}

		ddiv.append(build);
		return ddiv;
	}
	noChannel(addstate:boolean){
		if(addstate){
			history.pushState([this.id,undefined], "", "/channels/" + this.id);
		}
		this.localuser.pageTitle(I18n.getTranslation("friends.friendlist"));
		const channelTopic = document.getElementById("channelTopic") as HTMLSpanElement;
		channelTopic.removeAttribute("hidden");
		channelTopic.textContent="";

		const loading = document.getElementById("loadingdiv") as HTMLDivElement;
		loading.classList.remove("loading");
		this.localuser.getSidePannel();

		const messages = document.getElementById("channelw") as HTMLDivElement;
		for(const thing of Array.from(messages.getElementsByClassName("messagecontainer"))){
			thing.remove();
		}
		const container=document.createElement("div");
		container.classList.add("messagecontainer","flexttb","friendcontainer")

		messages.append(container);
		const checkVoid=()=>{
			if(this.localuser.channelfocus!==undefined||this.localuser.lookingguild!==this){
				this.localuser.relationshipsUpdate=()=>{};
			}
		}
		function genuserstrip(user:User,icons:HTMLElement):HTMLElement{
			const div=document.createElement("div");
			div.classList.add("flexltr","liststyle");
			user.bind(div);
			div.append(user.buildpfp());

			const userinfos=document.createElement("div");
			userinfos.classList.add("flexttb");
			const username=document.createElement("span");
			username.textContent=user.name;
			userinfos.append(username,user.getStatus());
			div.append(userinfos);
			User.contextmenu.bindContextmenu(div,user,undefined);
			userinfos.style.flexGrow="1";

			div.append(icons);
			return div;
		}
		{
			//TODO update on users coming online
			const online=document.createElement("button");
			online.textContent=I18n.getTranslation("friends.online");
			channelTopic.append(online);
			const genOnline=()=>{
				this.localuser.relationshipsUpdate=genOnline;
				checkVoid();
				container.innerHTML="";
				container.append(I18n.getTranslation("friends.online:"));
				for(const user of this.localuser.inrelation){
					if(user.relationshipType===1&&user.online){
						const buttonc=document.createElement("div");
						const button1=document.createElement("span");
						button1.classList.add("svg-frmessage","svgicon");
						buttonc.append(button1);
						buttonc.classList.add("friendlyButton");
						buttonc.onclick=(e)=>{
							e.stopImmediatePropagation();
							user.opendm();
						}
						container.append(genuserstrip(user,buttonc));
					}
				}
			}
			online.onclick=genOnline;
			genOnline();
		}
		{
			const all=document.createElement("button");
			all.textContent=I18n.getTranslation("friends.all");
			const genAll=()=>{
				this.localuser.relationshipsUpdate=genAll;
				checkVoid();
				container.innerHTML="";
				container.append(I18n.getTranslation("friends.all:"));
				for(const user of this.localuser.inrelation){
					if(user.relationshipType===1){
						const buttonc=document.createElement("div");
						const button1=document.createElement("span");
						button1.classList.add("svg-frmessage","svgicon");
						buttonc.append(button1);
						buttonc.classList.add("friendlyButton");
						buttonc.onclick=(e)=>{
							e.stopImmediatePropagation();
							user.opendm();
						}
						container.append(genuserstrip(user,buttonc));
					}
				}
			}
			all.onclick=genAll;
			channelTopic.append(all);
		}
		{
			const pending=document.createElement("button");
			pending.textContent=I18n.getTranslation("friends.pending");
			const genPending=()=>{
				this.localuser.relationshipsUpdate=genPending;
				checkVoid();
				container.innerHTML="";
				container.append(I18n.getTranslation("friends.pending:"));
				for(const user of this.localuser.inrelation){
					if(user.relationshipType===3||user.relationshipType===4){
						const buttons=document.createElement("div");
						buttons.classList.add("flexltr");
						const buttonc=document.createElement("div");
						const button1=document.createElement("span");
						button1.classList.add("svgicon","svg-x");
						if(user.relationshipType===3){
							const buttonc=document.createElement("div");
							const button2=document.createElement("span");
							button2.classList.add("svgicon","svg-x");
							button2.classList.add("svg-addfriend");
							buttonc.append(button2);
							buttonc.classList.add("friendlyButton");
							buttonc.append(button2);
							buttons.append(buttonc);
							buttonc.onclick=(e)=>{
								e.stopImmediatePropagation();
								user.changeRelationship(1);
								outerDiv.remove();
							}
						}
						buttonc.append(button1);
						buttonc.classList.add("friendlyButton");
						buttonc.onclick=(e)=>{
							e.stopImmediatePropagation();
							user.changeRelationship(0);
							outerDiv.remove();
						}
						buttons.append(buttonc);
						const outerDiv=genuserstrip(user,buttons);
						container.append(outerDiv);
					}
				}
			}
			pending.onclick=genPending;
			channelTopic.append(pending);
		}
		{
			const blocked=document.createElement("button");
			blocked.textContent=I18n.getTranslation("friends.blocked");

			const genBlocked=()=>{
				this.localuser.relationshipsUpdate=genBlocked;
				checkVoid();
				container.innerHTML="";
				container.append(I18n.getTranslation("friends.blockedusers"));
				for(const user of this.localuser.inrelation){
					if(user.relationshipType===2){
						const buttonc=document.createElement("div");
						const button1=document.createElement("span");
						button1.classList.add("svg-x","svgicon");
						buttonc.append(button1);
						buttonc.classList.add("friendlyButton");
						buttonc.onclick=(e)=>{
							user.changeRelationship(0);
							e.stopImmediatePropagation();
							outerDiv.remove();
						}
						const outerDiv=genuserstrip(user,buttonc);
						container.append(outerDiv);
					}
				}
			}
			blocked.onclick=genBlocked;
			channelTopic.append(blocked);
		}
		{
			const add=document.createElement("button");
			add.textContent=I18n.getTranslation("friends.addfriend");
			add.onclick=()=>{
				this.localuser.relationshipsUpdate=()=>{};
				container.innerHTML="";
				const float=new Float("");
				const options=float.options;
				const form=options.addForm("",(e:any)=>{
					console.log(e);
					if(e.code===404){
						throw new FormError(text,I18n.getTranslation("friends.notfound"));
					}else if(e.code===400){
						throw new FormError(text,e.message.split("Error: ")[1]);
					}else{
						const box=text.input.deref();
						if(!box)return;
						box.value="";
					}
				},{
					method:"POST",
					fetchURL:this.info.api+"/users/@me/relationships",
					headers:this.headers
				});
				const text=form.addTextInput(I18n.getTranslation("friends.addfriendpromt"),"username");
				form.addPreprocessor((obj:any)=>{
					const [username,discriminator]=obj.username.split("#");
					obj.username=username;
					obj.discriminator=discriminator;
					if(!discriminator){
						throw new FormError(text,I18n.getTranslation("friends.discnotfound"));
					}
				});
				container.append(float.generateHTML());
			}
			channelTopic.append(add);
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
	async getHTML(addstate=true){
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
		if(addstate){
			history.pushState([this.guild_id,this.id], "", "/channels/" + this.guild_id + "/" + this.id);
		}
		this.localuser.pageTitle("@" + this.name);
		(document.getElementById("channelTopic") as HTMLElement).setAttribute("hidden","");

		const loading = document.getElementById("loadingdiv") as HTMLDivElement;
		Channel.regenLoadingMessages();

		loading.classList.add("loading");
		this.rendertyping();
		(document.getElementById("typebox") as HTMLDivElement).contentEditable ="" + true;
		(document.getElementById("upload") as HTMLElement).style.visibility="visible";
		(document.getElementById("typediv") as HTMLElement).style.visibility="visible";
		(document.getElementById("typebox") as HTMLDivElement).focus();
		await this.putmessages();
		await prom;
		this.localuser.getSidePannel();
		if(id !== Channel.genid){
			return;
		}
		this.buildmessages();

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
