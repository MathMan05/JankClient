import {Member} from "./member.js";
import {MarkDown} from "./markdown.js";
import {Contextmenu} from "./contextmenu.js";
import type {Localuser} from "./localuser.js";
import {Guild} from "./guild.js";
import {SnowFlake} from "./snowflake.js";
import type {presencejson, userjson, webhookInfo} from "./jsontypes.js";
import type {Role} from "./role.js";
import {Search} from "./search.js";
import {I18n} from "./i18n.js";
import type {Direct} from "./direct.js";
import {Hover} from "./hover.js";
import {Dialog} from "./settings.js";
import {createImg} from "./utils/utils.js";

class User extends SnowFlake {
	owner: Localuser;
	hypotheticalpfp!: boolean;
	avatar!: string | null;
	uid: string;
	username!: string;
	nickname: string | null = null;
	relationshipType: 0 | 1 | 2 | 3 | 4 | 5 | 6 = 0;
	bio!: MarkDown;
	discriminator!: string;
	pronouns?: string;
	bot!: boolean;
	public_flags!: number;
	webhook?: webhookInfo;
	accent_color!: number;
	banner: string | undefined;
	hypotheticalbanner!: boolean;
	premium_since!: string;
	premium_type!: number;
	theme_colors!: string;
	badge_ids!: string[];
	members: WeakMap<Guild, Member | undefined | Promise<Member | undefined>> = new WeakMap();
	status!: string;
	resolving: false | Promise<any> = false;

