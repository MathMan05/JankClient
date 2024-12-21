import{ Member }from"./member.js";
import{ MarkDown }from"./markdown.js";
import{ Contextmenu }from"./contextmenu.js";
import{ Localuser }from"./localuser.js";
import{ Guild }from"./guild.js";
import{ SnowFlake }from"./snowflake.js";
import{ presencejson, userjson }from"./jsontypes.js";
import { Role } from "./role.js";
import { Search } from "./search.js";
import { I18n } from "./i18n.js";
import { Direct } from "./direct.js";

class User extends SnowFlake{
	owner: Localuser;
	hypotheticalpfp!: boolean;
	avatar!: string | null;
	username!: string;
	nickname: string | null = null;
	relationshipType: 0 | 1 | 2 | 3 | 4 | 5 | 6 = 0;
	bio!: MarkDown;
	discriminator!: string;
	pronouns?: string;
	bot!: boolean;
	public_flags!: number;
	accent_color!: number;
	banner: string | undefined;
	hypotheticalbanner!: boolean;
	premium_since!: string;
	premium_type!: number;
	theme_colors!: string;
	badge_ids!: string[];
	members: WeakMap<Guild, Member | undefined | Promise<Member | undefined>> =
		new WeakMap();
	status!: string;
	resolving: false | Promise<any> = false;

	constructor(userjson: userjson, owner: Localuser, dontclone = false){
		super(userjson.id);
		this.owner = owner;
		if(localStorage.getItem("logbad")&&owner.user&&owner.user.id!==userjson.id){
			this.checkfortmi(userjson)
		}
		if(!owner){
			console.error("missing localuser");
		}
		if(dontclone){
			for(const key of Object.keys(userjson)){
				if(key === "bio"){
					this.bio = new MarkDown(userjson[key], this.localuser);
					continue;
				}
				if(key === "id"){
					continue;
				}
				(this as any)[key] = (userjson as any)[key];
			}
			this.hypotheticalpfp = false;
		}else{
			return User.checkuser(userjson, owner);
		}
	}
	/**
	 * function is meant to check if userjson contains too much information IE non-public stuff
	 *
	 *
	 */
	checkfortmi(json:any){
		if(json.data){
			console.error("Server sent *way* too much info, this is really bad, it sent data")
		}
		const bad=new Set(["fingerprints", "extended_settings", "mfa_enabled", "nsfw_allowed", "premium_usage_flags", "totp_last_ticket", "totp_secret", "webauthn_enabled"]);
		for(const thing of bad){
			if(json.hasOwnProperty(thing)){
				console.error(thing+" should not be exposed to the client");
			}
		}
	}
	tojson():userjson{
		return {
				username: this.username,
				id: this.id,
				public_flags: this.public_flags,
				discriminator: this.discriminator,
				avatar: this.avatar,
				accent_color: this.accent_color,
				banner: this.banner,
				bio: this.bio.rawString,
				premium_since: this.premium_since,
				premium_type: this.premium_type,
				bot: this.bot,
				theme_colors: this.theme_colors,
				pronouns: this.pronouns,
				badge_ids: this.badge_ids,
			}
	}

	clone(): User{
		const json=this.tojson();
		json.id+="#clone";
		return new User(
			json,
			this.owner
		);
	}

	public getPresence(presence: presencejson | undefined): void{
		if(presence){
			this.setstatus(presence.status);
		}else{
			this.setstatus("offline");
		}
	}
	get online(){
		return (this.status)&&(this.status!="offline");
	}
	setstatus(status: string): void{
		this.status = status;
	}

	getStatus(): string{
		return this.status || "offline";
	}

