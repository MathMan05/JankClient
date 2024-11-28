import{ Contextmenu }from"./contextmenu.js";
import{ User }from"./user.js";
import{ Member }from"./member.js";
import{ MarkDown, saveCaretPosition }from"./markdown.js";
import{ Embed }from"./embed.js";
import{ Channel }from"./channel.js";
import{ Localuser }from"./localuser.js";
import{ Role }from"./role.js";
import{ File }from"./file.js";
import{ SnowFlake }from"./snowflake.js";
import{ memberjson, messagejson }from"./jsontypes.js";
import{ Emoji }from"./emoji.js";
import{ mobile }from"./login.js";
import { I18n } from "./i18n.js";
import { Hover } from "./hover.js";
import { Dialog } from "./settings.js";

class Message extends SnowFlake{
	static contextmenu = new Contextmenu<Message, undefined>("message menu");
	owner: Channel;
	headers: Localuser["headers"];
	embeds!: Embed[];
	author!: User;
	mentions!: User[];
	mention_roles!: Role[];
	attachments!: File[]; //probably should be its own class tbh, should be Attachments[]
	message_reference!: {
		guild_id: string,
		channel_id: string,
		message_id: string
	};
	type!: number;
	timestamp!: number;
	content!: MarkDown;
	static del: Promise<void>;
	static resolve: Function;
	/*
		weakdiv:WeakRef<HTMLDivElement>;
			set div(e:HTMLDivElement){
			if(!e){
			this.weakdiv=null;
			return;
			}
			this.weakdiv=new WeakRef(e);
			}
			get div(){
			return this.weakdiv?.deref();
			}
			//*/
	div:(HTMLDivElement & { pfpparent?: Message | undefined; txt?: HTMLElement })| undefined;
	member: Member | undefined;
	reactions!: messagejson["reactions"];
	static setup(){
		this.del = new Promise(_=>{
			this.resolve = _;
		});
		Message.setupcmenu();
	}
	static setupcmenu(){
		Message.contextmenu.addbutton(()=>I18n.getTranslation("copyrawtext"), function(this: Message){
			navigator.clipboard.writeText(this.content.rawString);
		});
		Message.contextmenu.addbutton(()=>I18n.getTranslation("reply"), function(this: Message){
			this.channel.setReplying(this);
		});
		Message.contextmenu.addbutton(()=>I18n.getTranslation("copymessageid"), function(this: Message){
			navigator.clipboard.writeText(this.id);
		});
		Message.contextmenu.addsubmenu(
			()=>I18n.getTranslation("message.reactionAdd"),
			function(this: Message, _, e: MouseEvent){
				Emoji.emojiPicker(e.x, e.y, this.localuser).then(_=>{
					this.reactionToggle(_);
				});
			}
		);
		Message.contextmenu.addbutton(
			()=>I18n.getTranslation("message.edit"),
			function(this: Message){
				this.setEdit();
			},
			null,
			function(){
				return this.author.id === this.localuser.user.id;
			}
		);
		Message.contextmenu.addbutton(
			()=>I18n.getTranslation("message.delete"),
			function(this: Message){
				this.confirmDelete();
			},
			null,
			function(){
				return this.canDelete();
			}
		);
	}
	setEdit(){
		const prev=this.channel.editing;
		this.channel.editing = this;
		if(prev) prev.generateMessage();
		this.generateMessage(undefined,false)
	}
	constructor(messagejson: messagejson, owner: Channel){
		super(messagejson.id);
		this.owner = owner;
		this.headers = this.owner.headers;
		this.giveData(messagejson);
		this.owner.messages.set(this.id, this);
	}
	reactionToggle(emoji: string | Emoji){
		let remove = false;
		for(const thing of this.reactions){
			if(thing.emoji.name === emoji){
				remove = thing.me;
				break;
			}
		}
		let reactiontxt: string;
		if(emoji instanceof Emoji){
			reactiontxt = `${emoji.name}:${emoji.id}`;
		}else{
			reactiontxt = encodeURIComponent(emoji);
		}
		fetch(
			`${this.info.api}/channels/${this.channel.id}/messages/${this.id}/reactions/${reactiontxt}/@me`,
			{
				method: remove ? "DELETE" : "PUT",
				headers: this.headers,
			}
		);
	}
	edited_timestamp:string|null=null;
	giveData(messagejson: messagejson){
		const func = this.channel.infinite.snapBottom();
		for(const thing of Object.keys(messagejson)){
			if(thing === "attachments"){
				this.attachments = [];
				for(const thing of messagejson.attachments){
					this.attachments.push(new File(thing, this));
				}
				continue;
			}else if(thing === "content"){
				this.content = new MarkDown(messagejson[thing], this.channel);
				continue;
			}else if(thing === "id"){
				continue;
			}else if(thing === "member"){
				Member.new(messagejson.member as memberjson, this.guild).then(_=>{
					this.member = _ as Member;
				});
				continue;
			}else if(thing === "embeds"){
				this.embeds = [];
				for(const thing in messagejson.embeds){
					this.embeds[thing] = new Embed(messagejson.embeds[thing], this);
				}
				continue;
			}
			(this as any)[thing] = (messagejson as any)[thing];
		}
		if(messagejson.reactions?.length){
			console.log(messagejson.reactions, ":3");
		}

		this.author = new User(messagejson.author, this.localuser);
		for(const thing in messagejson.mentions){
			this.mentions[thing] = new User(
				messagejson.mentions[thing],
				this.localuser
			);
		}
		if(!this.member && this.guild.id !== "@me"){
			this.author.resolvemember(this.guild).then(_=>{
				this.member = _;
			});
		}
		if(this.mentions.length || this.mention_roles.length){
			//currently mention_roles isn't implemented on the spacebar servers
			console.log(this.mentions, this.mention_roles);
		}
		if(this.mentionsuser(this.localuser.user)){
			console.log(this);
		}
		if(this.div){
			this.generateMessage();
		}
		func();
	}
	canDelete(){
		return(
			this.channel.hasPermission("MANAGE_MESSAGES") ||
			this.author === this.localuser.user
		);
	}
	get channel(){
		return this.owner;
	}
	get guild(){
		return this.owner.guild;
	}
	get localuser(){
		return this.owner.localuser;
	}
	get info(){
		return this.owner.info;
	}
	messageevents(obj: HTMLDivElement){
		let drag=false;
		Message.contextmenu.bindContextmenu(obj, this, undefined,(x)=>{
			//console.log(x,y);
			if(!drag&&x<20){
				return
			}
			drag=true;
			this.channel.moveForDrag(Math.max(x,0));

		},(x,y)=>{
			drag=false;
			console.log(x,y);
			this.channel.moveForDrag(-1);
			if(x>60){
				console.log("In here?")
				const toggle = document.getElementById("maintoggle") as HTMLInputElement;
				toggle.checked = false;
				console.log(toggle);
			}

		},);
		this.div = obj;
		obj.classList.add("messagediv");
	}
	deleteDiv(){
		if(!this.div)return;
		try{
			this.div.remove();
			this.div = undefined;
		}catch(e){
			console.error(e);
		}
	}
	mentionsuser(userd: User | Member){
		if(userd instanceof User){
			return this.mentions.includes(userd);
		}else if(userd instanceof Member){
			return this.mentions.includes(userd.user);
		}else{
			return false;
		}
	}
	getimages(){
		const build: File[] = [];
		for(const thing of this.attachments){
			if(thing.content_type.startsWith("image/")){
				build.push(thing);
			}
		}
		return build;
	}
	async edit(content: string){
		return await fetch(
			this.info.api + "/channels/" + this.channel.id + "/messages/" + this.id,
			{
				method: "PATCH",
				headers: this.headers,
				body: JSON.stringify({ content }),
			}
		);
	}
	delete(){
		fetch(`${this.info.api}/channels/${this.channel.id}/messages/${this.id}`, {
			headers: this.headers,
			method: "DELETE",
		});
	}
	deleteEvent(){
		console.log("deleted");
		if(this.div){
			this.div.remove();
			this.div.innerHTML = "";
			this.div = undefined;
		}
		const prev = this.channel.idToPrev.get(this.id);
		const next = this.channel.idToNext.get(this.id);
		this.channel.idToPrev.delete(this.id);
		this.channel.idToNext.delete(this.id);
		this.channel.messages.delete(this.id);
		if(prev && next){
			this.channel.idToPrev.set(next, prev);
			this.channel.idToNext.set(prev, next);
		}else if(prev){
			this.channel.idToNext.delete(prev);
		}else if(next){
			this.channel.idToPrev.delete(next);
		}
		if(prev){
			const prevmessage = this.channel.messages.get(prev);
			if(prevmessage){
				prevmessage.generateMessage();
			}
		}
		if(
			this.channel.lastmessage === this ||
			this.channel.lastmessageid === this.id
		){
			if(prev){
				this.channel.lastmessage = this.channel.messages.get(prev);
				this.channel.lastmessageid = prev;
			}else{
				this.channel.lastmessage = undefined;
				this.channel.lastmessageid = undefined;
			}
		}
		if(this.channel.lastreadmessageid === this.id){
			if(prev){
				this.channel.lastreadmessageid = prev;
			}else{
				this.channel.lastreadmessageid = undefined;
			}
		}
		console.log("deleted done");
	}
	reactdiv!: WeakRef<HTMLDivElement>;
	blockedPropigate(){
		const previd = this.channel.idToPrev.get(this.id);
		if(!previd){
			this.generateMessage();
			return;
		}
		const premessage = this.channel.messages.get(previd);
		if(premessage?.author === this.author){
			premessage.blockedPropigate();
		}else{
			this.generateMessage();
		}
	}
	generateMessage(premessage?: Message | undefined, ignoredblock = false){
		if(!this.div)return;
		const editmode=this.channel.editing===this;
		if(!premessage){
			premessage = this.channel.messages.get(
				this.channel.idToPrev.get(this.id) as string
			);
		}
		const div = this.div;
		for(const user of this.mentions){
			if(user === this.localuser.user){
				div.classList.add("mentioned");
			}
		}
		if(this === this.channel.replyingto){
			div.classList.add("replying");
		}
		div.innerHTML = "";
		const build = document.createElement("div");

		build.classList.add("flexltr", "message");
		div.classList.remove("zeroheight");
		if(this.author.relationshipType === 2){
			if(ignoredblock){
				if(premessage?.author !== this.author){
					const span = document.createElement("span");
					span.textContent = I18n.getTranslation("hideBlockedMessages");
					div.append(span);
					span.classList.add("blocked");
					span.onclick = _=>{
						const scroll = this.channel.infinite.scrollTop;
						let next: Message | undefined = this;
						while(next?.author === this.author){
							next.generateMessage();
							next = this.channel.messages.get(
				this.channel.idToNext.get(next.id) as string
							);
						}
						if(this.channel.infinite.scollDiv && scroll){
							this.channel.infinite.scollDiv.scrollTop = scroll;
						}
					};
				}
			}else{
				div.classList.remove("topMessage");
				if(premessage?.author === this.author){
					div.classList.add("zeroheight");
					premessage.blockedPropigate();
					div.appendChild(build);
					return div;
				}else{
					build.classList.add("blocked", "topMessage");
					const span = document.createElement("span");
					let count = 1;
					let next = this.channel.messages.get(
				this.channel.idToNext.get(this.id) as string
					);
					while(next?.author === this.author){
						count++;
						next = this.channel.messages.get(
				this.channel.idToNext.get(next.id) as string
						);
					}
					span.textContent = I18n.getTranslation("showBlockedMessages",count+"");
					build.append(span);
					span.onclick = _=>{
						const scroll = this.channel.infinite.scrollTop;
						const func = this.channel.infinite.snapBottom();
						let next: Message | undefined = this;
						while(next?.author === this.author){
							next.generateMessage(undefined, true);
							next = this.channel.messages.get(
				this.channel.idToNext.get(next.id) as string
							);
							console.log("loopy");
						}
						if(this.channel.infinite.scollDiv && scroll){
							func();
							this.channel.infinite.scollDiv.scrollTop = scroll;
						}
					};
					div.appendChild(build);
					return div;
				}
			}
		}
		if(this.message_reference){
			const replyline = document.createElement("div");
			const minipfp = document.createElement("img");
			minipfp.classList.add("replypfp");
			replyline.appendChild(minipfp);
			const username = document.createElement("span");
			replyline.appendChild(username);
			const reply = document.createElement("div");
			username.classList.add("username");
			reply.classList.add("replytext","ellipsis");
			replyline.appendChild(reply);
			const line2 = document.createElement("hr");
			replyline.appendChild(line2);
			line2.classList.add("reply");
			replyline.classList.add("flexltr","replyflex");
			// TODO: Fix this
			this.channel.getmessage(this.message_reference.message_id).then(message=>{
				if(message.author.relationshipType === 2){
					username.textContent = "Blocked user";
					return;
				}
				const author = message.author;
				reply.appendChild(message.content.makeHTML({ stdsize: true }));
				minipfp.src = author.getpfpsrc();
				author.bind(minipfp, this.guild);
				username.textContent = author.username;
				author.bind(username, this.guild);
				Member.resolveMember(author, this.guild).then(_=>{
					if(_){
						username.textContent=_.name;
					}
				})
			});
			reply.onclick = _=>{
				// TODO: FIX this
				this.channel.infinite.focus(this.message_reference.message_id);
			};
			div.appendChild(replyline);
		}
		div.appendChild(build);
		if({ 0: true, 19: true }[this.type] || this.attachments.length !== 0){
			const pfpRow = document.createElement("div");
			let pfpparent, current;
			if(premessage != null){
				pfpparent ??= premessage;
				// @ts-ignore
				// TODO: type this
				let pfpparent2 = pfpparent.all;
				pfpparent2 ??= pfpparent;
				const old = new Date(pfpparent2.timestamp).getTime() / 1000;
				const newt = new Date(this.timestamp).getTime() / 1000;
				current = newt - old > 600;
			}
			const combine = premessage?.author != this.author || current || this.message_reference;
			if(combine){
				const pfp = this.author.buildpfp();
				this.author.bind(pfp, this.guild, false);
				pfpRow.appendChild(pfp);
			}else{
				div.pfpparent = pfpparent;
			}
			pfpRow.classList.add("pfprow");
			build.appendChild(pfpRow);
			const text = document.createElement("div");
			text.classList.add("commentrow", "flexttb");
			if(combine){
				const username = document.createElement("span");
				username.classList.add("username");
				this.author.bind(username, this.guild);
				Member.resolveMember(this.author, this.guild).then(_=>{
					if(_){
						username.textContent=_.name;
					}
				})
				div.classList.add("topMessage");
				username.textContent = this.author.username;
				const userwrap = document.createElement("div");
				userwrap.appendChild(username);
				if(this.author.bot){
					const username = document.createElement("span");
					username.classList.add("bot");
					username.textContent = "BOT";
					userwrap.appendChild(username);
				}
				const time = document.createElement("span");
				time.textContent = "  " + formatTime(new Date(this.timestamp));
				time.classList.add("timestamp");
				userwrap.appendChild(time);
				const hover=new Hover(new Date(this.timestamp).toString());
				hover.addEvent(time);
				if(this.edited_timestamp){
					const edit=document.createElement("span");
					edit.classList.add("timestamp");
					edit.textContent=I18n.getTranslation("message.edited");
					const hover=new Hover(new Date(this.edited_timestamp).toString());
					hover.addEvent(edit);
					userwrap.append(edit);
				}
				text.appendChild(userwrap);
			}else{
				div.classList.remove("topMessage");
			}
			const messagedwrap = document.createElement("div");
			if(editmode){
				const box=document.createElement("div");
				box.classList.add("messageEditContainer");
				const area=document.createElement("div");
				const sb=document.createElement("div");
				sb.style.position="absolute";
				sb.style.width="100%";
				const search=document.createElement("div");
				search.classList.add("searchOptions","flexttb");
				area.classList.add("editMessage");
				area.contentEditable="true";
				const md=new MarkDown(this.content.rawString,this.owner,{keep:true});
				area.append(md.makeHTML());
				area.addEventListener("keyup", (event)=>{
					if(this.localuser.keyup(event)) return;
					if(event.key === "Enter" && !event.shiftKey){
						this.edit(md.rawString);
						this.channel.editing=null;
						this.generateMessage();
					}
				});
				area.addEventListener("keydown", event=>{
					this.localuser.keydown(event);
					if(event.key === "Enter" && !event.shiftKey) event.preventDefault();
					if(event.key === "Escape"){
						this.channel.editing=null;
						this.generateMessage();
					}
				});
				md.giveBox(area,(str,pre)=>{
					this.localuser.search(search,md,str,pre)
				})
				sb.append(search);
				box.append(sb,area);
				messagedwrap.append(box);
				setTimeout(()=>{
					area.focus();
					const fun=saveCaretPosition(area,Infinity);
					if(fun) fun();
				})
			}else{
				this.content.onUpdate=()=>{};
				const messaged = this.content.makeHTML();
				(div as any).txt = messaged;
				messagedwrap.classList.add("flexttb");
				messagedwrap.appendChild(messaged);

			}
			text.appendChild(messagedwrap);
			build.appendChild(text);
			if(this.attachments.length){
				console.log(this.attachments);
				const attach = document.createElement("div");
				attach.classList.add("flexltr","attachments");
				for(const thing of this.attachments){
					attach.appendChild(thing.getHTML());
				}
				messagedwrap.appendChild(attach);
			}
			if(this.embeds.length){
				const embeds = document.createElement("div");
				for(const thing of this.embeds){
					embeds.appendChild(thing.generateHTML());
				}
				messagedwrap.appendChild(embeds);
			}
			//
		}else if(this.type === 7){
			const text = document.createElement("div");
			build.appendChild(text);
			const messaged = document.createElement("span");
			div.txt = messaged;
			messaged.textContent = "welcome: ";
			text.appendChild(messaged);

			const username = document.createElement("span");
			username.textContent = this.author.username;
			//this.author.profileclick(username);
			this.author.bind(username, this.guild);
			text.appendChild(username);
			username.classList.add("username");

			const time = document.createElement("span");
			time.textContent = "  " + formatTime(new Date(this.timestamp));
			time.classList.add("timestamp");
			text.append(time);
			div.classList.add("topMessage");
		}
		const reactions = document.createElement("div");
		reactions.classList.add("flexltr", "reactiondiv");
		this.reactdiv = new WeakRef(reactions);
		this.updateReactions();
		div.append(reactions);
		this.bindButtonEvent();
		return div;
	}
	bindButtonEvent(){
		if(this.div){
			let buttons: HTMLDivElement | undefined;
			this.div.onmouseenter = _=>{
				if(mobile)return;
				if(buttons){
					buttons.remove();
					buttons = undefined;
				}
				if(this.div){
					buttons = document.createElement("div");
					buttons.classList.add("messageButtons", "flexltr");
					if(this.channel.hasPermission("SEND_MESSAGES")){
						const container = document.createElement("button");
						const reply = document.createElement("span");
						reply.classList.add("svg-reply", "svgicon");
						container.append(reply);
						buttons.append(container);
						container.onclick = _=>{
							this.channel.setReplying(this);
						};
					}
					if(this.channel.hasPermission("ADD_REACTIONS")){
						const container = document.createElement("button");
						const reply = document.createElement("span");
						reply.classList.add("svg-emoji", "svgicon");
						container.append(reply);
						buttons.append(container);
						container.onclick = e=>{
							Emoji.emojiPicker(e.x, e.y, this.localuser).then(_=>{
								this.reactionToggle(_);
							});
						};
					}
					if(this.author === this.localuser.user){
						const container = document.createElement("button");
						const edit = document.createElement("span");
						edit.classList.add("svg-edit", "svgicon");
						container.append(edit);
						buttons.append(container);
						container.onclick = _=>{
							this.setEdit();
						};
					}
					if(this.canDelete()){
						const container = document.createElement("button");
						const reply = document.createElement("span");
						reply.classList.add("svg-delete", "svgicon");
						container.append(reply);
						buttons.append(container);
						container.onclick = _=>{
							if(_.shiftKey){
								this.delete();
								return;
							}
							this.confirmDelete();
						};
					}
					if(buttons.childNodes.length !== 0){
						this.div.append(buttons);
					}
				}
			};
			this.div.onmouseleave = _=>{
				if(buttons){
					buttons.remove();
					buttons = undefined;
				}
			};
		}
	}
	confirmDelete(){
		const diaolog=new Dialog("");
		diaolog.options.addTitle(I18n.getTranslation("deleteConfirm"));
		const options=diaolog.options.addOptions("",{ltr:true});
		options.addButtonInput("",I18n.getTranslation("yes"),()=>{
			this.delete();
			diaolog.hide();
		});
		options.addButtonInput("",I18n.getTranslation("no"),()=>{
			diaolog.hide();
		})
		diaolog.show();
	}
	updateReactions(){
		const reactdiv = this.reactdiv.deref();
		if(!reactdiv)return;
		const func = this.channel.infinite.snapBottom();
		reactdiv.innerHTML = "";
		for(const thing of this.reactions){
			const reaction = document.createElement("div");
			reaction.classList.add("reaction");
			if(thing.me){
				reaction.classList.add("meReacted");
			}
			let emoji: HTMLElement;
			if(thing.emoji.id || /\d{17,21}/.test(thing.emoji.name)){
				if(/\d{17,21}/.test(thing.emoji.name))
					thing.emoji.id = thing.emoji.name; //Should stop being a thing once the server fixes this bug
				const emo = new Emoji(
				thing.emoji as { name: string; id: string; animated: boolean },
				this.guild
				);
				emoji = emo.getHTML(false);
			}else{
				emoji = document.createElement("p");
				emoji.textContent = thing.emoji.name;
			}
			const count = document.createElement("p");
			count.textContent = "" + thing.count;
			count.classList.add("reactionCount");
			reaction.append(count);
			reaction.append(emoji);
			reactdiv.append(reaction);

			reaction.onclick = _=>{
				this.reactionToggle(thing.emoji.name);
			};
		}
		func();
	}
	reactionAdd(data: { name: string }, member: Member | { id: string }){
		for(const thing of this.reactions){
			if(thing.emoji.name === data.name){
				thing.count++;
				if(member.id === this.localuser.user.id){
					thing.me = true;
					this.updateReactions();
					return;
				}
			}
		}
		this.reactions.push({
			count: 1,
			emoji: data,
			me: member.id === this.localuser.user.id,
		});
		this.updateReactions();
	}
	reactionRemove(data: { name: string }, id: string){
		console.log("test");
		for(const i in this.reactions){
			const thing = this.reactions[i];
			console.log(thing, data);
			if(thing.emoji.name === data.name){
				thing.count--;
				if(thing.count === 0){
					this.reactions.splice(Number(i), 1);
					this.updateReactions();
					return;
				}
				if(id === this.localuser.user.id){
					thing.me = false;
					this.updateReactions();
					return;
				}
			}
		}
	}
	reactionRemoveAll(){
		this.reactions = [];
		this.updateReactions();
	}
	reactionRemoveEmoji(emoji: Emoji){
		for(const i in this.reactions){
			const reaction = this.reactions[i];
			if(
				(reaction.emoji.id && reaction.emoji.id == emoji.id) ||
				(!reaction.emoji.id && reaction.emoji.name == emoji.name)
			){
				this.reactions.splice(Number(i), 1);
				this.updateReactions();
				break;
			}
		}
	}
	buildhtml(premessage?: Message | undefined): HTMLElement{
		if(this.div){
			console.error(`HTML for ${this.id} already exists, aborting`);
			return this.div;
		}
		try{
			const div = document.createElement("div");
			this.div = div;
			this.messageevents(div);
			return this.generateMessage(premessage) as HTMLElement;
		}catch(e){
			console.error(e);
		}
		return this.div as HTMLElement;
	}
}
let now: string;
let yesterdayStr: string;

function formatTime(date: Date){
	updateTimes();
	const datestring = date.toLocaleDateString();
	const formatTime = (date: Date)=>date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

	if(datestring === now){
		return I18n.getTranslation("todayAt",formatTime(date));
	}else if(datestring === yesterdayStr){
		return I18n.getTranslation("yesterdayAt",formatTime(date));
	}else{
		return I18n.getTranslation("otherAt",formatTime(date),date.toLocaleDateString(),formatTime(date));
	}
}
let tomorrow = 0;
updateTimes();
function updateTimes(){
	if(tomorrow < Date.now()){
		const d = new Date();
		tomorrow = d.setHours(24, 0, 0, 0);
		now = new Date().toLocaleDateString();
		const yesterday = new Date(now);
		yesterday.setDate(new Date().getDate() - 1);
		yesterdayStr = yesterday.toLocaleDateString();
	}
}
Message.setup();
export{ Message };
