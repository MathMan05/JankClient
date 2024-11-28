"use strict";
import{ Message }from"./message.js";
import{ AVoice }from"./audio.js";
import{ Contextmenu }from"./contextmenu.js";
import{ Guild }from"./guild.js";
import{ Localuser }from"./localuser.js";
import{ Permissions }from"./permissions.js";
import{ Dialog, Settings }from"./settings.js";
import{ Role, RoleList }from"./role.js";
import{ InfiniteScroller }from"./infiniteScroller.js";
import{ SnowFlake }from"./snowflake.js";
import{channeljson,embedjson,messageCreateJson,messagejson,readyjson,startTypingjson}from"./jsontypes.js";
import{ MarkDown }from"./markdown.js";
import{ Member }from"./member.js";
import { Voice } from "./voice.js";
import { User } from "./user.js";
import { I18n } from "./i18n.js";

declare global {
interface NotificationOptions {
image?: string | null | undefined;
}
}
class Channel extends SnowFlake{
	editing!: Message | null;
	type!: number;
	owner!: Guild;
	headers!: Localuser["headers"];
	name!: string;
	parent_id?: string;
	parent: Channel | undefined;
	children!: Channel[];
	guild_id!: string;
	permission_overwrites!: Map<string, Permissions>;
	permission_overwritesar!: [Role, Permissions][];
	topic!: string;
	nsfw!: boolean;
	position: number = 0;
	lastreadmessageid: string | undefined;
	lastmessageid: string | undefined;
	mentions!: number;
	lastpin!: string;
	move_id?: string;
	typing!: number;
	message_notifications:number=3;
	allthewayup!: boolean;
	static contextmenu = new Contextmenu<Channel, undefined>("channel menu");
	replyingto!: Message | null;
	infinite!: InfiniteScroller;
	idToPrev: Map<string, string> = new Map();
	idToNext: Map<string, string> = new Map();
	messages: Map<string, Message> = new Map();
	voice?:Voice;
	bitrate:number=128000;

