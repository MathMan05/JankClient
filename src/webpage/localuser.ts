import{ Guild }from"./guild.js";
import{ Channel }from"./channel.js";
import{ Direct }from"./direct.js";
import{ AVoice }from"./audio.js";
import{ User }from"./user.js";
import{ getapiurls, getBulkInfo, setTheme, Specialuser, SW }from"./login.js";
import{channeljson,guildjson,mainuserjson,memberjson,memberlistupdatejson,messageCreateJson,presencejson,readyjson,startTypingjson,wsjson,}from"./jsontypes.js";
import{ Member }from"./member.js";
import{ Dialog, Form, FormError, Options, Settings }from"./settings.js";
import{ getTextNodeAtPosition, MarkDown }from"./markdown.js";
import { Bot } from "./bot.js";
import { Role } from "./role.js";
import { VoiceFactory } from "./voice.js";
import { I18n, langmap } from "./i18n.js";
import { Emoji } from "./emoji.js";

const wsCodesRetry = new Set([4000,4001,4002, 4003, 4005, 4007, 4008, 4009]);

class Localuser{
	badges: Map<string,{ id: string; description: string; icon: string; link: string }> = new Map();
	lastSequence: number | null = null;
	token!: string;
	userinfo!: Specialuser;
	serverurls!: Specialuser["serverurls"];
	initialized!: boolean;
	info!: Specialuser["serverurls"];
	headers!: { "Content-type": string; Authorization: string };
	ready!: readyjson;
	guilds!: Guild[];
	guildids: Map<string, Guild> = new Map();
	user!: User;
	status!: string;
	channelfocus: Channel | undefined;
	lookingguild: Guild | undefined;
	guildhtml: Map<string, HTMLDivElement> = new Map();
	ws: WebSocket | undefined;
	connectionSucceed = 0;
	errorBackoff = 0;
	channelids: Map<string, Channel> = new Map();
	readonly userMap: Map<string, User> = new Map();
	voiceFactory?:VoiceFactory;
	instancePing = {
		name: "Unknown",
	};
	mfa_enabled!: boolean;
	get perminfo(){
		return this.userinfo.localuserStore;
	}
	set perminfo(e){
		this.userinfo.localuserStore = e;
	}
	constructor(userinfo: Specialuser | -1){
		if(userinfo === -1){
			return;
		}
		this.token = userinfo.token;
		this.userinfo = userinfo;
		this.perminfo.guilds ??= {};
		this.serverurls = this.userinfo.serverurls;
		this.initialized = false;
		this.info = this.serverurls;
		this.headers = {
			"Content-type": "application/json; charset=UTF-8",
			Authorization: this.userinfo.token,
		};
	}
	async gottenReady(ready: readyjson): Promise<void>{

		await I18n.done;
		this.initialized = true;
		this.ready = ready;
		this.guilds = [];
		this.guildids = new Map();
		this.user = new User(ready.d.user, this);
		this.user.setstatus("online");
		this.resume_gateway_url=ready.d.resume_gateway_url;
		this.session_id=ready.d.session_id;

		this.mdBox();

		this.voiceFactory=new VoiceFactory({id:this.user.id});
		this.handleVoice();
		this.mfa_enabled = ready.d.user.mfa_enabled as boolean;
		this.userinfo.username = this.user.username;
		this.userinfo.id = this.user.id;
		this.userinfo.pfpsrc = this.user.getpfpsrc();
		this.status = this.ready.d.user_settings.status;
		this.channelfocus = undefined;
		this.lookingguild = undefined;
		this.guildhtml = new Map();
		const members: { [key: string]: memberjson } = {};
		if(ready.d.merged_members){
			for(const thing of ready.d.merged_members){
				members[thing[0].guild_id] = thing[0];
			}
		}
		for(const thing of ready.d.guilds){
			const temp = new Guild(thing, this, members[thing.id]);
			this.guilds.push(temp);
			this.guildids.set(temp.id, temp);
		}
		{
			const temp = new Direct(ready.d.private_channels, this);
			this.guilds.push(temp);
			this.guildids.set(temp.id, temp);
		}
		console.log(ready.d.user_guild_settings.entries);

		for(const thing of ready.d.user_guild_settings.entries){
			(this.guildids.get(thing.guild_id) as Guild).notisetting(thing);
		}

		for(const thing of ready.d.read_state.entries){
			const channel = this.channelids.get(thing.channel_id);
			if(!channel){
				continue;
			}
			channel.readStateInfo(thing);
		}
		for(const thing of ready.d.relationships){
			const user = new User(thing.user, this);
			user.nickname = thing.nickname;
			user.relationshipType = thing.type;
			this.inrelation.add(user);
		}

		this.pingEndpoint();
		this.userinfo.updateLocal();

	}
	inrelation=new Set<User>();
	outoffocus(): void{
		const servers = document.getElementById("servers") as HTMLDivElement;
		servers.innerHTML = "";
		const channels = document.getElementById("channels") as HTMLDivElement;
		channels.innerHTML = "";
		if(this.channelfocus){
			this.channelfocus.infinite.delete();
		}
		this.lookingguild = undefined;
		this.channelfocus = undefined;
	}
	unload(): void{
		this.initialized = false;
		this.outoffocus();
		this.guilds = [];
		this.guildids = new Map();
		if(this.ws){
			this.ws.close(4040);
		}
	}
	swapped = false;
	resume_gateway_url?:string;
	session_id?:string;
	async initwebsocket(resume=false): Promise<void>{
		let returny: () => void;
		if(!this.resume_gateway_url||!this.session_id){
			resume=false;
		}
		const ws = new WebSocket(
			(resume?this.resume_gateway_url:this.serverurls.gateway.toString())
			+"?encoding=json&v=9" +
			(DecompressionStream ? "&compress=zlib-stream" : "")
		);
		this.ws = ws;
		let ds: DecompressionStream;
		let w: WritableStreamDefaultWriter;
		let r: ReadableStreamDefaultReader;
		let arr: Uint8Array;
		let build = "";
		if(DecompressionStream){
			ds = new DecompressionStream("deflate");
			w = ds.writable.getWriter();
			r = ds.readable.getReader();
			arr = new Uint8Array();
		}
		const promise = new Promise<void>(res=>{
			returny = res;
			ws.addEventListener("open", _event=>{
				console.log("WebSocket connected");
				if(resume){
					ws.send(
						JSON.stringify({
							op: 6,
							d: {
								token: this.token,
								session_id: this.session_id,
								seq: this.lastSequence
							}
						})
					);
					this.resume_gateway_url=undefined;
					this.session_id=undefined;
				}else{
					ws.send(
						JSON.stringify({
							op: 2,
							d: {
								token: this.token,
								capabilities: 16381,
								properties: {
									browser: "Jank Client",
									client_build_number: 0, //might update this eventually lol
									release_channel: "Custom",
									browser_user_agent: navigator.userAgent,
								},
								compress: Boolean(DecompressionStream),
								presence: {
									status: "online",
									since: null, //new Date().getTime()
									activities: [],
									afk: false,
								},
							},
						})
					);
				}
			});
			const textdecode = new TextDecoder();
			if(DecompressionStream){
				(async ()=>{
					while(true){
						const read = await r.read();
						const data = textdecode.decode(read.value);
						build += data;
						try{
							const temp = JSON.parse(build);
							build = "";
							await this.handleEvent(temp);
							if(temp.op === 0 && temp.t === "READY"){
								returny();
							}
						}catch{}
					}
				})();
			}
		});

		let order = new Promise<void>(res=>res());

		ws.addEventListener("message", async event=>{
			const temp2 = order;
			order = new Promise<void>(async res=>{
				await temp2;
				let temp: { op: number; t: string };
				try{
					if(event.data instanceof Blob){
						const buff = await event.data.arrayBuffer();
						const array = new Uint8Array(buff);

						const temparr = new Uint8Array(array.length + arr.length);
						temparr.set(arr, 0);
						temparr.set(array, arr.length);
						arr = temparr;

						const len = array.length;
						if(
							!(
								array[len - 1] === 255 &&
								array[len - 2] === 255 &&
								array[len - 3] === 0 &&
								array[len - 4] === 0
							)
						){
							return;
						}
						w.write(arr.buffer);
						arr = new Uint8Array();
						return; //had to move the while loop due to me being dumb
					}else{
						temp = JSON.parse(event.data);
					}

					await this.handleEvent(temp as readyjson);
					if(temp.op === 0 && temp.t === "READY"){
						returny();
					}
				}catch(e){
					console.error(e);
				}finally{
					res();
				}
			});
		});

		ws.addEventListener("close", async event=>{
			this.ws = undefined;
			console.log("WebSocket closed with code " + event.code);
			if((event.code > 1000 && event.code < 1016) || (wsCodesRetry.has(event.code)&&this.errorBackoff===0)){
				this.errorBackoff++;
				this.initwebsocket(true).then(()=>{
					this.loaduser();
				});
				return;
			}
			this.unload();
			(document.getElementById("loading") as HTMLElement).classList.remove("doneloading");
			(document.getElementById("loading") as HTMLElement).classList.add("loading");
			this.fetchingmembers = new Map();
			this.noncemap = new Map();
			this.noncebuild = new Map();
			if((event.code > 1000 && event.code < 1016) || wsCodesRetry.has(event.code)||event.code==4041){
				if(this.connectionSucceed !== 0 && Date.now() > this.connectionSucceed + 20000){
					this.errorBackoff = 0;
				}else this.errorBackoff++;
				this.connectionSucceed = 0;
				const loaddesc=document.getElementById("load-desc") as HTMLElement;

				loaddesc.innerHTML ="";
				loaddesc.append(new MarkDown(I18n.getTranslation("errorReconnect",Math.round(0.2 + this.errorBackoff * 2.8)+"")).makeHTML());
				switch(this.errorBackoff){//try to recover from bad domain
				case 3:
					const newurls = await getapiurls(this.info.wellknown);
					if(newurls){
						this.info = newurls;
						this.serverurls = newurls;
						this.userinfo.json.serverurls = this.info;
						this.userinfo.updateLocal();
						break;
					}
					break;

				case 4: {
					const newurls = await getapiurls(
						new URL(this.info.wellknown).origin
					);
					if(newurls){
						this.info = newurls;
						this.serverurls = newurls;
						this.userinfo.json.serverurls = this.info;
						this.userinfo.updateLocal();
						break;
					}
					break;
				}
				case 5: {
					const breakappart = new URL(this.info.wellknown).origin.split(".");
					const url =
              "https://" + breakappart.at(-2) + "." + breakappart.at(-1);
					const newurls = await getapiurls(url);
					if(newurls){
						this.info = newurls;
						this.serverurls = newurls;
						this.userinfo.json.serverurls = this.info;
						this.userinfo.updateLocal();
					}
					break;
				}
				}
				setTimeout(()=>{
					if(this.swapped)return;
					(document.getElementById("load-desc") as HTMLElement).textContent =I18n.getTranslation("retrying");
					this.initwebsocket().then(()=>{
						this.loaduser();
						this.init();
						const loading = document.getElementById("loading") as HTMLElement;
						loading.classList.add("doneloading");
						loading.classList.remove("loading");
						console.log("done loading");
					});
				}, 200 + this.errorBackoff * 2800);
			}else
				(document.getElementById("load-desc") as HTMLElement).textContent = I18n.getTranslation("unableToConnect")
		});
		await promise;
	}
	relationshipsUpdate=()=>{};
	async handleEvent(temp: wsjson){
		console.debug(temp);
		if(temp.s)this.lastSequence = temp.s;
		if(temp.op ===9&&this.ws){
			this.errorBackoff=0;
			this.ws.close(4041);
		}
		if(temp.op == 0){
			switch(temp.t){
				case"MESSAGE_CREATE":
					if(this.initialized){
						this.messageCreate(temp);
					}
					break;
				case"MESSAGE_DELETE": {
					temp.d.guild_id ??= "@me";
					const channel = this.channelids.get(temp.d.channel_id);
					if(!channel)break;
					const message = channel.messages.get(temp.d.id);
					if(!message)break;
					message.deleteEvent();
					break;
				}
				case"READY":
					await this.gottenReady(temp as readyjson);
					break;
				case"MESSAGE_UPDATE": {
					temp.d.guild_id ??= "@me";
					const channel = this.channelids.get(temp.d.channel_id);
					if(!channel)break;
					const message = channel.messages.get(temp.d.id);
					if(!message)break;
					message.giveData(temp.d);
					break;
				}
				case"TYPING_START":
					if(this.initialized){
						this.typingStart(temp);
					}
					break;
				case"USER_UPDATE":
					if(this.initialized){
						const users = this.userMap.get(temp.d.id);
						if(users){
							users.userupdate(temp.d);
						}
					}
					break;
				case"CHANNEL_UPDATE":
					if(this.initialized){
						this.updateChannel(temp.d);
					}
					break;
				case"CHANNEL_CREATE":
					if(this.initialized){
						this.createChannel(temp.d);
					}
					break;
				case"CHANNEL_DELETE":
					if(this.initialized){
						this.delChannel(temp.d);
					}
					break;
				case"GUILD_DELETE": {
					const guildy = this.guildids.get(temp.d.id);
					if(guildy){
						this.guildids.delete(temp.d.id);
						this.guilds.splice(this.guilds.indexOf(guildy), 1);
						guildy.html.remove();
					}
					break;
				}
				case"GUILD_CREATE": (async()=>{
					const guildy = new Guild(temp.d, this, this.user);
					this.guilds.push(guildy);
					this.guildids.set(guildy.id, guildy);
					(document.getElementById("servers") as HTMLDivElement).insertBefore(
						guildy.generateGuildIcon(),
						document.getElementById("bottomseparator")
					);

				})();
				break;
				case"MESSAGE_REACTION_ADD":
					{
						temp.d.guild_id ??= "@me";
						const guild = this.guildids.get(temp.d.guild_id);
						if(!guild)break;
						const channel = this.channelids.get(temp.d.channel_id);
						if(!channel)break;
						const message = channel.messages.get(temp.d.message_id);
						if(!message)break;
						let thing: Member | { id: string };
						if(temp.d.member){
							thing = (await Member.new(temp.d.member, guild)) as Member;
						}else{
							thing = { id: temp.d.user_id };
						}
						message.reactionAdd(temp.d.emoji, thing);
					}
					break;
				case"MESSAGE_REACTION_REMOVE":
					{
						temp.d.guild_id ??= "@me";
						const channel = this.channelids.get(temp.d.channel_id);
						if(!channel)break;
						const message = channel.messages.get(temp.d.message_id);
						if(!message)break;
						message.reactionRemove(temp.d.emoji, temp.d.user_id);
					}
					break;
				case"MESSAGE_REACTION_REMOVE_ALL":
					{
						temp.d.guild_id ??= "@me";
						const channel = this.channelids.get(temp.d.channel_id);
						if(!channel)break;
						const message = channel.messages.get(temp.d.message_id);
						if(!message)break;
						message.reactionRemoveAll();
					}
					break;
				case"MESSAGE_REACTION_REMOVE_EMOJI":
					{
						temp.d.guild_id ??= "@me";
						const channel = this.channelids.get(temp.d.channel_id);
						if(!channel)break;
						const message = channel.messages.get(temp.d.message_id);
						if(!message)break;
						message.reactionRemoveEmoji(temp.d.emoji);
					}
					break;
				case"GUILD_MEMBERS_CHUNK":
					this.gotChunk(temp.d);
					break;
				case"GUILD_MEMBER_LIST_UPDATE":
				{
					this.memberListUpdate(temp)
					break;
				}
				case "VOICE_STATE_UPDATE":
					if(this.voiceFactory){
						this.voiceFactory.voiceStateUpdate(temp)
					}

					break;
				case "VOICE_SERVER_UPDATE":
					if(this.voiceFactory){
						this.voiceFactory.voiceServerUpdate(temp)
					}
					break;
				case "GUILD_ROLE_CREATE":{
					const guild=this.guildids.get(temp.d.guild_id);
					if(!guild) break;
					guild.newRole(temp.d.role);
					break;
				}
				case "GUILD_ROLE_UPDATE":{
					const guild=this.guildids.get(temp.d.guild_id);
					if(!guild) break;
					guild.updateRole(temp.d.role);
					break;
				}
				case "GUILD_ROLE_DELETE":{
					const guild=this.guildids.get(temp.d.guild_id);
					if(!guild) break;
					guild.deleteRole(temp.d.role_id);
					break;
				}
				case "GUILD_MEMBER_UPDATE":{
					const guild=this.guildids.get(temp.d.guild_id);
					if(!guild) break;
					guild.memberupdate(temp.d)
					break
				}
				case "RELATIONSHIP_ADD":{
					const user = new User(temp.d.user, this);
					user.nickname = null;
					user.relationshipType = temp.d.type;
					this.inrelation.add(user);
					this.relationshipsUpdate();
					break;
				}
				case "RELATIONSHIP_REMOVE":{
					const user = this.userMap.get(temp.d.id);
					if(!user) return;
					user.nickname = null;
					user.relationshipType = 0;
					this.inrelation.delete(user);
					this.relationshipsUpdate();
					break;
				}
				case "PRESENCE_UPDATE":{
					if(temp.d.user){
						this.presences.set(temp.d.user.id, temp.d);
					}
					break;
				}
				case "GUILD_MEMBER_ADD":{
					const guild=this.guildids.get(temp.d.guild_id);
					if(!guild) break;
					Member.new(temp.d,guild);
					break;
				}
				case "GUILD_MEMBER_REMOVE":{
					const guild=this.guildids.get(temp.d.guild_id);
					if(!guild) break;
					const user=new User(temp.d.user,this);
					const member=user.members.get(guild);
					if(!(member instanceof Member)) break;
					member.remove();
					break;
				}
				default :{
					//@ts-ignore
					console.warn("Unhandled case "+temp.t,temp);
				}
			}



		}else if(temp.op === 10){
			if(!this.ws)return;
			console.log("heartbeat down");
			this.heartbeat_interval = temp.d.heartbeat_interval;
			this.ws.send(JSON.stringify({ op: 1, d: this.lastSequence }));
		}else if(temp.op === 11){
			setTimeout((_: any)=>{
				if(!this.ws)return;
				if(this.connectionSucceed === 0)this.connectionSucceed = Date.now();
				this.ws.send(JSON.stringify({ op: 1, d: this.lastSequence }));
			}, this.heartbeat_interval);
		}else{
			console.log("Unhandled case "+temp.d,temp);
		}
	}
	get currentVoice(){
		return this.voiceFactory?.currentVoice;
	}
	async joinVoice(channel:Channel){
		if(!this.voiceFactory) return;
		if(!this.ws) return;
		this.ws.send(JSON.stringify(this.voiceFactory.joinVoice(channel.id,channel.guild.id)));
		return undefined;
	}
	changeVCStatus(status:string){
		const statuselm=document.getElementById("VoiceStatus");
		if(!statuselm) throw new Error("Missing status element");
		statuselm.textContent=status;
	}
	handleVoice(){
		if(this.voiceFactory){
			this.voiceFactory.onJoin=voice=>{
				voice.onSatusChange=status=>{
					this.changeVCStatus(status);
				}
			}
		}
	}