	static contextmenu = new Contextmenu<User, Member | undefined>("User Menu");
	async opendm(){
		for(const dm of (this.localuser.guildids.get("@me") as Direct).channels){
			if(dm.user.id===this.id){
				this.localuser.goToChannel(dm.id);
				return;
			}
		}
		await fetch(this.info.api + "/users/@me/channels", {
			method: "POST",
			body: JSON.stringify({ recipients: [this.id] }),
			headers: this.localuser.headers,
		})
		.then(res=>res.json())
		.then(json=>{
			this.localuser.goToChannel(json.id);
		});
		return;
	}
	async changeRelationship(type:0|1|2|3|4|5){
		if(type!==0){
			await fetch(`${this.info.api}/users/@me/relationships/${this.id}`, {
				method: "PUT",
				headers: this.owner.headers,
				body: JSON.stringify({
					type,
				}),
			});
		}else{
			await fetch(`${this.info.api}/users/@me/relationships/${this.id}`, {
				method: "DELETE",
				headers: this.owner.headers
			});
		}
		this.relationshipType=type;
	}
	static setUpContextMenu(): void{
		this.contextmenu.addbutton(()=>I18n.getTranslation("user.copyId"), function(this: User){
			navigator.clipboard.writeText(this.id);
		});
		this.contextmenu.addbutton(()=>I18n.getTranslation("user.message"), function(this: User){
			this.opendm();
		});
		this.contextmenu.addbutton(
			()=>I18n.getTranslation("user.block"),
			function(this: User){
				this.block();
			},
			null,
			function(){
				return this.relationshipType !== 2;
			}
		);

		this.contextmenu.addbutton(
			()=>I18n.getTranslation("user.unblock"),
			function(this: User){
				this.unblock();
			},
			null,
			function(){
				return this.relationshipType === 2;
			}
		);
		this.contextmenu.addbutton(()=>I18n.getTranslation("user.friendReq"), function(this: User){
			this.changeRelationship(1);
		},null,function(){
			return this.relationshipType===0||this.relationshipType===3;
		});
		this.contextmenu.addbutton(()=>I18n.getTranslation("friends.removeFriend"), function(this: User){
			this.changeRelationship(0);
		},null,function(){
			return this.relationshipType===1;
		});
		this.contextmenu.addbutton(
			()=>I18n.getTranslation("user.kick"),
			function(this: User, member: Member | undefined){
				member?.kick();
			},
			null,
			member=>{
				if(!member)return false;
				const us = member.guild.member;
				if(member.id === us.id){
					return false;
				}
				if(member.id === member.guild.properties.owner_id){
					return false;
				}
				return us.hasPermission("KICK_MEMBERS") || false;
			}
		);

		this.contextmenu.addbutton(
			()=>I18n.getTranslation("user.editServerProfile"),
			function(this: User, member: Member | undefined){
				if(!member) return;
				member.showEditProfile();
			},
			null,
			function(member){
				return member?.id===this.localuser.user.id;
			}
		);
		this.contextmenu.addbutton(
			()=>I18n.getTranslation("user.ban"),
			function(this: User, member: Member | undefined){
				member?.ban();
			},
			null,
			member=>{
				if(!member)return false;
				const us = member.guild.member;
				if(member.id === us.id){
					return false;
				}
				if(member.id === member.guild.properties.owner_id){
					return false;
				}
				return us.hasPermission("BAN_MEMBERS") || false;
			}
		);
		this.contextmenu.addbutton(
			()=>I18n.getTranslation("user.addRole"),
			async function(this: User, member: Member | undefined,e){
				if(member){
					e.stopPropagation();
					const roles:[Role,string[]][]=[];
					for(const role of member.guild.roles){
						if(!role.canManage()||member.roles.indexOf(role)!==-1){
							continue;
						}
						roles.push([role,[role.name]]);
					}
					const search=new Search(roles);
					const result=await search.find(e.x,e.y);
					if(!result) return;
					member.addRole(result);
				}
			},
			null,
			member=>{
				if(!member)return false;
				const us = member.guild.member;
				console.log(us.hasPermission("MANAGE_ROLES"))
				return us.hasPermission("MANAGE_ROLES") || false;
			}
		);
		this.contextmenu.addbutton(
			()=>I18n.getTranslation("user.removeRole"),
			async function(this: User, member: Member | undefined,e){
				if(member){
					e.stopPropagation();
					const roles:[Role,string[]][]=[];
					for(const role of member.roles){
						if(!role.canManage()){
							continue;
						}
						roles.push([role,[role.name]]);
					}
					const search=new Search(roles);
					const result=await search.find(e.x,e.y);
					if(!result) return;
					member.removeRole(result);
				}
			},
			null,
			member=>{
				if(!member)return false;
				const us = member.guild.member;
				console.log(us.hasPermission("MANAGE_ROLES"))
				return us.hasPermission("MANAGE_ROLES") || false;
			}
		);
	}