	muted:boolean=false;
	mute_config= {selected_time_window: -1,end_time: 0}
	handleUserOverrides(settings:{message_notifications: number,muted: boolean,mute_config: {selected_time_window: number,end_time: number},channel_id: string}){
		this.message_notifications=settings.message_notifications;
		this.muted=settings.muted;
		this.mute_config=settings.mute_config;
	}
	static setupcontextmenu(){
		this.contextmenu.addbutton(()=>I18n.getTranslation("channel.copyId"), function(this: Channel){
			navigator.clipboard.writeText(this.id);
		});

		this.contextmenu.addbutton(()=>I18n.getTranslation("channel.markRead"), function(this: Channel){
			this.readbottom();
		});

		this.contextmenu.addbutton(()=>I18n.getTranslation("channel.settings"), function(this: Channel){
			this.generateSettings();
		},null,function(){
			return this.hasPermission("MANAGE_CHANNELS");
		});

		this.contextmenu.addbutton(
			()=>I18n.getTranslation("channel.delete"),
			function(this: Channel){
				this.deleteChannel();
			},
			null,
			function(){
				return this.isAdmin();
			}
		);
		this.contextmenu.addbutton(
			()=>I18n.getTranslation("guild.notifications"),
			function(){
				this.setnotifcation();
			}
		)

		this.contextmenu.addbutton(
			()=>I18n.getTranslation("channel.makeInvite"),
			function(this: Channel){
				this.createInvite();
			},
			null,
			function(){
				return this.hasPermission("CREATE_INSTANT_INVITE") && this.type !== 4;
			}
		);
	}
	createInvite(){
		const div = document.createElement("div");
		div.classList.add("invitediv");
		const text = document.createElement("span");
		text.classList.add("ellipsis");
		div.append(text);
		let uses = 0;
		let expires = 1800;
		const copycontainer = document.createElement("div");
		copycontainer.classList.add("copycontainer");
		const copy = document.createElement("span");
		copy.classList.add("copybutton", "svgicon", "svg-copy");
		copycontainer.append(copy);
		copycontainer.onclick = _=>{
			if(text.textContent){
				navigator.clipboard.writeText(text.textContent);
			}
		};
		div.append(copycontainer);
		const update = ()=>{
			fetch(`${this.info.api}/channels/${this.id}/invites`, {
				method: "POST",
				headers: this.headers,
				body: JSON.stringify({
					flags: 0,
					target_type: null,
					target_user_id: null,
					max_age: expires + "",
					max_uses: uses,
					temporary: uses !== 0,
				}),
			})
				.then(_=>_.json())
				.then(json=>{
					const params = new URLSearchParams("");
					params.set("instance", this.info.wellknown);
					const encoded = params.toString();
					text.textContent = `${location.origin}/invite/${json.code}?${encoded}`;
				});
		};
		update();
		const inviteOptions=new Dialog("",{noSubmit:true});
		inviteOptions.options.addTitle(I18n.getTranslation("inviteOptions.title"));
		inviteOptions.options.addText(I18n.getTranslation("invite.subtext",this.name,this.guild.properties.name));

		inviteOptions.options.addSelect(I18n.getTranslation("invite.expireAfter"),()=>{},
			["30m","1h","6h","12h","1d","7d","30d","never"].map((e)=>I18n.getTranslation("inviteOptions."+e))
		).onchange=(e)=>{expires=[1800, 3600, 21600, 43200, 86400, 604800, 2592000, 0][e];update()};

		const timeOptions=["1","5","10","25","50","100"].map((e)=>I18n.getTranslation("inviteOptions.limit",e))
		timeOptions.unshift(I18n.getTranslation("inviteOptions.noLimit"))
		inviteOptions.options.addSelect(I18n.getTranslation("invite.expireAfter"),()=>{},timeOptions)
		.onchange=(e)=>{uses=[0, 1, 5, 10, 25, 50, 100][e];update()};

		inviteOptions.options.addHTMLArea(div);
		inviteOptions.show();
	}
	generateSettings(){
		this.sortPerms();
		const settings = new Settings(I18n.getTranslation("channel.settingsFor",this.name));
		{
			const gensettings=settings.addButton("Settings");
			const form=gensettings.addForm("",()=>{},{
				fetchURL:this.info.api + "/channels/" + this.id,
				method: "PATCH",
				headers: this.headers,
			});
			form.addTextInput(I18n.getTranslation("channel.name:"),"name",{initText:this.name});
			form.addMDInput(I18n.getTranslation("channel.topic:"),"topic",{initText:this.topic});
			form.addCheckboxInput(I18n.getTranslation("channel.nsfw:"),"nsfw",{initState:this.nsfw});
			if(this.type!==4){
				const options=["voice", "text", "announcement"];
				form.addSelect("Type:","type",options.map(e=>I18n.getTranslation("channel."+e)),{
					defaultIndex:options.indexOf({0:"text", 2:"voice", 5:"announcement", 4:"category" }[this.type] as string)
				},options);
				form.addPreprocessor((obj:any)=>{
					obj.type={text: 0, voice: 2, announcement: 5, category: 4 }[obj.type as string]
				})
			}

		}
		const s1 = settings.addButton("Permissions");
		s1.options.push(
			new RoleList(
				this.permission_overwritesar,
				this.guild,
				this.updateRolePermissions.bind(this),
				this
			)
		);
		settings.show();
	}
	sortPerms(){
		this.permission_overwritesar.sort((a, b)=>{
			return(
				this.guild.roles.indexOf(a[0]) -
					this.guild.roles.indexOf(b[0])
			);
		});
	}
	setUpInfiniteScroller(){
		this.infinite = new InfiniteScroller(
			async (id: string, offset: number): Promise<string | undefined>=>{
				if(offset === 1){
					if(this.idToPrev.has(id)){
						return this.idToPrev.get(id);
					}else{
						await this.grabBefore(id);
						return this.idToPrev.get(id);
					}
				}else{
					if(this.idToNext.has(id)){
						return this.idToNext.get(id);
					}else if(this.lastmessage?.id !== id){
						await this.grabAfter(id);
						return this.idToNext.get(id);
					}else{

					}
				}
				return undefined;
			},
			async (id: string): Promise<HTMLElement>=>{
				//await new Promise(_=>{setTimeout(_,Math.random()*10)})
				const messgage = this.messages.get(id);
				try{
					if(messgage){
						return messgage.buildhtml();
					}else{
						console.error(id + " not found");
					}
				}catch(e){
					console.error(e);
				}
				return document.createElement("div");
			},
			async (id: string)=>{
				const message = this.messages.get(id);
				try{
					if(message){
						message.deleteDiv();
						return true;
					}
				}catch(e){
					console.error(e);
				}finally{
				}
				return false;
			},
			this.readbottom.bind(this)
		);
	}
	constructor(
		json: channeljson | -1,
		owner: Guild,
		id: string = json === -1 ? "" : json.id
	){
		super(id);
		if(json === -1){
			return;
		}
		this.editing;
		this.type = json.type;
		this.owner = owner;
		this.headers = this.owner.headers;
		this.name = json.name;
		if(json.parent_id){
			this.parent_id = json.parent_id;
		}
		this.parent = undefined;
		this.children = [];
		this.guild_id = json.guild_id;
		this.permission_overwrites = new Map();
		this.permission_overwritesar = [];
		for(const thing of json.permission_overwrites){
			if(thing.id === "1182819038095799904" ||thing.id === "1182820803700625444"){
				continue;
			}
			if(!this.permission_overwrites.has(thing.id)){
				//either a bug in the server requires this, or the API is cursed
				this.permission_overwrites.set(
					thing.id,
					new Permissions(thing.allow, thing.deny)
				);
				const permission = this.permission_overwrites.get(thing.id);
				if(permission){
					const role = this.guild.roleids.get(thing.id);
					if(role){
						this.permission_overwritesar.push([role, permission]);
					}
				}
			}
		}

		this.topic = json.topic;
		this.nsfw = json.nsfw;
		this.position = json.position;
		this.lastreadmessageid = undefined;
		if(json.last_message_id){
			this.lastmessageid = json.last_message_id;
		}else{
			this.lastmessageid = undefined;
		}
		this.setUpInfiniteScroller();
		this.perminfo ??= {};
		if(this.type===2&&this.localuser.voiceFactory){
			this.voice=this.localuser.voiceFactory.makeVoice(this.guild.id,this.id,{bitrate:this.bitrate});
			this.setUpVoice();
		}
	}
	get perminfo(){
		return this.guild.perminfo.channels[this.id];
	}
	set perminfo(e){
		this.guild.perminfo.channels[this.id] = e;
	}
	isAdmin(){
		return this.guild.isAdmin();
	}
	get guild(){
		return this.owner;
	}
	get localuser(){
		return this.guild.localuser;
	}
	get info(){
		return this.owner.info;
	}
	readStateInfo(json: readyjson["d"]["read_state"]["entries"][0]){
		this.lastreadmessageid = json.last_message_id;
		this.mentions = json.mention_count;
		this.mentions ??= 0;
		this.lastpin = json.last_pin_timestamp;
	}
	get hasunreads(): boolean{
		if(!this.hasPermission("VIEW_CHANNEL")){
			return false;
		}
		return(
			Boolean(this.lastmessageid) &&
			(!this.lastreadmessageid ||
			SnowFlake.stringToUnixTime(this.lastmessageid as string) >
			SnowFlake.stringToUnixTime(this.lastreadmessageid)) &&
			this.type !== 4
		);
	}
	hasPermission(name: string, member = this.guild.member): boolean{
		if(member.isAdmin()){
			return true;
		}
		const roles=new Set(member.roles);
		const everyone=this.guild.roles[this.guild.roles.length-1];
		if(!member.user.bot||true){
			roles.add(everyone)
		}
		for(const thing of roles){
			const premission = this.permission_overwrites.get(thing.id);
			if(premission){
				const perm = premission.getPermission(name);
				if(perm){
					return perm === 1;
				}
			}
			if(thing.permissions.getPermission(name)){
				return true;
			}
		}
		return false;
	}
	get canMessage(): boolean{
		if(this.permission_overwritesar.length === 0 &&this.hasPermission("MANAGE_CHANNELS")){
			const role = this.guild.roles.find(_=>_.name === "@everyone");
			if(role){
				this.addRoleToPerms(role);
			}
		}
		return this.hasPermission("SEND_MESSAGES");
	}
	sortchildren(){
		this.children.sort((a, b)=>{
			return a.position - b.position;
		});
	}
	resolveparent(_guild: Guild){
		const parentid = this.parent_id;
		if(!parentid)return false;
		this.parent = this.localuser.channelids.get(parentid);
		this.parent ??= undefined;
		if(this.parent !== undefined){
			this.parent.children.push(this);
		}
		return this.parent !== undefined;
	}
	calculateReorder(){
		let position = -1;
		const build: {
			id: string;
			position: number | undefined;
			parent_id: string | undefined;
		}[] = [];
		for(const thing of this.children){
			const thisthing: {
				id: string;
				position: number | undefined;
				parent_id: string | undefined;
			} = { id: thing.id, position: undefined, parent_id: undefined };

			if(thing.position < position){
				thing.position = thisthing.position = position + 1;
			}
			position = thing.position;
			if(thing.move_id && thing.move_id !== thing.parent_id){
				thing.parent_id = thing.move_id;
				thisthing.parent_id = thing.parent?.id;
				thing.move_id = undefined;
				//console.log(this.guild.channelids[thisthing.parent_id.id]);
			}
			if(thisthing.position || thisthing.parent_id){
				build.push(thisthing);
			}
		}
		return build;
	}
	static dragged: [Channel, HTMLDivElement] | [] = [];
	html: WeakRef<HTMLElement> | undefined;
	get visable(){
		return this.hasPermission("VIEW_CHANNEL");
	}
	voiceUsers=new WeakRef(document.createElement("div"));
	createguildHTML(admin = false): HTMLDivElement{
		const div = document.createElement("div");
		this.html = new WeakRef(div);
		if(!this.visable){
			let quit = true;
			for(const thing of this.children){
				if(thing.visable){
					quit = false;
				}
			}
			if(quit){
				return div;
			}
		}
		// @ts-ignore I dont wanna deal with this
		div.all = this;
		div.draggable = admin;
		div.addEventListener("dragstart", e=>{
			Channel.dragged = [this, div];
			e.stopImmediatePropagation();
		});
		div.addEventListener("dragend", ()=>{
			Channel.dragged = [];
		});
		if(this.type === 4){
			this.sortchildren();
			const caps = document.createElement("div");

			const decdiv = document.createElement("div");
			const decoration = document.createElement("span");
			decoration.classList.add("svgicon", "collapse-icon", "svg-category");
			decdiv.appendChild(decoration);

			const myhtml = document.createElement("p2");
			myhtml.classList.add("ellipsis");
			myhtml.textContent = this.name;
			decdiv.appendChild(myhtml);
			caps.appendChild(decdiv);
			const childrendiv = document.createElement("div");
			if(admin){
				const addchannel = document.createElement("span");
				addchannel.classList.add("addchannel","svgicon","svg-plus");
				caps.appendChild(addchannel);
				addchannel.onclick = _=>{
					this.guild.createchannels(this.createChannel.bind(this));
				};
				this.coatDropDiv(decdiv, childrendiv);
			}
			div.appendChild(caps);
			caps.classList.add("flexltr","capsflex");
			decdiv.classList.add("flexltr","channeleffects");
			decdiv.classList.add("channel");

			Channel.contextmenu.bindContextmenu(decdiv, this,undefined);
			// @ts-ignore I dont wanna deal with this
			decdiv.all = this;

			for(const channel of this.children){
				childrendiv.appendChild(channel.createguildHTML(admin));
			}
			childrendiv.classList.add("channels");
			setTimeout((_: any)=>{
				if(!this.perminfo.collapsed){
					childrendiv.style.height = childrendiv.scrollHeight + "px";
				}
			}, 100);
			div.appendChild(childrendiv);
			if(this.perminfo.collapsed){
				decoration.classList.add("hiddencat");
				childrendiv.style.height = "0px";
			}
			decdiv.onclick = ()=>{
				if(childrendiv.style.height !== "0px"){
					decoration.classList.add("hiddencat");
					this.perminfo.collapsed = true;
					this.localuser.userinfo.updateLocal();
					childrendiv.style.height = "0px";
				}else{
					decoration.classList.remove("hiddencat");
					this.perminfo.collapsed = false;
					this.localuser.userinfo.updateLocal();
					childrendiv.style.height = childrendiv.scrollHeight + "px";
				}
			};
		}else{
			div.classList.add("channel");
			if(this.hasunreads){
				div.classList.add("cunread");
			}
			Channel.contextmenu.bindContextmenu(div, this,undefined);
			if(admin){
				this.coatDropDiv(div);
			}
			// @ts-ignore I dont wanna deal with this
			div.all = this;
			const button = document.createElement("button");
			button.classList.add("channelbutton");
			div.append(button);
			const myhtml = document.createElement("span");
			myhtml.classList.add("ellipsis");
			myhtml.textContent = this.name;
			if(this.type === 0){
				const decoration = document.createElement("span");
				button.appendChild(decoration);
				decoration.classList.add("space", "svgicon", "svg-channel");
			}else if(this.type === 2){
				//
				const decoration = document.createElement("span");
				button.appendChild(decoration);
				decoration.classList.add("space", "svgicon", "svg-voice");
			}else if(this.type === 5){
				//
				const decoration = document.createElement("span");
				button.appendChild(decoration);
				decoration.classList.add("space", "svgicon", "svg-announce");
			}else{
				console.log(this.type);
			}
			button.appendChild(myhtml);
			button.onclick = _=>{
				this.getHTML();
				const toggle = document.getElementById("maintoggle") as HTMLInputElement;
				toggle.checked = true;
			};
			if(this.type===2){
				const voiceUsers=document.createElement("div");
				div.append(voiceUsers);
				this.voiceUsers=new WeakRef(voiceUsers);
				this.updateVoiceUsers();
			}
		}
		return div;
	}
	async moveForDrag(x:number){
		const mainarea=document.getElementById("mainarea");
		if(!mainarea) return;
		if(x===-1){
			mainarea.style.removeProperty("left");
			mainarea.style.removeProperty("transition");
			return;
		}
		mainarea.style.left=x+"px";
		mainarea.style.transition="left 0s"
	}
	async setUpVoice(){
		if(!this.voice) return;
		this.voice.onMemberChange=async (memb,joined)=>{
			console.log(memb,joined);
			if(typeof memb!=="string"){
				await Member.new(memb,this.guild);
			}
			this.updateVoiceUsers();
			if(this.voice===this.localuser.currentVoice){
				AVoice.noises("join");
			}
		}
	}
	async updateVoiceUsers(){
		const voiceUsers=this.voiceUsers.deref();
		if(!voiceUsers||!this.voice) return;
		console.warn(this.voice.userids)

		const html=(await Promise.all(this.voice.userids.entries().toArray().map(async _=>{
			const user=await User.resolve(_[0],this.localuser);
			console.log(user);
			const member=await Member.resolveMember(user,this.guild);
			const array=[member,_[1]] as [Member, typeof _[1]];
			return array;
		}))).flatMap(([member,_obj])=>{
			if(!member){
				console.warn("This is weird, member doesn't exist :P");
				return [];
			}
			const div=document.createElement("div");
			div.classList.add("voiceuser");
			const span=document.createElement("span");
			span.textContent=member.name;
			div.append(span);
			return div;
		});

		voiceUsers.innerHTML="";
		voiceUsers.append(...html);
	}
	get myhtml(){
		if(this.html){
			return this.html.deref();
		}else{
			return;
		}
	}
	readbottom(){
		if(!this.hasunreads){
			return;
		}
		fetch(
			this.info.api +"/channels/" + this.id + "/messages/" + this.lastmessageid + "/ack",
			{
				method: "POST",
				headers: this.headers,
				body: JSON.stringify({}),
			}
		);
		this.lastreadmessageid = this.lastmessageid;
		this.guild.unreads();
		if(this.myhtml){
			this.myhtml.classList.remove("cunread");
		}
	}
	coatDropDiv(div: HTMLDivElement, container: HTMLElement | boolean = false){
		div.addEventListener("dragenter", event=>{
			console.log("enter");
			event.preventDefault();
		});

		div.addEventListener("dragover", event=>{
			event.preventDefault();
		});

		div.addEventListener("drop", event=>{
			const that = Channel.dragged[0];
			if(!that)return;
			event.preventDefault();
			if(container){
				that.move_id = this.id;
				if(that.parent){
					that.parent.children.splice(that.parent.children.indexOf(that), 1);
				}
				that.parent = this;
				(container as HTMLElement).prepend(
								Channel.dragged[1] as HTMLDivElement
				);
				this.children.unshift(that);
			}else{
				console.log(this, Channel.dragged);
				that.move_id = this.parent_id;
				if(that.parent){
					that.parent.children.splice(that.parent.children.indexOf(that), 1);
				}else{
					this.guild.headchannels.splice(
						this.guild.headchannels.indexOf(that),
						1
					);
				}
				that.parent = this.parent;
				if(that.parent){
					const build: Channel[] = [];
					for(let i = 0; i < that.parent.children.length; i++){
						build.push(that.parent.children[i]);
						if(that.parent.children[i] === this){
							build.push(that);
						}
					}
					that.parent.children = build;
				}else{
					const build: Channel[] = [];
					for(let i = 0; i < this.guild.headchannels.length; i++){
						build.push(this.guild.headchannels[i]);
						if(this.guild.headchannels[i] === this){
							build.push(that);
						}
					}
					this.guild.headchannels = build;
				}
				if(Channel.dragged[1]){
					div.after(Channel.dragged[1]);
				}
			}
			this.guild.calculateReorder();
		});

		return div;
	}
	createChannel(name: string, type: number){
		fetch(this.info.api + "/guilds/" + this.guild.id + "/channels", {
			method: "POST",
			headers: this.headers,
			body: JSON.stringify({
				name,
				type,
				parent_id: this.id,
				permission_overwrites: [],
			}),
		});
	}
	deleteChannel(){
		fetch(this.info.api + "/channels/" + this.id, {
			method: "DELETE",
			headers: this.headers,
		});
	}
	setReplying(message: Message){
		if(this.replyingto?.div){
			this.replyingto.div.classList.remove("replying");
		}
		this.replyingto = message;
		const typebox = document.getElementById("typebox") as HTMLElement;
		typebox.focus();
		if(!this.replyingto?.div)return;
		console.log(message);
		this.replyingto.div.classList.add("replying");
		this.makereplybox();
	}
	makereplybox(){
		const replybox = document.getElementById("replybox") as HTMLElement;
		const typebox = document.getElementById("typebox") as HTMLElement;
		if(this.replyingto){
			replybox.innerHTML = "";
			const span = document.createElement("span");
			span.textContent = I18n.getTranslation("replyingTo", this.replyingto.author.username);
			const X = document.createElement("button");
			X.onclick = _=>{
				if(this.replyingto?.div){
					this.replyingto.div.classList.remove("replying");
				}
				replybox.classList.add("hideReplyBox");
				this.replyingto = null;
				replybox.innerHTML = "";
				typebox.classList.remove("typeboxreplying");
			};
			replybox.classList.remove("hideReplyBox");
			X.classList.add("cancelReply","svgicon","svg-x");
			replybox.append(span);
			replybox.append(X);
			typebox.classList.add("typeboxreplying");
		}else{
			replybox.classList.add("hideReplyBox");
			typebox.classList.remove("typeboxreplying");
		}
	}
	async getmessage(id: string): Promise<Message>{
		const message = this.messages.get(id);
		if(message){
			return message;
		}else{
			const gety = await fetch(
				this.info.api + "/channels/" +this.id +"/messages?limit=1&around=" +id,
				{ headers: this.headers }
			);
			const json = await gety.json();
			return new Message(json[0], this);
		}
	}
	editLast(){
		let message:Message|undefined=this.lastmessage;
		while(message&&message.author!==this.localuser.user){
			message=this.messages.get(this.idToPrev.get(message.id) as string);
		}
		if(message){
			message.setEdit();
		}
	}
	static genid: number = 0;
	async getHTML(addstate=true){
		const id = ++Channel.genid;
		if(this.localuser.channelfocus){
			this.localuser.channelfocus.infinite.delete();
		}
		if(this.guild !== this.localuser.lookingguild){
			this.guild.loadGuild();
		}
		if(this.localuser.channelfocus && this.localuser.channelfocus.myhtml){
			this.localuser.channelfocus.myhtml.classList.remove("viewChannel");
		}
		if(this.myhtml){
			this.myhtml.classList.add("viewChannel");
		}
		this.guild.prevchannel = this;
		this.guild.perminfo.prevchannel = this.id;
		this.localuser.userinfo.updateLocal();
		this.localuser.channelfocus = this;
		const prom = this.infinite.delete();
		if(addstate){
			history.pushState([this.guild_id,this.id], "", "/channels/" + this.guild_id + "/" + this.id);
		}
		this.localuser.pageTitle("#" + this.name);
		const channelTopic = document.getElementById("channelTopic") as HTMLSpanElement;
		if(this.topic){
			channelTopic.innerHTML ="";
			channelTopic.append(new MarkDown(
				this.topic,
				this
			).makeHTML());
			channelTopic.removeAttribute("hidden");
		}else channelTopic.setAttribute("hidden", "");

		const loading = document.getElementById("loadingdiv") as HTMLDivElement;
		Channel.regenLoadingMessages();
		loading.classList.add("loading");
		this.rendertyping();
		this.localuser.getSidePannel();
		if(this.voice&&localStorage.getItem("Voice enabled")){
			this.localuser.joinVoice(this);
		}
		(document.getElementById("typebox") as HTMLDivElement).contentEditable =""+this.canMessage;
		(document.getElementById("upload") as HTMLElement).style.visibility=this.canMessage?"visible":"hidden";
		(document.getElementById("typediv") as HTMLElement).style.visibility="visible";
		(document.getElementById("typebox") as HTMLDivElement).focus();
		await this.putmessages();
		await prom;
		if(id !== Channel.genid){
			return;
		}
		this.makereplybox();

		await this.buildmessages();
		//loading.classList.remove("loading");

	}
	typingmap: Map<Member, number> = new Map();
	async typingStart(typing: startTypingjson): Promise<void>{
		const memb = await Member.new(typing.d.member!, this.guild);
		if(!memb)return;
		if(memb.id === this.localuser.user.id){
			console.log("you is typing");
			return;
		}
		console.log("user is typing and you should see it");
		this.typingmap.set(memb, Date.now());
		setTimeout(this.rendertyping.bind(this), 10000);
		this.rendertyping();
	}
	similar(str:string){
		if(this.type===4) return -1;
		const strl=Math.max(str.length,1)
		if(this.name.includes(str)){
			return strl/this.name.length;
		}else if(this.name.toLowerCase().includes(str.toLowerCase())){
			return strl/this.name.length/1.2;
		}
		return 0;
	}
	rendertyping(): void{
		const typingtext = document.getElementById("typing") as HTMLDivElement;
		let build = "";
		let showing = false;
		let i = 0;
		const curtime = Date.now() - 5000;
		for(const thing of this.typingmap.keys()){
			if((this.typingmap.get(thing) as number) > curtime){
				if(i !== 0){
					build += ", ";
				}
				i++;
				if(thing.nick){
					build += thing.nick;
				}else{
					build += thing.user.username;
				}
				showing = true;
			}else{
				this.typingmap.delete(thing);
			}
		}
		build=I18n.getTranslation("typing",i+"",build);
		if(this.localuser.channelfocus === this){
			if(showing){
				typingtext.classList.remove("hidden");
				const typingtext2 = document.getElementById(
					"typingtext"
				) as HTMLDivElement;
				typingtext2.textContent = build;
			}else{
				typingtext.classList.add("hidden");
			}
		}
	}
	static regenLoadingMessages(){
		const loading = document.getElementById("loadingdiv") as HTMLDivElement;
		loading.innerHTML = "";
		for(let i = 0; i < 15; i++){
			const div = document.createElement("div");
			div.classList.add("loadingmessage");
			if(Math.random() < 0.5){
				const pfp = document.createElement("div");
				pfp.classList.add("loadingpfp");
				const username = document.createElement("div");
				username.style.width = Math.floor(Math.random() * 96 * 1.5 + 40) + "px";
				username.classList.add("loadingcontent");
				div.append(pfp, username);
			}
			const content = document.createElement("div");
			content.style.width = Math.floor(Math.random() * 96 * 3 + 40) + "px";
			content.style.height = Math.floor(Math.random() * 3 + 1) * 20 + "px";
			content.classList.add("loadingcontent");
			div.append(content);
			loading.append(div);
		}
	}
	lastmessage: Message | undefined;
	setnotifcation(){
		const defualt=I18n.getTranslation("guild."+["all", "onlyMentions", "none","default"][this.guild.message_notifications])
		const options=["all", "onlyMentions", "none","default"].map(e=>I18n.getTranslation("guild."+e,defualt));
		const notiselect=new Dialog("");
		const form=notiselect.options.addForm("",(_,sent:any)=>{
			notiselect.hide();
			console.log(sent);
			this.message_notifications = sent.channel_overrides[this.id].message_notifications;
		},{
			fetchURL:`${this.info.api}/users/@me/guilds/${this.guild.id}/settings/`,
			method:"PATCH",
			headers:this.headers
		});
		form.addSelect(I18n.getTranslation("guild.selectnoti"),"message_notifications",options,{
			radio:true,
			defaultIndex:this.message_notifications
		},[0,1,2,3]);

		form.addPreprocessor((e:any)=>{
			const message_notifications=e.message_notifications;
			delete e.message_notifications;
			e.channel_overrides={
				[this.id]:{
					message_notifications,
					muted:this.muted,
					mute_config:this.mute_config,
					channel_id:this.id
				}
			}
		})
		/*
		let noti = this.message_notifications;
		const defualt=I18n.getTranslation("guild."+["all", "onlyMentions", "none","default"][this.guild.message_notifications])
		const options=["all", "onlyMentions", "none","default"].map(e=>I18n.getTranslation("guild."+e,defualt))
		const notiselect = new Dialog([
			"vdiv",
			[
				"radio",
				I18n.getTranslation("guild.selectnoti"),
				options,
				function(e: string){
					noti = options.indexOf(e);
				},
				noti,
			],
			[
				"button",
				"",
				"submit",
				(_: any)=>{
					//
					fetch(this.info.api + `/users/@me/guilds/${this.guild.id}/settings/`, {
						method: "PATCH",
						headers: this.headers,
						body: JSON.stringify({
							channel_overrides:{
								[this.id]:{
									message_notifications: noti,
									muted:false,
									mute_config:{
										selected_time_window:0,
										end_time:0
									},
									channel_id:this.id
								}
							}
						}),
					}).then(()=>notiselect.hide());
					this.message_notifications = noti;
				},
			],
		]);
		*/
		notiselect.show();
	}
	async putmessages(){
		//TODO swap out with the WS op code
		if(this.allthewayup){
			return;
		}
		if(this.lastreadmessageid && this.messages.has(this.lastreadmessageid)){
			return;
		}
		const j = await fetch(
			this.info.api + "/channels/" + this.id + "/messages?limit=100",
			{
				headers: this.headers,
			}
		);

		const response = await j.json();
		if(response.length !== 100){
			this.allthewayup = true;
		}
		let prev: Message | undefined;
		for(const thing of response){
			const message = new Message(thing, this);
			if(prev){
				this.idToNext.set(message.id, prev.id);
				this.idToPrev.set(prev.id, message.id);
			}else{
				this.lastmessage = message;
				this.lastmessageid = message.id;
			}
			prev = message;
		}
	}
	delChannel(json: channeljson){
		const build: Channel[] = [];
		for(const thing of this.children){
			if(thing.id !== json.id){
				build.push(thing);
			}
		}
		this.children = build;
	}
	async grabAfter(id: string){
		if(id === this.lastmessage?.id){
			return;
		}
		await fetch(
			this.info.api + "/channels/" +this.id +"/messages?limit=100&after=" +id,{
				headers: this.headers,
			}
		)
			.then(j=>{
				return j.json();
			})
			.then(response=>{
				let previd: string = id;
				for(const i in response){
					let messager: Message;
					let willbreak = false;
					if(this.messages.has(response[i].id)){
						messager = this.messages.get(response[i].id) as Message;
						willbreak = true;
					}else{
						messager = new Message(response[i], this);
					}
					this.idToPrev.set(messager.id, previd);
					this.idToNext.set(previd, messager.id);
					previd = messager.id;
					if(willbreak){
						break;
					}
				}
				//out.buildmessages();
			});
	}
	topid!: string;
	async grabBefore(id: string){
		if(this.topid && id === this.topid){
			return;
		}

		await fetch(
			this.info.api + "/channels/" + this.id +"/messages?before=" + id + "&limit=100",
			{
				headers: this.headers,
			}
		)
			.then(j=>{
				return j.json();
			})
			.then((response: messagejson[])=>{
				if(response.length < 100){
					this.allthewayup = true;
					if(response.length === 0){
						this.topid = id;
					}
				}
				let previd = id;
				for(const i in response){
					let messager: Message;
					let willbreak = false;
					if(this.messages.has(response[i].id)){
						console.log("flaky");
						messager = this.messages.get(response[i].id) as Message;
						willbreak = true;
					}else{
						messager = new Message(response[i], this);
					}

					this.idToNext.set(messager.id, previd);
					this.idToPrev.set(previd, messager.id);
					previd = messager.id;

					if(Number(i) === response.length - 1 && response.length < 100){
						this.topid = previd;
					}
					if(willbreak){
						break;
					}
				}
			});
	}
	/**
		* Please dont use this, its not implemented.
		* @deprecated
		* @todo
	**/
	async grabArround(/* id: string */){
		//currently unused and no plans to use it yet
		throw new Error("please don't call this, no one has implemented it :P");
	}
	async buildmessages(){
		this.infinitefocus = false;
		this.tryfocusinfinate();
	}
	infinitefocus = false;
	async tryfocusinfinate(){
		if(this.infinitefocus)return;
		this.infinitefocus = true;
		const messages = document.getElementById("channelw") as HTMLDivElement;
		const messageContainers = Array.from(
			messages.getElementsByClassName("messagecontainer")
		);
		for(const thing of messageContainers){
			thing.remove();
		}
		const loading = document.getElementById("loadingdiv") as HTMLDivElement;
		const removetitle = document.getElementById("removetitle");
		//messages.innerHTML="";
		let id: string | undefined;
		if(this.lastreadmessageid && this.messages.has(this.lastreadmessageid)){
			id = this.lastreadmessageid;
		}else if(this.lastreadmessageid && (id = this.findClosest(this.lastreadmessageid))){

		}else if(this.lastmessageid && this.messages.has(this.lastmessageid)){
			id = this.goBackIds(this.lastmessageid, 50);
		}
		if(!id){
			if(!removetitle){
				const title = document.createElement("h2");
				title.id = "removetitle";
				title.textContent = I18n.getTranslation("noMessages");
				title.classList.add("titlespace","messagecontainer");
				messages.append(title);
			}
			this.infinitefocus = false;
			loading.classList.remove("loading");
			return;
		}else if(removetitle){
			removetitle.remove();
		}
		if(this.localuser.channelfocus !== this){
			return;
		}
		const elements = Array.from(messages.getElementsByClassName("scroller"));
		for(const elm of elements){
			elm.remove();
			console.warn("rouge element detected and removed");
		}
		messages.append(await this.infinite.getDiv(id));
		this.infinite.updatestuff();
		this.infinite.watchForChange().then(async _=>{
			//await new Promise(resolve => setTimeout(resolve, 0));
			this.infinite.focus(id, false); //if someone could figure out how to make this work correctly without this, that's be great :P
			loading.classList.remove("loading");
		});
		//this.infinite.focus(id.id,false);
	}
	private goBackIds(
		id: string,
		back: number,
		returnifnotexistant = true
	): string | undefined{
		while(back !== 0){
			const nextid = this.idToPrev.get(id);
			if(nextid){
				id = nextid;
				back--;
			}else{
				if(returnifnotexistant){
					break;
				}else{
					return undefined;
				}
			}
		}
		return id;
	}
	private findClosest(id: string | undefined){
		if(!this.lastmessageid || !id)return;
		let flake: string | undefined = this.lastmessageid;
		const time = SnowFlake.stringToUnixTime(id);
		let flaketime = SnowFlake.stringToUnixTime(flake);
		while(flake && time < flaketime){
			flake = this.idToPrev.get(flake);

			if(!flake){
				return;
			}
			flaketime = SnowFlake.stringToUnixTime(flake);
		}
		return flake;
	}
	updateChannel(json: channeljson){
		this.type = json.type;
		this.name = json.name;
		const parent = this.localuser.channelids.get(json.parent_id);
		if(parent){
			this.parent = parent;
			this.parent_id = parent.id;
		}else{
			this.parent = undefined;
			this.parent_id = undefined;
		}

		this.children = [];
		this.guild_id = json.guild_id;
		const oldover=this.permission_overwrites;
		this.permission_overwrites = new Map();
		this.permission_overwritesar=[];
		for(const thing of json.permission_overwrites){
			if(thing.id === "1182819038095799904" || thing.id === "1182820803700625444"){
				continue;
			}
			this.permission_overwrites.set(
				thing.id,
				new Permissions(thing.allow, thing.deny)
			);
			const permisions = this.permission_overwrites.get(thing.id);
			if(permisions){
				const role = this.guild.roleids.get(thing.id);
				if(role){
					this.permission_overwritesar.push([role, permisions]);
				}
			}
		}
		const nchange=[...new Set<string>().union(oldover).difference(this.permission_overwrites)];
		const pchange=[...new Set<string>().union(this.permission_overwrites).difference(oldover)];
		for(const thing of nchange){
			const role=this.guild.roleids.get(thing);
			if(role){
				this.croleUpdate(role,new Permissions("0"),false)
			}
		}
		for(const thing of pchange){
			const role=this.guild.roleids.get(thing);
			const perms=this.permission_overwrites.get(thing);
			if(role&&perms){
				this.croleUpdate(role,perms,true);
			}
		}
		console.log(pchange,nchange);
		this.topic = json.topic;
		this.nsfw = json.nsfw;
	}
	croleUpdate:(role:Role,perm:Permissions,added:boolean)=>unknown=()=>{};
	typingstart(){
		if(this.typing > Date.now()){
			return;
		}
		this.typing = Date.now() + 6000;
		fetch(this.info.api + "/channels/" + this.id + "/typing", {
			method: "POST",
			headers: this.headers,
		});
	}
	get notification(){
		let notinumber: number | null = this.message_notifications;
		if(Number(notinumber) === 3){
			notinumber = null;
		}
		notinumber ??= this.guild.message_notifications;
		console.warn("info:",notinumber);
		switch(Number(notinumber)){
			case 0:
				return"all";
			case 1:
				return"mentions";
			case 2:
				return"none";
			case 3:
			default:
				return"default";
		}
	}
	async sendMessage(
		content: string,
		{
			attachments = [],
			replyingto = null,
		}: { attachments: Blob[]; embeds: embedjson; replyingto: Message | null }
	){
		let replyjson: any;
		if(replyingto){
			replyjson = {
				guild_id: replyingto.guild.id,
				channel_id: replyingto.channel.id,
				message_id: replyingto.id,
			};
		}
		if(attachments.length === 0){
			const body = {
				content,
				nonce: Math.floor(Math.random() * 1000000000),
				message_reference: undefined,
			};
			if(replyjson){
				body.message_reference = replyjson;
			}
			return await fetch(this.info.api + "/channels/" + this.id + "/messages", {
				method: "POST",
				headers: this.headers,
				body: JSON.stringify(body),
			});
		}else{
			const formData = new FormData();
			const body = {
				content,
				nonce: Math.floor(Math.random() * 1000000000),
				message_reference: undefined,
			};
			if(replyjson){
				body.message_reference = replyjson;
			}
			formData.append("payload_json", JSON.stringify(body));
			for(const i in attachments){
				formData.append("files[" + i + "]", attachments[i]);
			}
			return await fetch(this.info.api + "/channels/" + this.id + "/messages", {
				method: "POST",
				body: formData,
				headers: { Authorization: this.headers.Authorization },
			});
		}
	}
	messageCreate(messagep: messageCreateJson): void{
		if(!this.hasPermission("VIEW_CHANNEL")){
			return;
		}
		const messagez = new Message(messagep.d, this);
		this.lastmessage = messagez;
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
		this.guild.unreads();
		if(this === this.localuser.channelfocus){
			if(!this.infinitefocus){
				this.tryfocusinfinate();
			}
			this.infinite.addedBottom();
		}
		if(messagez.author === this.localuser.user){
			return;
		}
		if(
			this.localuser.lookingguild?.prevchannel === this && document.hasFocus()
		){
			return;
		}
		if(this.notification === "all"){
			this.notify(messagez);
		}else if(
			this.notification === "mentions" && messagez.mentionsuser(this.localuser.user)
		){
			this.notify(messagez);
		}
	}
	notititle(message: Message): string{
		return(
			message.author.username + " > " + this.guild.properties.name + " > " + this.name
		);
	}
	notify(message: Message, deep = 0){
		AVoice.noises(AVoice.getNotificationSound());
		if(!("Notification" in window)){
		}else if(Notification.permission === "granted"){
			let noticontent: string | undefined | null = message.content.textContent;
			if(message.embeds[0]){
				noticontent ||= message.embeds[0]?.json.title;
				noticontent ||= message.content.textContent;
			}
			noticontent ||= I18n.getTranslation("blankMessage");
			let imgurl: null | string = null;
			const images = message.getimages();
			if(images.length){
				const image = images[0];
				if(image.proxy_url){
					imgurl ||= image.proxy_url;
				}
				imgurl ||= image.url;
			}
			const notification = new Notification(this.notititle(message), {
				body: noticontent,
				icon: message.author.getpfpsrc(),
				image: imgurl,
			});
			notification.addEventListener("click", _=>{
				window.focus();
				this.getHTML();
			});
		}else if(Notification.permission !== "denied"){
			Notification.requestPermission().then(()=>{
				if(deep === 3){
					return;
				}
				this.notify(message, deep + 1);
			});
		}
	}
	async addRoleToPerms(role: Role){
		await fetch(
			this.info.api + "/channels/" + this.id + "/permissions/" + role.id,
			{
				method: "PUT",
				headers: this.headers,
				body: JSON.stringify({
					allow: "0",
					deny: "0",
					id: role.id,
					type: 0,
				}),
			}
		);
		const perm = new Permissions("0", "0");
		this.permission_overwrites.set(role.id, perm);
		this.permission_overwritesar.push([role, perm]);
	}
	async updateRolePermissions(id: string, perms: Permissions){
		const permission = this.permission_overwrites.get(id);
		if(permission){
			permission.allow = perms.allow;
			permission.deny = perms.deny;
		}else{
			//this.permission_overwrites.set(id,perms);
		}
		await fetch(
			this.info.api + "/channels/" + this.id + "/permissions/" + id,
			{
				method: "PUT",
				headers: this.headers,
				body: JSON.stringify({
					allow: perms.allow.toString(),
					deny: perms.deny.toString(),
					id,
					type: 0,
				}),
			}
		);
	}
}
Channel.setupcontextmenu();
export{ Channel };