	heartbeat_interval: number = 0;
	updateChannel(json: channeljson): void{
		const guild = this.guildids.get(json.guild_id);
		if(guild){
			guild.updateChannel(json);
			if(json.guild_id === this.lookingguild?.id){
				this.loadGuild(json.guild_id);
			}
		}
	}
	createChannel(json: channeljson): undefined | Channel{
		json.guild_id ??= "@me";
		const guild = this.guildids.get(json.guild_id);
		if(!guild)return;
		const channel = guild.createChannelpac(json);
		if(json.guild_id === this.lookingguild?.id){
			this.loadGuild(json.guild_id,true);
		}
		if(channel.id === this.gotoid){
			guild.loadGuild();
			guild.loadChannel(channel.id);
			this.gotoid = undefined;
		}
		return channel; // Add this line to return the 'channel' variable
	}
	async memberListUpdate(list:memberlistupdatejson|void){
		const div=document.getElementById("sideDiv") as HTMLDivElement;
		div.innerHTML="";
		if(!list) return;
		const counts=new Map<string,number>();
		const guild=this.lookingguild;
		if(!guild) return;
		const channel=this.channelfocus;
		if(!channel) return;
		for(const thing of list.d.ops[0].items){
			if("member" in thing){
				await Member.new(thing.member,guild);
			}else{
				counts.set(thing.group.id,thing.group.count);
			}
		}

		const elms:Map<Role|"offline"|"online",Member[]>=new Map([]);
		for(const role of guild.roles){
			if(role.hoist){
				elms.set(role,[]);
			}
		}
		elms.set("online",[]);
		elms.set("offline",[])
		const members=new Set(guild.members);
		members.forEach((member)=>{
			if(!channel.hasPermission("VIEW_CHANNEL",member)){
				members.delete(member);
				console.log(member)
				return;
			}
		})
		for(const [role, list] of elms){
			members.forEach((member)=>{
				if(role === "offline"){
					if(member.user.status === "offline"){
						list.push(member);
						members.delete(member);
					}
					return;
				}
				if(member.user.status === "offline"){
					return;
				}
				if(role !== "online"&&member.hasRole(role.id)){
					list.push(member);
					members.delete(member);
				}
			});
			if(!list.length) continue;
			list.sort((a,b)=>{
				return (a.name.toLowerCase()>b.name.toLowerCase())?1:-1;
			});
		}
		const online=[...members];
		online.sort((a,b)=>{
			return (a.name.toLowerCase()>b.name.toLowerCase())?1:-1;
		});
		elms.set("online",online);
		for(const [role, list] of elms){
			if(!list.length) continue;
			const category=document.createElement("div");
			category.classList.add("memberList");
			let title=document.createElement("h3");
			if(role==="offline"){
				title.textContent=I18n.getTranslation("user.offline");
				category.classList.add("offline");
			}else if(role==="online"){
				title.textContent=I18n.getTranslation("user.online");
			}else{
				title.textContent=role.name;
			}
			category.append(title);
			const membershtml=document.createElement("div");
			membershtml.classList.add("flexttb");

			for(const member of list){
				const memberdiv=document.createElement("div");
				const pfp=await member.user.buildstatuspfp();
				const username=document.createElement("span");
				username.classList.add("ellipsis");
				username.textContent=member.name;
				member.bind(username)
				member.user.bind(memberdiv,member.guild,false);
				memberdiv.append(pfp,username);
				memberdiv.classList.add("flexltr","liststyle");
				membershtml.append(memberdiv);
			}
			category.append(membershtml);
			div.append(category);
		}

		console.log(elms);
	}
	async getSidePannel(){

		if(this.ws&&this.channelfocus){
			console.log(this.channelfocus.guild.id);
			if(this.channelfocus.guild.id==="@me"){
				this.memberListUpdate();
				return;
			}
			this.ws.send(JSON.stringify({
				d:{
					channels:{[this.channelfocus.id]:[[0,99]]},
					guild_id:this.channelfocus.guild.id
				},
				op:14
			}))
		}else{
			console.log("false? :3")
		}
	}
	gotoid: string | undefined;
	async goToChannel(id: string,addstate=true){
		const channel = this.channelids.get(id);
		if(channel){
			const guild = channel.guild;
			guild.loadGuild();
			guild.loadChannel(id,addstate);
		}else{
			this.gotoid = id;
		}
	}
	delChannel(json: channeljson): void{
		let guild_id = json.guild_id;
		guild_id ??= "@me";
		const guild = this.guildids.get(guild_id);
		if(guild){
			guild.delChannel(json);
		}

		if(json.guild_id === this.lookingguild?.id){
			this.loadGuild(json.guild_id,true);
		}
	}
	init(): void{
		const location = window.location.href.split("/");
		this.buildservers();
		if(location[3] === "channels"){
			const guild = this.loadGuild(location[4]);
			if(!guild){
				return;
			}
			guild.loadChannel(location[5]);
			this.channelfocus = this.channelids.get(location[5]);
		}
	}
	loaduser(): void{
		(document.getElementById("username") as HTMLSpanElement).textContent = this.user.username;
		(document.getElementById("userpfp") as HTMLImageElement).src = this.user.getpfpsrc();
		(document.getElementById("status") as HTMLSpanElement).textContent = this.status;
	}
	isAdmin(): boolean{
		if(this.lookingguild){
			return this.lookingguild.isAdmin();
		}else{
			return false;
		}
	}
	loadGuild(id: string,forceReload=false): Guild | undefined{
		let guild = this.guildids.get(id);
		if(!guild){
			guild = this.guildids.get("@me");
		}
		console.log(forceReload);
		if((!forceReload)&&(this.lookingguild === guild)){
			return guild;
		}
		if(this.channelfocus){
			this.channelfocus.infinite.delete();
			this.channelfocus = undefined;
		}
		if(this.lookingguild){
			this.lookingguild.html.classList.remove("serveropen");
		}

		if(!guild)return;
		if(guild.html){
			guild.html.classList.add("serveropen");
		}
		this.lookingguild = guild;
		(document.getElementById("serverName") as HTMLElement).textContent = guild.properties.name;
		//console.log(this.guildids,id)
		const channels = document.getElementById("channels") as HTMLDivElement;
		channels.innerHTML = "";
		const html = guild.getHTML();
		channels.appendChild(html);
		return guild;
	}
	buildservers(): void{
		const serverlist = document.getElementById("servers") as HTMLDivElement; //
		const outdiv = document.createElement("div");
		const home: any = document.createElement("span");
		const div = document.createElement("div");
		div.classList.add("home", "servericon");

		home.classList.add("svgicon", "svg-home");
		home.all = this.guildids.get("@me");
		(this.guildids.get("@me") as Guild).html = outdiv;
		const unread = document.createElement("div");
		unread.classList.add("unread");
		outdiv.append(unread);
		outdiv.append(div);
		div.appendChild(home);

		outdiv.classList.add("servernoti");
		serverlist.append(outdiv);
		home.onclick = function(){
			this.all.loadGuild();
			this.all.loadChannel();
		};
		const sentdms = document.createElement("div");
		sentdms.classList.add("sentdms");
		serverlist.append(sentdms);
		sentdms.id = "sentdms";

		const br = document.createElement("hr");
		br.classList.add("lightbr");
		serverlist.appendChild(br);
		for(const thing of this.guilds){
			if(thing instanceof Direct){
				(thing as Direct).unreaddms();
				continue;
			}
			const divy = thing.generateGuildIcon();
			serverlist.append(divy);
		}
		{
			const br = document.createElement("hr");
			br.classList.add("lightbr");
			serverlist.appendChild(br);
			br.id = "bottomseparator";

			const div = document.createElement("div");
			const plus = document.createElement("span");
			plus.classList.add("svgicon", "svg-plus");
			div.classList.add("home", "servericon");
			div.appendChild(plus);
			serverlist.appendChild(div);
			div.onclick = _=>{
				this.createGuild();
			};
			const guilddsdiv = document.createElement("div");
			const guildDiscoveryContainer = document.createElement("span");
			guildDiscoveryContainer.classList.add("svgicon", "svg-explore");
			guilddsdiv.classList.add("home", "servericon");
			guilddsdiv.appendChild(guildDiscoveryContainer);
			serverlist.appendChild(guilddsdiv);
			guildDiscoveryContainer.addEventListener("click", ()=>{
				this.guildDiscovery();
			});
		}
		this.unreads();
	}
	createGuild(){

		const full=new Dialog("");
		const buttons=full.options.addButtons("",{top:true});
		const viacode=buttons.add(I18n.getTranslation("invite.joinUsing"));
		{
			const form=viacode.addForm("",async (e: any)=>{
				let parsed = "";
				if(e.code.includes("/")){
					parsed = e.code.split("/")[e.code.split("/").length - 1];
				}else{
					parsed = e.code;
				}
				const json=await (await fetch(this.info.api + "/invites/" + parsed, {
					method: "POST",
					headers: this.headers,
				})).json()
				if(json.message){
					throw new FormError(text,json.message);
				}
				full.hide();
			});
			const text=form.addTextInput(I18n.getTranslation("invite.inviteLinkCode"),"code");
		}
		const guildcreate=buttons.add(I18n.getTranslation("guild.create"));
		{
			const form=guildcreate.addForm("",(fields:any)=>{
				this.makeGuild(fields).then(_=>{
					if(_.message){
						alert(_.errors.name._errors[0].message);
					}else{
						full.hide();
					}
				});
			});
			form.addFileInput(I18n.getTranslation("guild.icon:"),"icon",{files:"one"});
			form.addTextInput(I18n.getTranslation("guild.name:"),"name",{required:true});

		}
		full.show();
	}
	async makeGuild(fields: { name: string; icon: string | null }){
		return await (
			await fetch(this.info.api + "/guilds", {
				method: "POST",
				headers: this.headers,
				body: JSON.stringify(fields),
			})
		).json();
	}
	async guildDiscovery(){
		const content = document.createElement("div");
		content.classList.add("flexttb","guildy");
		content.textContent = I18n.getTranslation("guild.loadingDiscovery");
		const full = new Dialog("");
		full.options.addHTMLArea(content);
		full.show();

		const res = await fetch(this.info.api + "/discoverable-guilds?limit=50", {
			headers: this.headers,
		});
		const json = await res.json();

		content.innerHTML = "";
		const title = document.createElement("h2");
		title.textContent = I18n.getTranslation("guild.disoveryTitle",json.guilds.length+"");
		content.appendChild(title);

		const guilds = document.createElement("div");
		guilds.id = "discovery-guild-content";

		json.guilds.forEach((guild: guildjson["properties"])=>{
			const content = document.createElement("div");
			content.classList.add("discovery-guild");

			if(guild.banner){
				const banner = document.createElement("img");
				banner.classList.add("banner");
				banner.crossOrigin = "anonymous";
				banner.src =this.info.cdn +"/icons/" +guild.id +"/" +guild.banner +".png?size=256";
				banner.alt = "";
				content.appendChild(banner);
			}

			const nameContainer = document.createElement("div");
			nameContainer.classList.add("flex");
			const img = document.createElement("img");
			img.classList.add("icon");
			img.crossOrigin = "anonymous";
			img.src =
        this.info.cdn +
        (guild.icon
        	? "/icons/" + guild.id + "/" + guild.icon + ".png?size=48"
        	: "/embed/avatars/3.png");
			img.alt = "";
			nameContainer.appendChild(img);

			const name = document.createElement("h3");
			name.textContent = guild.name;
			nameContainer.appendChild(name);
			content.appendChild(nameContainer);
			const desc = document.createElement("p");
			desc.textContent = guild.description;
			content.appendChild(desc);

			content.addEventListener("click", async ()=>{
				const joinRes = await fetch(
					this.info.api + "/guilds/" + guild.id + "/members/@me",
					{
						method: "PUT",
						headers: this.headers,
					}
				);
				if(joinRes.ok) full.hide();
			});
			guilds.appendChild(content);
		});
		content.appendChild(guilds);
	}
	messageCreate(messagep: messageCreateJson): void{
		messagep.d.guild_id ??= "@me";
		const channel = this.channelids.get(messagep.d.channel_id);
		if(channel){
			channel.messageCreate(messagep);
			this.unreads();
		}
	}
	unreads(): void{
		for(const thing of this.guilds){
			if(thing.id === "@me"){
				continue;
			}
			const html = this.guildhtml.get(thing.id);
			thing.unreads(html);
		}
	}
	async typingStart(typing: startTypingjson): Promise<void>{
		const channel = this.channelids.get(typing.d.channel_id);
		if(!channel)return;
		channel.typingStart(typing);
	}
	updatepfp(file: Blob): void{
		const reader = new FileReader();
		reader.readAsDataURL(file);
		reader.onload = ()=>{
			fetch(this.info.api + "/users/@me", {
				method: "PATCH",
				headers: this.headers,
				body: JSON.stringify({
					avatar: reader.result,
				}),
			});
		};
	}
	updatebanner(file: Blob | null): void{
		if(file){
			const reader = new FileReader();
			reader.readAsDataURL(file);
			reader.onload = ()=>{
				fetch(this.info.api + "/users/@me", {
					method: "PATCH",
					headers: this.headers,
					body: JSON.stringify({
						banner: reader.result,
					}),
				});
			};
		}else{
			fetch(this.info.api + "/users/@me", {
				method: "PATCH",
				headers: this.headers,
				body: JSON.stringify({
					banner: null,
				}),
			});
		}
	}
	updateProfile(json: {
    bio?: string;
    pronouns?: string;
    accent_color?: number;
  }){
		fetch(this.info.api + "/users/@me/profile", {
			method: "PATCH",
			headers: this.headers,
			body: JSON.stringify(json),
		});
	}
	async showusersettings(){
		const settings = new Settings(I18n.getTranslation("localuser.settings"));
		{
			const userOptions = settings.addButton(I18n.getTranslation("localuser.userSettings"), { ltr: true });
			const hypotheticalProfile = document.createElement("div");
			let file: undefined | File | null;
			let newpronouns: string | undefined;
			let newbio: string | undefined;
			const hypouser = this.user.clone();
			let color: string;
			async function regen(){
				hypotheticalProfile.textContent = "";
				const hypoprofile = await hypouser.buildprofile(-1, -1);

				hypotheticalProfile.appendChild(hypoprofile);
			}
			regen();
			const settingsLeft = userOptions.addOptions("");
			const settingsRight = userOptions.addOptions("");
			settingsRight.addHTMLArea(hypotheticalProfile);

			const finput = settingsLeft.addFileInput(
				I18n.getTranslation("uploadPfp"),
				_=>{
					if(file){
						this.updatepfp(file);
					}
				},
				{ clear: true }
			);
			finput.watchForChange(_=>{
				if(!_){
					file = null;
					hypouser.avatar = null;
					hypouser.hypotheticalpfp = true;
					regen();
					return;
				}
				if(_.length){
					file = _[0];
					const blob = URL.createObjectURL(file);
					hypouser.avatar = blob;
					hypouser.hypotheticalpfp = true;
					regen();
				}
			});
			let bfile: undefined | File | null;
			const binput = settingsLeft.addFileInput(
				I18n.getTranslation("uploadBanner"),
				_=>{
					if(bfile !== undefined){
						this.updatebanner(bfile);
					}
				},
				{ clear: true }
			);
			binput.watchForChange(_=>{
				if(!_){
					bfile = null;
					hypouser.banner = undefined;
					hypouser.hypotheticalbanner = true;
					regen();
					return;
				}
				if(_.length){
					bfile = _[0];
					const blob = URL.createObjectURL(bfile);
					hypouser.banner = blob;
					hypouser.hypotheticalbanner = true;
					regen();
				}
			});
			let changed = false;
			const pronounbox = settingsLeft.addTextInput(
				I18n.getTranslation("pronouns"),
				_=>{
					if(newpronouns || newbio || changed){
						this.updateProfile({
							pronouns: newpronouns,
							bio: newbio,
							accent_color: Number.parseInt("0x" + color.substr(1), 16),
						});
					}
				},
				{ initText: this.user.pronouns }
			);
			pronounbox.watchForChange(_=>{
				hypouser.pronouns = _;
				newpronouns = _;
				regen();
			});
			const bioBox = settingsLeft.addMDInput(I18n.getTranslation("bio"), _=>{}, {
				initText: this.user.bio.rawString,
			});
			bioBox.watchForChange(_=>{
				newbio = _;
				hypouser.bio = new MarkDown(_, this);
				regen();
			});

			if(this.user.accent_color){
				color = "#" + this.user.accent_color.toString(16);
			}else{
				color = "transparent";
			}
			const colorPicker = settingsLeft.addColorInput(
				I18n.getTranslation("profileColor"),
				_=>{},
				{ initColor: color }
			);
			colorPicker.watchForChange(_=>{
				console.log();
				color = _;
				hypouser.accent_color = Number.parseInt("0x" + _.substr(1), 16);
				changed = true;
				regen();
			});
		}
		{
			const tas = settings.addButton(I18n.getTranslation("localuser.themesAndSounds"));
			{
				const themes = ["Dark", "WHITE", "Light", "Dark-Accent"];
				tas.addSelect(
					I18n.getTranslation("localuser.theme:"),
					_=>{
						localStorage.setItem("theme", themes[_]);
						setTheme();
					},
					themes,
					{
						defaultIndex: themes.indexOf(
              localStorage.getItem("theme") as string
						),
					}
				);
			}
			{
				const sounds = AVoice.sounds;
				tas
					.addSelect(
						I18n.getTranslation("localuser.notisound"),
						_=>{
							AVoice.setNotificationSound(sounds[_]);
						},
						sounds,
						{ defaultIndex: sounds.indexOf(AVoice.getNotificationSound()) }
					)
					.watchForChange(_=>{
						AVoice.noises(sounds[_]);
					});
			}

			{
				let userinfos = getBulkInfo();
				tas.addColorInput(
					I18n.getTranslation("localuser.accentColor"),
					_=>{
						userinfos = getBulkInfo();
						userinfos.accent_color = _;
						localStorage.setItem("userinfos", JSON.stringify(userinfos));
						document.documentElement.style.setProperty(
							"--accent-color",
							userinfos.accent_color
						);
					},
					{ initColor: userinfos.accent_color }
				);
			}

		}
		{
			const update=settings.addButton(I18n.getTranslation("localuser.updateSettings"))
			const sw=update.addSelect(I18n.getTranslation("localuser.swSettings"),()=>{},["SWOff","SWOffline","SWOn"].map(e=>I18n.getTranslation("localuser."+e)),{
				defaultIndex:["false","offlineOnly","true"].indexOf(localStorage.getItem("SWMode") as string)
			});
			sw.onchange=(e)=>{
				SW.setMode(["false","offlineOnly","true"][e] as "false"|"offlineOnly"|"true")
			}
			update.addButtonInput("",I18n.getTranslation("localuser.CheckUpdate"),()=>{
				SW.checkUpdate();
			});
			update.addButtonInput("",I18n.getTranslation("localuser.clearCache"),()=>{
				SW.forceClear();
			});
		}
		{
			const security = settings.addButton(I18n.getTranslation("localuser.accountSettings"));
			const genSecurity = ()=>{
				security.removeAll();
				if(this.mfa_enabled){
					security.addButtonInput("", I18n.getTranslation("localuser.2faDisable"), ()=>{
						const form = security.addSubForm(
							I18n.getTranslation("localuser.2faDisable"),
							(_: any)=>{
								if(_.message){
									switch(_.code){
									case 60008:
										form.error("code", I18n.getTranslation("badCode"));
										break;
									}
								}else{
									this.mfa_enabled = false;
									security.returnFromSub();
									genSecurity();
								}
							},
							{
								fetchURL: this.info.api + "/users/@me/mfa/totp/disable",
								headers: this.headers,
							}
						);
						form.addTextInput(I18n.getTranslation("localuser.2faCode"), "code", { required: true });
					});
				}else{
					security.addButtonInput("", I18n.getTranslation("localuser.2faEnable"), async ()=>{
						let secret = "";
						for(let i = 0; i < 18; i++){
							secret += "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567"[
								Math.floor(Math.random() * 32)
							];
						}
						const form = security.addSubForm(
							I18n.getTranslation("localuser.setUp2fa"),
							(_: any)=>{
								if(_.message){
									switch(_.code){
									case 60008:
										form.error("code", I18n.getTranslation("localuser.badCode"));
										break;
									case 400:
										form.error("password", I18n.getTranslation("localuser.badPassword"));
										break;
									}
								}else{
									genSecurity();
									this.mfa_enabled = true;
									security.returnFromSub();
								}
							},
							{
								fetchURL: this.info.api + "/users/@me/mfa/totp/enable/",
								headers: this.headers,
							}
						);
						form.addTitle(
							I18n.getTranslation("localuser.setUp2faInstruction")
						);
						form.addText(
							I18n.getTranslation("localuser.2faCodeGive",secret)
						);
						form.addTextInput(I18n.getTranslation("localuser.password:"), "password", {
							required: true,
							password: true,
						});
						form.addTextInput(I18n.getTranslation("localuser.2faCode"), "code", { required: true });
						form.setValue("secret", secret);
					});
				}
				security.addButtonInput("", I18n.getTranslation("localuser.changeDiscriminator"), ()=>{
					const form = security.addSubForm(
						I18n.getTranslation("localuser.changeDiscriminator"),
						_=>{
							security.returnFromSub();
						},
						{
							fetchURL: this.info.api + "/users/@me/",
							headers: this.headers,
							method: "PATCH",
						}
					);
					form.addTextInput(I18n.getTranslation("localuser.newDiscriminator"), "discriminator");
				});
				security.addButtonInput("", I18n.getTranslation("localuser.changeEmail"), ()=>{
					const form = security.addSubForm(
						I18n.getTranslation("localuser.changeEmail"),
						_=>{
							security.returnFromSub();
						},
						{
							fetchURL: this.info.api + "/users/@me/",
							headers: this.headers,
							method: "PATCH",
						}
					);
					form.addTextInput(I18n.getTranslation("localuser.password:"), "password", { password: true });
					if(this.mfa_enabled){
						form.addTextInput(I18n.getTranslation("localuser.2faCode"), "code");
					}
					form.addTextInput(I18n.getTranslation("localuser.newEmail:"), "email");
				});
				security.addButtonInput("", I18n.getTranslation("localuser.changeUsername"), ()=>{
					const form = security.addSubForm(
						I18n.getTranslation("localuser.changeUsername"),
						_=>{
							security.returnFromSub();
						},
						{
							fetchURL: this.info.api + "/users/@me/",
							headers: this.headers,
							method: "PATCH",
						}
					);
					form.addTextInput(I18n.getTranslation("localuser.password:"), "password", { password: true });
					if(this.mfa_enabled){
						form.addTextInput(I18n.getTranslation("localuser.2faCode"), "code");
					}
					form.addTextInput(I18n.getTranslation("localuser.newUsername"), "username");
				});
				security.addButtonInput("", I18n.getTranslation("localuser.changePassword"), ()=>{
					const form = security.addSubForm(
						I18n.getTranslation("localuser.changePassword"),
						_=>{
							security.returnFromSub();
						},
						{
							fetchURL: this.info.api + "/users/@me/",
							headers: this.headers,
							method: "PATCH",
						}
					);
					form.addTextInput(I18n.getTranslation("localuser.oldPassword:"), "password", { password: true });
					if(this.mfa_enabled){
						form.addTextInput(I18n.getTranslation("localuser.2faCode"), "code");
					}
					let in1 = "";
					let in2 = "";
					form.addTextInput(I18n.getTranslation("localuser.newPassword:"), "").watchForChange(text=>{
						in1 = text;
					});
					const copy = form.addTextInput("New password again:", "");
					copy.watchForChange(text=>{
						in2 = text;
					});
					form.setValue("new_password", ()=>{
						if(in1 === in2){
							return in1;
						}else{
							throw new FormError(copy, I18n.getTranslation("localuser.PasswordsNoMatch"));
						}
					});
				});

				security.addSelect(I18n.getTranslation("localuser.language"),(e)=>{
					I18n.setLanguage(I18n.options()[e]);
				},[...langmap.values()],{
					defaultIndex:I18n.options().indexOf(I18n.lang)
				});
				{
				const box=security.addCheckboxInput(I18n.getTranslation("localuser.enableEVoice"),()=>{},{initState:Boolean(localStorage.getItem("Voice enabled"))});
				box.onchange=(e)=>{
					if(e){
						if(confirm(I18n.getTranslation("localuser.VoiceWarning"))){
							localStorage.setItem("Voice enabled","true")

						}else{
							box.value=true;
							const checkbox=box.input.deref();
							if(checkbox){
								checkbox.checked=false;
							}
						}
					}else{
						localStorage.removeItem("Voice enabled");
					}
				}
			}
			};
			genSecurity();
		}
		{
			const connections = settings.addButton(I18n.getTranslation("localuser.connections"));
			const connectionContainer = document.createElement("div");
			connectionContainer.id = "connection-container";

			fetch(this.info.api + "/connections", {
				headers: this.headers,
			})
				.then(r=>r.json())
				.then(json=>{
					Object.keys(json)
						.sort(key=>(json[key].enabled ? -1 : 1))
						.forEach(key=>{
							const connection = json[key];

							const container = document.createElement("div");
							container.textContent =
                key.charAt(0).toUpperCase() + key.slice(1);

							if(connection.enabled){
								container.addEventListener("click", async ()=>{
									const connectionRes = await fetch(
										this.info.api + "/connections/" + key + "/authorize",
										{
											headers: this.headers,
										}
									);
									const connectionJSON = await connectionRes.json();
									window.open(
										connectionJSON.url,
										"_blank",
										"noopener noreferrer"
									);
								});
							}else{
								container.classList.add("disabled");
								container.title = I18n.getTranslation("localuser.PasswordsNoMatch");
							}

							connectionContainer.appendChild(container);
						});
				});
			connections.addHTMLArea(connectionContainer);
		}
		{
			const devPortal = settings.addButton(I18n.getTranslation("localuser.devPortal"));

			fetch(this.info.api + "/teams", {
				headers: this.headers,
			}).then(async (teamsRes)=>{
				const teams = await teamsRes.json();

				devPortal.addButtonInput("", I18n.getTranslation("localuser.createApp"), ()=>{
					const form = devPortal.addSubForm(
						I18n.getTranslation("localuser.createApp"),
						(json: any)=>{
							if(json.message) form.error("name", json.message);
							else{
								devPortal.returnFromSub();
								this.manageApplication(json.id,devPortal);
							}
						},
						{
							fetchURL: this.info.api + "/applications",
							headers: this.headers,
							method: "POST",
						}
					);

					form.addTextInput("Name:", "name", { required: true });
					form.addSelect(
						I18n.getTranslation("localuser.team:"),
						"team_id",
						["Personal", ...teams.map((team: { name: string })=>team.name)],
						{
							defaultIndex: 0,
						}
					);
				});

				const appListContainer = document.createElement("div");
				appListContainer.id = "app-list-container";
				fetch(this.info.api + "/applications", {
					headers: this.headers,
				})
					.then(r=>r.json())
					.then(json=>{
						json.forEach(
							(application: {
								cover_image: any;
								icon: any;
								id: string | undefined;
								name: string | number;
								bot: any;
							})=>{
								const container = document.createElement("div");

								if(application.cover_image || application.icon){
									const cover = document.createElement("img");
									cover.crossOrigin = "anonymous";
									cover.src =
									this.info.cdn +
									"/app-icons/" +
									application.id +
									"/" +
									(application.cover_image || application.icon) +
									".png?size=256";
									cover.alt = "";
									cover.loading = "lazy";
									container.appendChild(cover);
								}

								const name = document.createElement("h2");
								name.textContent = application.name + (application.bot ? " (Bot)" : "");
								container.appendChild(name);

								container.addEventListener("click", async ()=>{
									this.manageApplication(application.id,devPortal);
								});
								appListContainer.appendChild(container);
							}
						);
					});
				devPortal.addHTMLArea(appListContainer);
			});
		}
		settings.show();
	}
	readonly botTokens:Map<string,string>=new Map();
	async manageApplication(appId = "", container:Options){
		if(this.perminfo.applications){
			for(const item of Object.keys(this.perminfo.applications)){
				this.botTokens.set(item,this.perminfo.applications[item]);
			}
		}
		const res = await fetch(this.info.api + "/applications/" + appId, {
			headers: this.headers,
		});
		const json = await res.json();
		const form=container.addSubForm(json.name,()=>{},{
			fetchURL:this.info.api + "/applications/" + appId,
			method:"PATCH",
			headers:this.headers,
			traditionalSubmit:true
		});
		form.addTextInput(I18n.getTranslation("localuser.appName"),"name",{initText:json.name});
		form.addMDInput(I18n.getTranslation("localuser.description"),"description",{initText:json.description});
		form.addFileInput("Icon:","icon");
		form.addTextInput(I18n.getTranslation("localuser.privacyPolcyURL"),"privacy_policy_url",{initText:json.privacy_policy_url});
		form.addTextInput(I18n.getTranslation("localuser.TOSURL"),"terms_of_service_url",{initText:json.terms_of_service_url});
		form.addCheckboxInput(I18n.getTranslation("localuser.publicAvaliable"),"bot_public",{initState:json.bot_public});
		form.addCheckboxInput(I18n.getTranslation("localuser.requireCode"),"bot_require_code_grant",{initState:json.bot_require_code_grant});
		form.addButtonInput("",I18n.getTranslation("localuser."+(json.bot?"manageBot":"addBot")),async ()=>{
			if(!json.bot){
				if(!confirm(I18n.getTranslation("localuser.confirmAddBot"))){
					return;
				}
				const updateRes = await fetch(
					this.info.api + "/applications/" + appId + "/bot",
					{
						method: "POST",
						headers: this.headers,
					}
				);
				const updateJSON = await updateRes.json();
				this.botTokens.set(appId,updateJSON.token);
			}
			this.manageBot(appId,form);
		})
	}
	async manageBot(appId = "",container:Form){
		const res = await fetch(this.info.api + "/applications/" + appId, {
			headers: this.headers
		});
		const json = await res.json();
		if(!json.bot){
			return alert(I18n.getTranslation("localuser.confuseNoBot"));
		}
		const bot:mainuserjson=json.bot;
		const form=container.addSubForm(I18n.getTranslation("localuser.editingBot",bot.username),out=>{console.log(out)},{
			method:"PATCH",
			fetchURL:this.info.api + "/applications/" + appId + "/bot",
			headers:this.headers,
			traditionalSubmit:true
		});
		form.addTextInput(I18n.getTranslation("localuser.botUsername"),"username",{initText:bot.username});
		form.addFileInput(I18n.getTranslation("localuser.botAvatar"),"avatar");
		form.addButtonInput("",I18n.getTranslation("localuser.resetToken"),async ()=>{
			if(!confirm(I18n.getTranslation("localuser.confirmReset"))){
				return;
			}
			const updateRes = await fetch(
				this.info.api + "/applications/" + appId + "/bot/reset",
				{
					method: "POST",
					headers: this.headers,
				}
			);
			const updateJSON = await updateRes.json();
			text.setText(I18n.getTranslation("localuser.tokenDisplay",updateJSON.token));
			this.botTokens.set(appId,updateJSON.token);
			if(this.perminfo.applications[appId]){
				this.perminfo.applications[appId]=updateJSON.token;
				this.userinfo.updateLocal();
			}
		});
		const text=form.addText(I18n.getTranslation("localuser.tokenDisplay",this.botTokens.has(appId)?this.botTokens.get(appId) as string:"*****************") );
		const check=form.addOptions("",{noSubmit:true});
		if(!this.perminfo.applications){
			this.perminfo.applications={};
			this.userinfo.updateLocal();
		}
		const checkbox=check.addCheckboxInput(I18n.getTranslation("localuser.saveToken"),()=>{},{initState:!!this.perminfo.applications[appId]});
		checkbox.watchForChange(_=>{
			if(_){
				if(this.botTokens.has(appId)){
					this.perminfo.applications[appId]=this.botTokens.get(appId);
					this.userinfo.updateLocal();
				}else{
					alert(I18n.getTranslation("localuser.noToken"));
					checkbox.setState(false);
				}
			}else{
				delete this.perminfo.applications[appId];
				this.userinfo.updateLocal();
			}
		});
		form.addButtonInput("",I18n.getTranslation("localuser.advancedBot"),()=>{
			const token=this.botTokens.get(appId);
			if(token){
				const botc=new Bot(bot,token,this);
				botc.settings();
			}
		});
		form.addButtonInput("",I18n.getTranslation("localuser.botInviteCreate"),()=>{
			Bot.InviteMaker(appId,form,this.info);
		})
	}
	readonly autofillregex=Object.freeze(/[@#:]([a-z0-9 ]*)$/i);
	mdBox(){
		interface CustomHTMLDivElement extends HTMLDivElement {markdown: MarkDown;}

		const typebox = document.getElementById("typebox") as CustomHTMLDivElement;
		const typeMd=typebox.markdown;
		typeMd.owner=this;
		typeMd.onUpdate=(str,pre)=>{
			this.search(document.getElementById("searchOptions") as HTMLDivElement,typeMd,str,pre);
		}
	}
	MDReplace(replacewith:string,original:string,typebox:MarkDown){
		let raw=typebox.rawString;
		raw=raw.split(original)[1];
		if(raw===undefined) return;
		raw=original.replace(this.autofillregex,"")+replacewith+raw;
		console.log(raw);
		console.log(replacewith);
		console.log(original);
		typebox.txt = raw.split("");
		const match=original.match(this.autofillregex);
		if(match){
			typebox.boxupdate(replacewith.length-match[0].length);
		}
	}
	MDSearchOptions(options:[string,string,void|HTMLElement][],original:string,div:HTMLDivElement,typebox:MarkDown){
		if(!div)return;
		div.innerHTML="";
		let i=0;
		const htmloptions:HTMLSpanElement[]=[];
		for(const thing of options){
			if(i==8){
				break;
			}
			i++;
			const span=document.createElement("span");
			htmloptions.push(span);
			if(thing[2]){
				span.append(thing[2]);
			}

			span.append(thing[0]);
			span.onclick=(e)=>{

				if(e){
					const selection = window.getSelection() as Selection;
					const box=typebox.box.deref();
					if(!box) return;
					if(selection){
						console.warn(original);

						const pos = getTextNodeAtPosition(box, original.length-(original.match(this.autofillregex) as RegExpMatchArray)[0].length+thing[1].length);
						selection.removeAllRanges();
						const range = new Range();
						range.setStart(pos.node, pos.position);
						selection.addRange(range);
					}
					e.preventDefault();
					box.focus();
				}
				this.MDReplace(thing[1],original,typebox);
				div.innerHTML="";
				remove();
			}
			div.prepend(span);
		}
		const remove=()=>{
			if(div&&div.innerHTML===""){
				this.keyup=()=>false;
				this.keydown=()=>{};
				return true;
			}
			return false;
		}
		if(htmloptions[0]){
			let curindex=0;
			let cur=htmloptions[0];
			cur.classList.add("selected");
			const cancel=new Set(["ArrowUp","ArrowDown","Enter","Tab"]);
			this.keyup=(event)=>{
				if(remove()) return false;
				if(cancel.has(event.key)){
					switch(event.key){
						case "ArrowUp":
							if(htmloptions[curindex+1]){
								cur.classList.remove("selected");
								curindex++;
								cur=htmloptions[curindex];
								cur.classList.add("selected");
							}
							break;
						case "ArrowDown":
							if(htmloptions[curindex-1]){
								cur.classList.remove("selected");
								curindex--;
								cur=htmloptions[curindex];
								cur.classList.add("selected");
							}
							break;
						case "Enter":
						case "Tab":
							//@ts-ignore
							cur.onclick();
							break;
					}
					return true;
				}
				return false;
			}
			this.keydown=(event)=>{
				if(remove()) return;
				if(cancel.has(event.key)){
					event.preventDefault();
				}
			}
		}else{
			remove();
		}
	}
	MDFindChannel(name:string,orginal:string,box:HTMLDivElement,typebox:MarkDown){
		const maybe:[number,Channel][]=[];
		if(this.lookingguild&&this.lookingguild.id!=="@me"){
			for(const channel of this.lookingguild.channels){
				const confidence=channel.similar(name);
				if(confidence>0){
					maybe.push([confidence,channel]);
				}
			}
		}
		maybe.sort((a,b)=>b[0]-a[0]);
		this.MDSearchOptions(maybe.map((a)=>["# "+a[1].name,`<#${a[1].id}> `,undefined]),orginal,box,typebox);
	}
	async getUser(id:string){
		if(this.userMap.has(id)){
			return this.userMap.get(id) as User;
		}
		return new User(await (await fetch(this.info.api+"/users/"+id)).json(),this);
	}
	MDFineMentionGen(name:string,original:string,box:HTMLDivElement,typebox:MarkDown){
		let members:[Member,number][]=[];
		if(this.lookingguild){
			for(const member of this.lookingguild.members){
				const rank=member.compare(name);
				if(rank>0){
					members.push([member,rank])
				}
			}
		}
		members.sort((a,b)=>b[1]-a[1]);
		this.MDSearchOptions(members.map((a)=>["@"+a[0].name,`<@${a[0].id}> `,undefined]),original,box,typebox);
	}
	MDFindMention(name:string,original:string,box:HTMLDivElement,typebox:MarkDown){
		if(this.ws&&this.lookingguild){
			this.MDFineMentionGen(name,original,box,typebox);
			const nonce=Math.floor(Math.random()*10**8)+"";
			if(this.lookingguild.member_count<=this.lookingguild.members.size) return;
			this.ws.send(JSON.stringify(
				{op:8,
					d:{
						guild_id:[this.lookingguild.id],
						query:name,
						limit:8,
						presences:true,
						nonce
					}
				}
			));
			this.searchMap.set(nonce,async (e)=>{
				console.log(e);
				if(e.members&&e.members[0]){
					if(e.members[0].user){
						for(const thing of e.members){
							await Member.new(thing,this.lookingguild as Guild)
						}
					}else{
						const prom1:Promise<User>[]=[];
						for(const thing of e.members){
							prom1.push(this.getUser(thing.id));
						}
						Promise.all(prom1);
						for(const thing of e.members){
							if(!this.userMap.has(thing.id)){
								console.warn("Dumb server bug for this member",thing);
								continue;
							}
							await Member.new(thing,this.lookingguild as Guild)
						}
					}
					this.MDFineMentionGen(name,original,box,typebox);
				}
			})
		}
	}
	findEmoji(search:string,orginal:string,box:HTMLDivElement,typebox:MarkDown){
		const emj=Emoji.searchEmoji(search,this,10);
		const map=emj.map(([emoji]):[string,string,HTMLElement]=>{
			return [emoji.name,emoji.id?`<${emoji.animated?"a":""}:${emoji.name}:${emoji.id}>`:emoji.emoji as string,emoji.getHTML()]
		})
		this.MDSearchOptions(map,orginal,box,typebox);
	}
	search(box:HTMLDivElement,md:MarkDown,str:string,pre:boolean){
		if(!pre){
			const match=str.match(this.autofillregex);

			if(match){
				const [type, search]=[match[0][0],match[0].split(/@|#|:/)[1]];
				switch(type){
					case "#":
						this.MDFindChannel(search,str,box,md);
						break;
					case "@":
						this.MDFindMention(search,str,box,md);
						break;
					case ":":
						if(search.length>=2){
							this.findEmoji(search,str,box,md)
						}else{
							this.MDSearchOptions([],"",box,md);
						}
						break;
				}
				return
			}
		}
		box.innerHTML="";
	}
	keydown:(event:KeyboardEvent)=>unknown=()=>{};
	keyup:(event:KeyboardEvent)=>boolean=()=>false;
	//---------- resolving members code -----------
	readonly waitingmembers = new Map<string,Map<string, (returns: memberjson | undefined) => void>>();
	readonly presences: Map<string, presencejson> = new Map();
	async resolvemember(
		id: string,
		guildid: string
	): Promise<memberjson | undefined>{
		if(guildid === "@me"){
			return undefined;
		}
		const guild = this.guildids.get(guildid);
		const borked = true;
		if( !guild || borked && guild.member_count > 250){
			//sorry puyo, I need to fix member resolving while it's broken on large guilds
			try{
				const req = await fetch(
					this.info.api + "/guilds/" + guildid + "/members/" + id,
					{
						headers: this.headers,
					}
				);
				if(req.status !== 200){
					return undefined;
				}
				return await req.json();
			}catch{
				return undefined;
			}
		}
		let guildmap = this.waitingmembers.get(guildid);
		if(!guildmap){
			guildmap = new Map();
			this.waitingmembers.set(guildid, guildmap);
		}
		const promise: Promise<memberjson | undefined> = new Promise(res=>{
			guildmap.set(id, res);
			this.getmembers();
		});
		return await promise;
	}
	fetchingmembers: Map<string, boolean> = new Map();
	noncemap: Map<string, (r: [memberjson[], string[]]) => void> = new Map();
	noncebuild: Map<string, [memberjson[], string[], number[]]> = new Map();
	searchMap=new Map<string,(arg:{
		chunk_index: number,
		chunk_count: number,
		nonce: string,
		not_found?: string[],
		members?: memberjson[],
		presences: presencejson[],
	})=>unknown>();
	async gotChunk(chunk: {
		chunk_index: number;
		chunk_count: number;
		nonce: string;
		not_found?: string[];
		members?: memberjson[];
		presences: presencejson[];
	}){
		for(const thing of chunk.presences){
			if(thing.user){
				this.presences.set(thing.user.id, thing);
			}
		}
		if(this.searchMap.has(chunk.nonce)){
			const func=this.searchMap.get(chunk.nonce);
			this.searchMap.delete(chunk.nonce);
			if(func){
				func(chunk);
				return;
			}
		}
		chunk.members ??= [];
		const arr = this.noncebuild.get(chunk.nonce);
		if(!arr)return;
		arr[0] = arr[0].concat(chunk.members);
		if(chunk.not_found){
			arr[1] = chunk.not_found;
		}
		arr[2].push(chunk.chunk_index);
		if(arr[2].length === chunk.chunk_count){
			this.noncebuild.delete(chunk.nonce);
			const func = this.noncemap.get(chunk.nonce);
			if(!func)return;
			func([arr[0], arr[1]]);
			this.noncemap.delete(chunk.nonce);
		}
	}
	async getmembers(){
		const promise = new Promise(res=>{
			setTimeout(res, 10);
		});
		await promise; //allow for more to be sent at once :P
		if(this.ws){
			this.waitingmembers.forEach(async (value, guildid)=>{
				const keys = value.keys();
				if(this.fetchingmembers.has(guildid)){
					return;
				}
				const build: string[] = [];
				for(const key of keys){
					build.push(key);
					if(build.length === 100){
						break;
					}
				}
				if(!build.length){
					this.waitingmembers.delete(guildid);
					return;
				}
				const promise: Promise<[memberjson[], string[]]> = new Promise(
					res=>{
						const nonce = "" + Math.floor(Math.random() * 100000000000);
						this.noncemap.set(nonce, res);
						this.noncebuild.set(nonce, [[], [], []]);
						if(!this.ws)return;
						this.ws.send(
							JSON.stringify({
								op: 8,
								d: {
									user_ids: build,
									guild_id: guildid,
									limit: 100,
									nonce,
									presences: true,
								},
							})
						);
						this.fetchingmembers.set(guildid, true);
					}
				);
				const prom = await promise;
				const data = prom[0];
				for(const thing of data){
					if(value.has(thing.id)){
						const func = value.get(thing.id);
						if(!func){
							value.delete(thing.id);
							continue;
						}
						func(thing);
						value.delete(thing.id);
					}
				}
				for(const thing of prom[1]){
					if(value.has(thing)){
						const func = value.get(thing);
						if(!func){
							value.delete(thing);
							continue;
						}
						func(undefined);
						value.delete(thing);
					}
				}
				this.fetchingmembers.delete(guildid);
				this.getmembers();
			});
		}
	}
	async pingEndpoint(){
		const userInfo = getBulkInfo();
		if(!userInfo.instances) userInfo.instances = {};
		const wellknown = this.info.wellknown;
		if(!userInfo.instances[wellknown]){
			const pingRes = await fetch(this.info.api + "/ping");
			const pingJSON = await pingRes.json();
			userInfo.instances[wellknown] = pingJSON;
			localStorage.setItem("userinfos", JSON.stringify(userInfo));
		}
		this.instancePing = userInfo.instances[wellknown].instance;

		this.pageTitle("Loading...");
	}
	pageTitle(channelName = "", guildName = ""){
		(document.getElementById("channelname") as HTMLSpanElement).textContent = channelName;
		(document.getElementsByTagName("title")[0] as HTMLTitleElement).textContent = channelName + (guildName ? " | " + guildName : "") + " | " + this.instancePing.name +" | Jank Client";
	}
	async instanceStats(){
		const res = await fetch(this.info.api + "/policies/stats", {
			headers: this.headers,
		});
		const json = await res.json();
		const dialog = new Dialog("");
		dialog.options.addTitle(I18n.getTranslation("instanceStats.name",this.instancePing.name));
		dialog.options.addText(I18n.getTranslation("instanceStats.users",json.counts.user));
		dialog.options.addText(I18n.getTranslation("instanceStats.servers",json.counts.guild));
		dialog.options.addText(I18n.getTranslation("instanceStats.messages",json.counts.message));
		dialog.options.addText(I18n.getTranslation("instanceStats.members",json.counts.members));
		dialog.show();
	}
}
export{ Localuser };