	static checkuser(user: User | userjson, owner: Localuser): User{
		if(owner.userMap.has(user.id)){
			return owner.userMap.get(user.id) as User;
		}else{
			const tempuser = new User(user as userjson, owner, true);
			owner.userMap.set(user.id, tempuser);
			return tempuser;
		}
	}

	get info(){
		return this.owner.info;
	}

	get localuser(){
		return this.owner;
	}

	get name(){
		return this.username;
	}

	async resolvemember(guild: Guild): Promise<Member | undefined>{
		return await Member.resolveMember(this, guild);
	}

	async getUserProfile(): Promise<any>{
		return await fetch(
			`${this.info.api}/users/${this.id.replace(
				"#clone",
				""
			)}/profile?with_mutual_guilds=true&with_mutual_friends=true`,
			{
				headers: this.localuser.headers,
			}
		).then(res=>res.json());
	}

	async getBadge(id: string): Promise<any>{
		if(this.localuser.badges.has(id)){
			return this.localuser.badges.get(id);
		}else{
			if(this.resolving){
				await this.resolving;
				return this.localuser.badges.get(id);
			}

			const prom = await this.getUserProfile();
			this.resolving = prom;
			const badges = prom.badges;
			this.resolving = false;
			for(const badge of badges){
				this.localuser.badges.set(badge.id, badge);
			}
			return this.localuser.badges.get(id);
		}
	}

	buildpfp(guild:Guild|void|Member|null): HTMLImageElement{
		const pfp = document.createElement("img");
		pfp.loading = "lazy";
		pfp.src = this.getpfpsrc();
		pfp.classList.add("pfp");
		pfp.classList.add("userid:" + this.id);
		if(guild){
			(async()=>{
				if(guild instanceof Guild){
					const memb= await Member.resolveMember(this,guild)
					if(!memb) return;
					pfp.src = memb.getpfpsrc();
				}else{
					pfp.src = guild.getpfpsrc();
				}

			})();

		}
		return pfp;
	}

	async buildstatuspfp(guild:Guild|void|Member|null): Promise<HTMLDivElement>{
		const div = document.createElement("div");
		div.classList.add("pfpDiv")
		const pfp = this.buildpfp(guild);
		div.append(pfp);
		const status = document.createElement("div");
		status.classList.add("statusDiv");
		switch(await this.getStatus()){
		case"offline":
			status.classList.add("offlinestatus");
			break;
		case"online":
		default:
			status.classList.add("onlinestatus");
			break;
		}
		div.append(status);
		return div;
	}

	userupdate(json: userjson): void{
		if(json.avatar !== this.avatar){
			this.changepfp(json.avatar);
		}
	}

	bind(html: HTMLElement, guild: Guild | null = null, error = true): void{
		if(guild && guild.id !== "@me"){
			Member.resolveMember(this, guild)
				.then(member=>{
					User.contextmenu.bindContextmenu(html, this, member);
					if(member === undefined && error){
						const errorSpan = document.createElement("span");
						errorSpan.textContent = "!";
						errorSpan.classList.add("membererror");
						html.after(errorSpan);
						return;
					}
					if(member){
						member.bind(html);
					}else{
						User.contextmenu.bindContextmenu(html, this, undefined);
					}
				})
				.catch(err=>{
					console.log(err);
				});
		}else{
			User.contextmenu.bindContextmenu(html, this, undefined);
		}
		if(guild){
			this.profileclick(html, guild);
		}else{
			this.profileclick(html);
		}
	}