	constructor(userjson: userjson, owner: Localuser, dontclone = false) {
		super(userjson.id);
		this.owner = owner;
		if (localStorage.getItem("logbad") && owner.user && owner.user.id !== userjson.id) {
			this.checkfortmi(userjson);
		}
		if (!owner) {
			console.error("missing localuser");
		}
		this.uid = userjson.id;
		if (userjson.webhook) {
			this.uid += `:::${userjson.username}`;
			console.log(this.uid);
		}
		userjson.uid = this.uid;
		if (dontclone) {
			this.userupdate(userjson);
			this.hypotheticalpfp = false;
		} else {
			return User.checkuser(userjson, owner);
		}
	}
	/**
	 * function is meant to check if userjson contains too much information IE non-public stuff
	 *
	 *
	 */
	checkfortmi(json: any) {
		if (json.data) {
			console.error("Server sent *way* too much info, this is really bad, it sent data");
		}
		const bad = new Set([
			"fingerprints",
			"extended_settings",
			"mfa_enabled",
			"nsfw_allowed",
			"premium_usage_flags",
			"totp_last_ticket",
			"totp_secret",
			"webauthn_enabled",
		]);
		if (!this.localuser.rights.getPermission("OPERATOR")) {
			//Unless the user is an operator, we really shouldn't ever see this
			bad.add("rights");
		}
		for (const thing of bad) {
			if (json.hasOwnProperty(thing)) {
				console.error(`${thing} should not be exposed to the client`);
			}
		}
	}
	tojson(): userjson {
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
		};
	}

	clone(): User {
		const json = this.tojson();
		json.id += "#clone";
		return new User(json, this.owner);
	}

	public getPresence(presence: presencejson | undefined): void {
		if (presence) {
			this.setstatus(presence.status);
		} else {
			this.setstatus("offline");
		}
	}
	get online() {
		return this.status && this.status !== "offline";
	}
	setstatus(status: string): void {
		if (this.id === this.localuser.user.id) {
			console.warn(status);
		}
		this.status = status;
	}

	getStatus(): string {
		return this.status || "offline";
	}

	static contextmenu = new Contextmenu<User, Member | undefined>("User Menu");
	async opendm() {
		for (const dm of (this.localuser.guildids.get("@me") as Direct).channels) {
			if (dm.user.id === this.id) {
				this.localuser.goToChannel(dm.id);
				return;
			}
		}

		await fetch(`${this.info.api}/users/@me/channels`, {
			method: "POST",
			body: JSON.stringify({recipients: [this.id]}),
			headers: this.localuser.headers,
		})
			.then((res) => res.json())
			.then((json) => {
				this.localuser.goToChannel(json.id);
			});
		return;
	}
	async changeRelationship(type: 0 | 1 | 2 | 3 | 4 | 5) {
		if (type !== 0) {
			await fetch(`${this.info.api}/users/@me/relationships/${this.id}`, {
				method: "PUT",
				headers: this.owner.headers,
				body: JSON.stringify({
					type,
				}),
			});
		} else {
			await fetch(`${this.info.api}/users/@me/relationships/${this.id}`, {
				method: "DELETE",
				headers: this.owner.headers,
			});
		}
		this.relationshipType = type;
	}
	static setUpContextMenu(): void {
		User.contextmenu.addButton(
			() => I18n.getTranslation("user.message"),
			function (this: User) {
				this.opendm();
			},
			{
				icon: {
					css: "svg-frmessage",
				},
			},
		);

		User.contextmenu.addSeperator();

		User.contextmenu.addButton(
			() => I18n.getTranslation("user.block"),
			function (this: User) {
				this.block();
			},
			{
				visable: function () {
					return this.relationshipType !== 2 && this.id !== this.localuser.user.id;
				},
			},
		);

		User.contextmenu.addButton(
			() => I18n.getTranslation("user.unblock"),
			function (this: User) {
				this.unblock();
			},
			{
				visable: function () {
					return this.relationshipType === 2 && this.id !== this.localuser.user.id;
				},
			},
		);
		User.contextmenu.addButton(
			() => I18n.getTranslation("user.friendReq"),
			function (this: User) {
				this.changeRelationship(1);
			},
			{
				visable: function () {
					return (
						(this.relationshipType === 0 || this.relationshipType === 3) &&
						this.id !== this.localuser.user.id &&
						!this.bot
					);
				},
				icon: {
					css: "svg-addfriend",
				},
			},
		);
		User.contextmenu.addButton(
			() => I18n.getTranslation("friends.removeFriend"),
			function (this: User) {
				this.changeRelationship(0);
			},
			{
				visable: function () {
					return this.relationshipType === 1 && this.id !== this.localuser.user.id;
				},
			},
		);

		User.contextmenu.addSeperator();

		User.contextmenu.addButton(
			() => I18n.getTranslation("user.editServerProfile"),
			function (this: User, member: Member | undefined) {
				if (!member) return;
				member.showEditProfile();
			},
			{
				visable: function (member) {
					return member?.id === this.localuser.user.id;
				},
			},
		);

		//TODO kick icon
		User.contextmenu.addButton(
			() => I18n.getTranslation("user.kick"),
			function (this: User, member: Member | undefined) {
				member?.kick();
			},
			{
				visable: function (member) {
					if (!member) return false;
					const us = member.guild.member;
					if (member.id === us.id) {
						return false;
					}
					if (member.id === member.guild.properties.owner_id) {
						return false;
					}
					return us.hasPermission("KICK_MEMBERS") && this.id !== this.localuser.user.id;
				},
				color: "red",
			},
		);

		//TODO ban icon
		User.contextmenu.addButton(
			() => I18n.getTranslation("user.ban"),
			function (this: User, member: Member | undefined) {
				member?.ban();
			},
			{
				visable: function (member) {
					if (!member) return false;
					const us = member.guild.member;
					if (member.id === us.id) {
						return false;
					}
					if (member.id === member.guild.properties.owner_id) {
						return false;
					}
					return us.hasPermission("BAN_MEMBERS") && this.id !== this.localuser.user.id;
				},
				color: "red",
			},
		);

		User.contextmenu.addSeperator();

		User.contextmenu.addButton(
			() => I18n.getTranslation("user.addRole"),
			async function (this: User, member: Member | undefined, e) {
				if (member) {
					e.stopPropagation();
					const roles: [Role, string[]][] = [];
					for (const role of member.guild.roles) {
						if (!role.canManage() || member.roles.indexOf(role) !== -1) {
							continue;
						}
						roles.push([role, [role.name]]);
					}
					const search = new Search(roles);
					const result = await search.find(e.x, e.y);
					if (!result) return;
					member.addRole(result);
				}
			},
			{
				visable: (member) => {
					if (!member) return false;
					const us = member.guild.member;
					console.log(us.hasPermission("MANAGE_ROLES"));
					return us.hasPermission("MANAGE_ROLES") || false;
				},
			},
		);
		User.contextmenu.addButton(
			() => I18n.getTranslation("user.removeRole"),
			async function (this: User, member: Member | undefined, e) {
				if (member) {
					e.stopPropagation();
					const roles: [Role, string[]][] = [];
					for (const role of member.roles) {
						if (!role.canManage()) {
							continue;
						}
						roles.push([role, [role.name]]);
					}
					const search = new Search(roles);
					const result = await search.find(e.x, e.y);
					if (!result) return;
					member.removeRole(result);
				}
			},
			{
				visable: (member) => {
					if (!member) return false;
					const us = member.guild.member;
					console.log(us.hasPermission("MANAGE_ROLES"));
					return us.hasPermission("MANAGE_ROLES") || false;
				},
			},
		);

		User.contextmenu.addSeperator();
		User.contextmenu.addButton(
			() => I18n.getTranslation("user.copyId"),
			function (this: User) {
				navigator.clipboard.writeText(this.id);
			},
		);

		User.contextmenu.addSeperator();

		User.contextmenu.addButton(
			() => I18n.user.instanceBan(),
			function (this: User) {
				const menu = new Dialog("");
				const options = menu.float.options;
				options.addTitle(I18n.user.confirmInstBan(this.name));
				const opt = options.addOptions("", {ltr: true});
				opt.addButtonInput("", I18n.yes(), () => {
					fetch(`${this.info.api}/users/${this.id}/delete`, {
						headers: this.localuser.headers,
						method: "POST",
					});
					menu.hide();
				});
				opt.addButtonInput("", I18n.no(), () => {
					menu.hide();
				});
				menu.show();
			},
			{
				visable: function () {
					return this.localuser.rights.hasPermission("MANAGE_USERS");
				},
				color: "red",
			},
		);
		console.warn("this ran");
	}

	static checkuser(user: User | userjson, owner: Localuser): User {
		const tempUser = owner.userMap.get(user.uid || user.id);
		if (tempUser) {
			if (!(user instanceof User)) {
				tempUser.userupdate(user);
			}
			return tempUser;
		}
			const tempuser = new User(user as userjson, owner, true);
			owner.userMap.set(user.uid || user.id, tempuser);
			return tempuser;
	}

	get info() {
		return this.owner.info;
	}

	get localuser() {
		return this.owner;
	}

	get name() {
		return this.username;
	}

	async resolvemember(guild: Guild): Promise<Member | undefined> {
		return await Member.resolveMember(this, guild);
	}

	async getUserProfile(): Promise<any> {
		return await fetch(
			`${this.info.api}/users/${this.id.replace(
				"#clone",
				"",
			)}/profile?with_mutual_guilds=true&with_mutual_friends=true`,
			{
				headers: this.localuser.headers,
			},
		).then((res) => res.json());
	}

	async getBadge(id: string) {
		if (this.localuser.badges.has(id)) {
			return this.localuser.badges.get(id);
		}
			if (this.resolving) {
				await this.resolving;
				return this.localuser.badges.get(id);
			}

			const prom = await this.getUserProfile();
			this.resolving = prom;
			const badges = prom.badges;
			this.resolving = false;
			for (const badge of badges) {
				this.localuser.badges.set(badge.id, badge);
			}
			return this.localuser.badges.get(id);
	}

	buildpfp(guild: Guild | undefined | Member | null, hoverElm: undefined | HTMLElement): HTMLImageElement {
		const pfp = createImg(this.getpfpsrc(), undefined, hoverElm);
		pfp.loading = "lazy";
		pfp.classList.add("pfp");
		pfp.classList.add(`userid:${this.id}`);
		if (guild) {
			(async () => {
				if (guild instanceof Guild) {
					const memb = await Member.resolveMember(this, guild);
					if (!memb) return;
					pfp.setSrcs(memb.getpfpsrc());
				} else {
					pfp.setSrcs(guild.getpfpsrc());
				}
			})();
		}
		return pfp;
	}
	createWidget(guild: Guild) {
		const div = document.createElement("div");
		div.classList.add("flexltr", "createdWebhook");
		//TODO make sure this is something I can actually do here
		const name = document.createElement("b");
		name.textContent = this.name;
		const nameBox = document.createElement("div");
		nameBox.classList.add("flexttb");
		nameBox.append(name);
		const pfp = this.buildpfp(undefined, div);
		div.append(pfp, nameBox);
		Member.resolveMember(this, guild).then((_) => {
			if (_) {
				name.textContent = _.name;
				pfp.src = _.getpfpsrc();
			} else {
				const notFound = document.createElement("span");
				notFound.textContent = I18n.webhooks.notFound();
				nameBox.append(notFound);
			}
		});
		this.bind(div, guild);
		return div;
	}
	async buildstatuspfp(guild: Guild | undefined | Member | null): Promise<HTMLDivElement> {
		const div = document.createElement("div");
		div.classList.add("pfpDiv");
		const pfp = this.buildpfp(guild, div);
		div.append(pfp);
		const status = document.createElement("div");
		status.classList.add("statusDiv");
		switch (await this.getStatus()) {
			case "offline":
			case "invisible":
				status.classList.add("offlinestatus");
				break;
			default:
				status.classList.add("onlinestatus");
				break;
		}
		div.append(status);
		return div;
	}

	userupdate(json: userjson): void {
		for (const key of Object.keys(json)) {
			if (key === "bio") {
				this.bio = new MarkDown(json[key], this.localuser);
				continue;
			}
			if (key === "id") {
				continue;
			}
			(this as any)[key] = (json as any)[key];
		}
		if ("rights" in this) {
			if (
				this === this.localuser.user &&
				(typeof this.rights === "string" || typeof this.rights === "number")
			) {
				this.localuser.updateRights(this.rights);
			}
		}
	}

	bind(html: HTMLElement, guild: Guild | null = null, error = true): void {
		if (guild && guild.id !== "@me") {
			Member.resolveMember(this, guild)
				.then((member) => {
					User.contextmenu.bindContextmenu(html, this, member);
					if (member === undefined && error) {
						if (this.webhook) return;
						const errorSpan = document.createElement("span");
						errorSpan.textContent = "!";
						errorSpan.classList.add("membererror");
						html.after(errorSpan);
						return;
					}
					if (member) {
						member.bind(html);
					} else {
						User.contextmenu.bindContextmenu(html, this, undefined);
					}
				})
				.catch((err) => {
					console.log(err);
				});
		} else {
			User.contextmenu.bindContextmenu(html, this, undefined);
		}
		if (guild) {
			this.profileclick(html, guild);
		} else {
			this.profileclick(html);
		}
	}

	static async resolve(id: string, localuser: Localuser): Promise<User> {
		const json = await fetch(`${localuser.info.api.toString()}/users/${id}/profile`, {
			headers: localuser.headers,
		}).then((res) => res.json());
		if (json.code === 404) {
			return new User(
				{
					id: "0",
					public_flags: 0,
					username: I18n.friends.notfound(),
					avatar: null,
					discriminator: "0000",
					bio: "",
					bot: false,
					premium_type: 0,
					premium_since: "",
					accent_color: 0,
					theme_colors: "",
					badge_ids: [],
				},
				localuser,
			);
		}
		return new User(json.user, localuser);
	}

	changepfp(update: string | null): void {
		this.avatar = update;
		this.hypotheticalpfp = false;
		//const src = this.getpfpsrc();
		Array.from(document.getElementsByClassName(`userid:${this.id}`)).forEach((_element) => {
			//(element as HTMLImageElement).src = src;
			//FIXME
		});
	}

	async block() {
		await this.changeRelationship(2);
		const channel = this.localuser.channelfocus;
		if (channel) {
			for (const message of channel.messages) {
				message[1].generateMessage();
			}
		}
	}

	async unblock() {
		await this.changeRelationship(0);
		const channel = this.localuser.channelfocus;
		if (channel) {
			for (const message of channel.messages) {
				message[1].generateMessage();
			}
		}
	}
	/**
	 * @param guild this is an optional thing that'll get the src of the member if it exists, otherwise ignores it, this is meant to be fast, not accurate
	 */
	getpfpsrc(guild: Guild | undefined): string {
		if (this.hypotheticalpfp && this.avatar) {
			return this.avatar;
		}
		if (guild) {
			const member = this.members.get(guild);
			if (member instanceof Member) {
				return member.getpfpsrc();
			}
		}
		if (this.avatar !== null) {
			return `${this.info.cdn}/avatars/${this.id.replace("#clone", "")}/${this.avatar}.png`;
		}
			const int = Number((BigInt(this.id.replace("#clone", "")) >> 22n) % 6n);
			return `${this.info.cdn}/embed/avatars/${int}.png`;
	}
	async getBadges() {
		let i = 0;
		let flagbits = this.public_flags;
		const ids = [
			"staff",
			"partner",
			"certified_moderator",
			"hypesquad",
			"hypesquad_house_1",
			"hypesquad_house_2",
			"hypesquad_house_3",
			"bug_hunter_level_1",
			"bug_hunter_level_2",
			"active_developer",
			"verified_developer",
			"early_supporter",
			"premium",
			"guild_booster_lvl1",
			"guild_booster_lvl2",
			"guild_booster_lvl3",
			"guild_booster_lvl4",
			"guild_booster_lvl5",
			"guild_booster_lvl6",
			"guild_booster_lvl7",
			"guild_booster_lvl8",
			"guild_booster_lvl9",
			"bot_commands",
			"automod",
			"application_guild_subscription",
			"legacy_username",
			"quest_completed",
		];
		let badgeids: string[] = [];
		while (flagbits !== 0) {
			if (flagbits & 1) {
				badgeids.push(ids[i]);
			}
			flagbits >>= 1;
			i++;
		}
		if (this.badge_ids) {
			badgeids = badgeids.concat(this.badge_ids);
		}

		let badges: {
			id: string;
			description: string;
			icon: string;
			link?: string;
			translate?: boolean;
		}[] = [];

		const b = (await Promise.all(badgeids.map((_) => this.getBadge(_)))).filter(
			(_) => _ !== undefined,
		);
		badges = b;

		return badges;
	}
	async buildprofile(
		x: number,
		y: number,
		guild: Guild | null | Member = null,
	): Promise<HTMLDivElement> {
		if (Contextmenu.currentmenu !== "") {
			Contextmenu.currentmenu.remove();
		}
		const membres = (async () => {
			if (!guild) return;
			let member: Member | undefined;
			if (guild instanceof Guild) {
				member = await Member.resolveMember(this, guild);
			} else {
				member = guild;
			}
			return member;
		})();
		const div = document.createElement("div");

		if (this.accent_color) {
			div.style.setProperty(
				"--accent_color",
				`#${this.accent_color.toString(16).padStart(6, "0")}`,
			);
		} else {
			div.style.setProperty("--accent_color", "transparent");
		}
		const banner = this.getBanner(guild);
		div.append(banner);
		membres.then((member) => {
			if (!member) return;
			if (member.accent_color && member.accent_color !== 0) {
				div.style.setProperty(
					"--accent_color",
					`#${member.accent_color.toString(16).padStart(6, "0")}`,
				);
			}
		});

		if (x !== -1) {
			div.style.left = `${x}px`;
			div.style.top = `${y}px`;
			div.classList.add("profile", "flexttb");
		} else {
			this.setstatus("online");
			div.classList.add("hypoprofile", "profile", "flexttb");
		}
		const badgediv = document.createElement("div");
		badgediv.classList.add("badges");
		(async () => {
			const badges = await this.getBadges();
			for (const badgejson of badges) {
				const badge = document.createElement(badgejson.link ? "a" : "div");
				badge.classList.add("badge");
				let src: string;
				if (URL.canParse(badgejson.icon)) {
					src = badgejson.icon;
				} else {
					src = `${this.info.cdn}/badge-icons/${badgejson.icon}.png`;
				}
				const img = createImg(src, undefined, badgediv);

				badge.append(img);
				let hovertxt: string;
				if (badgejson.translate) {
					hovertxt = I18n.getTranslation(`badge.${badgejson.description}`);
				} else {
					hovertxt = badgejson.description;
				}
				const hover = new Hover(hovertxt);
				hover.addEvent(badge);
				if (badgejson.link && badge instanceof HTMLAnchorElement) {
					badge.href = badgejson.link;
				}
				badgediv.append(badge);
			}
		})();
		const pfp = await this.buildstatuspfp(guild);
		div.appendChild(pfp);
		const userbody = document.createElement("div");
		userbody.classList.add("flexttb", "infosection");
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
		pronounshtml.textContent = this.pronouns || "";
		pronounshtml.classList.add("pronouns");
		userbody.appendChild(pronounshtml);

		membres.then((member) => {
			if (!member) return;
			if (member.pronouns && member.pronouns !== "") {
				pronounshtml.textContent = member.pronouns;
			}
		});

		const rule = document.createElement("hr");
		userbody.appendChild(rule);
		const biohtml = this.bio.makeHTML();
		userbody.appendChild(biohtml);

		membres.then((member) => {
			if (!member) return;
			if (member.bio && member.bio !== "") {
				//TODO make markdown take Guild
				userbody.insertBefore(new MarkDown(member.bio, this.localuser).makeHTML(), biohtml);
				biohtml.remove();
			}
		});

		if (guild) {
			membres.then((member) => {
				if (!member) return;
				usernamehtml.textContent = member.name;
				const roles = document.createElement("div");
				roles.classList.add("flexltr", "rolesbox");
				for (const role of member.roles) {
					if (role.id === member.guild.id) continue;
					const roleDiv = document.createElement("div");
					roleDiv.classList.add("rolediv");
					const color = document.createElement("div");
					roleDiv.append(color);
					color.style.setProperty("--role-color", `#${role.color.toString(16).padStart(6, "0")}`);
					color.classList.add("colorrolediv");
					const span = document.createElement("span");
					roleDiv.append(span);
					span.textContent = role.name;
					roles.append(roleDiv);
				}
				userbody.append(roles);
			});
		}
		if (x !== -1) {
			Contextmenu.currentmenu = div;
			document.body.appendChild(div);
			Contextmenu.keepOnScreen(div);
		}
		return div;
	}
	getBanner(guild: Guild | null | Member): HTMLImageElement {
		const banner = createImg(undefined);

		const bsrc = this.getBannerUrl();
		if (bsrc) {
			banner.setSrcs(bsrc);
			banner.classList.add("banner");
		}

		if (guild) {
			if (guild instanceof Member) {
				const bsrc = guild.getBannerUrl();
				if (bsrc) {
					banner.setSrcs(bsrc);
					banner.classList.add("banner");
				}
			} else {
				Member.resolveMember(this, guild).then((memb) => {
					if (!memb) return;
					const bsrc = memb.getBannerUrl();
					if (bsrc) {
						banner.setSrcs(bsrc);
						banner.classList.add("banner");
					}
				});
			}
		}
		return banner;
	}
	getBannerUrl(): string | undefined {
		if (this.banner) {
			if (!this.hypotheticalbanner) {
				return `${this.info.cdn}/avatars/${this.id.replace("#clone", "")}/${this.banner}.png`;
			}
				return this.banner;
		}
			return undefined;
	}
	profileclick(obj: HTMLElement, guild?: Guild): void {
		obj.onclick = (e: MouseEvent) => {
			this.buildprofile(e.clientX, e.clientY, guild);
			e.stopPropagation();
		};
	}
}

User.setUpContextMenu();
export {User};