	static async resolve(id: string, localuser: Localuser): Promise<User>{
		const json = await fetch(
			localuser.info.api.toString() + "/users/" + id + "/profile",
			{ headers: localuser.headers }
		).then(res=>res.json());
		return new User(json.user, localuser);
	}

	changepfp(update: string | null): void{
		this.avatar = update;
		this.hypotheticalpfp = false;
		const src = this.getpfpsrc();
		Array.from(document.getElementsByClassName("userid:" + this.id)).forEach(
			element=>{
				(element as HTMLImageElement).src = src;
			}
		);
	}

	async block(){
		await this.changeRelationship(2);
		const channel = this.localuser.channelfocus;
		if(channel){
			for(const message of channel.messages){
				message[1].generateMessage();
			}
		}
	}

	async unblock(){
		await this.changeRelationship(0);
		const channel = this.localuser.channelfocus;
		if(channel){
			for(const message of channel.messages){
				message[1].generateMessage();
			}
		}
	}
	/**
	 * @param guild this is an optional thing that'll get the src of the member if it exists, otherwise ignores it, this is meant to be fast, not accurate
	 */
	getpfpsrc(guild:Guild|void): string{
		if(this.hypotheticalpfp && this.avatar){
			return this.avatar;
		}
		if(guild){
			const member=this.members.get(guild)
			if(member instanceof Member){
				return member.getpfpsrc();
			}
		}
		if(this.avatar !== null){
			return`${this.info.cdn}/avatars/${this.id.replace("#clone", "")}/${
				this.avatar
			}.png`;
		}else{
			const int = Number((BigInt(this.id.replace("#clone", "")) >> 22n) % 6n);
			return`${this.info.cdn}/embed/avatars/${int}.png`;
		}
	}

	async buildprofile(
		x: number,
		y: number,
		guild: Guild | null | Member = null
	): Promise<HTMLDivElement>{
		if(Contextmenu.currentmenu != ""){
			Contextmenu.currentmenu.remove();
		}
		const membres=(async ()=>{
			if(!guild) return;
			let member:Member|undefined;
			if(guild instanceof Guild){
				member=await Member.resolveMember(this,guild)
			}else{
				member=guild;
			}
			return member;
		})()
		const div = document.createElement("div");

		if(this.accent_color){
			div.style.setProperty(
				"--accent_color",
				`#${this.accent_color.toString(16).padStart(6, "0")}`
			);
		}else{
			div.style.setProperty("--accent_color", "transparent");
		}
		const banner=this.getBanner(guild);
		div.append(banner);
		membres.then(member=>{
			if(!member) return;
			if(member.accent_color&&member.accent_color!==0){
				div.style.setProperty(
					"--accent_color",
					`#${member.accent_color.toString(16).padStart(6, "0")}`
				);
			}
		})

		if(x !== -1){
			div.style.left = `${x}px`;
			div.style.top = `${y}px`;
			div.classList.add("profile", "flexttb");
		}else{
			this.setstatus("online");
			div.classList.add("hypoprofile", "profile", "flexttb");
		}
		const badgediv = document.createElement("div");
		badgediv.classList.add("badges");
		(async ()=>{
			if(!this.badge_ids)return;
			for(const id of this.badge_ids){
				const badgejson = await this.getBadge(id);
				if(badgejson){
					const badge = document.createElement(badgejson.link ? "a" : "div");
					badge.classList.add("badge");
					const img = document.createElement("img");
					img.src = badgejson.icon;
					badge.append(img);
					const span = document.createElement("span");
					span.textContent = badgejson.description;
					badge.append(span);
					if(badge instanceof HTMLAnchorElement){
						badge.href = badgejson.link;
					}
					badgediv.append(badge);
				}
			}
		})();
		const pfp = await this.buildstatuspfp(guild);
		div.appendChild(pfp);
		const userbody = document.createElement("div");
		userbody.classList.add("flexttb","infosection");
		div.appendChild(userbody);
		const usernamehtml = document.createElement("h2");
		usernamehtml.textContent = this.username;
		userbody.appendChild(usernamehtml);
		userbody.appendChild(badgediv);
		const discrimatorhtml = document.createElement("h3");
		discrimatorhtml.classList.add("tag");
		discrimatorhtml.textContent = `${this.username}#${this.discriminator}`;
		userbody.appendChild(discrimatorhtml);

		const pronounshtml = document.createElement("p");
		pronounshtml.textContent = this.pronouns||"";
		pronounshtml.classList.add("pronouns");
		userbody.appendChild(pronounshtml);

		membres.then(member=>{
			if(!member) return;
			if(member.pronouns&&member.pronouns!==""){
				pronounshtml.textContent=member.pronouns;
			}
		});

		const rule = document.createElement("hr");
		userbody.appendChild(rule);
		const biohtml = this.bio.makeHTML();
		userbody.appendChild(biohtml);

		membres.then(member=>{
			if(!member)return;
			if(member.bio&&member.bio!==""){
				//TODO make markdown take Guild
				userbody.insertBefore(new MarkDown(member.bio,this.localuser).makeHTML(),biohtml);
				biohtml.remove();
			}
		});

		if(guild){
			membres.then(member=>{
				if(!member)return;
				usernamehtml.textContent=member.name;
				const roles = document.createElement("div");
				roles.classList.add("flexltr","rolesbox");
				for(const role of member.roles){
					if(role.id===member.guild.id) continue;
					const roleDiv = document.createElement("div");
					roleDiv.classList.add("rolediv");
					const color = document.createElement("div");
					roleDiv.append(color);
					color.style.setProperty(
						"--role-color",
						`#${role.color.toString(16).padStart(6, "0")}`
					);
					color.classList.add("colorrolediv");
					const span = document.createElement("span");
					roleDiv.append(span);
					span.textContent = role.name;
					roles.append(roleDiv);
				}
				userbody.append(roles);
			});
		}
		if(x !== -1){
			Contextmenu.currentmenu = div;
			document.body.appendChild(div);
			Contextmenu.keepOnScreen(div);
		}
		return div;
	}
	getBanner(guild:Guild|null|Member):HTMLImageElement{
		const banner = document.createElement("img");

		const bsrc=this.getBannerUrl();
		if(bsrc){
			banner.src = bsrc;
			banner.classList.add("banner");
		}

		if(guild){
			if(guild instanceof Member){
				const bsrc=guild.getBannerUrl();
				if(bsrc){
					banner.src = bsrc;
					banner.classList.add("banner");
				}
			}else{
				Member.resolveMember(this,guild).then(memb=>{
					if(!memb) return;
					const bsrc=memb.getBannerUrl();
					if(bsrc){
						banner.src = bsrc;
						banner.classList.add("banner");
					}
				})
			}
		}
		return banner
	}
	getBannerUrl():string|undefined{
		if(this.banner){
			if(!this.hypotheticalbanner){
				return `${this.info.cdn}/avatars/${this.id.replace("#clone", "")}/${
					this.banner
				}.png`;
			}else{
				return this.banner;
			}
		}else{
			return undefined;
		}
	}
	profileclick(obj: HTMLElement, guild?: Guild): void{
		obj.onclick = (e: MouseEvent)=>{
			this.buildprofile(e.clientX, e.clientY, guild);
			e.stopPropagation();
		};
	}
}

User.setUpContextMenu();
export{ User };
