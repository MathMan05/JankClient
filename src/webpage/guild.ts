import {Channel} from "./channel.js";
import type {Localuser} from "./localuser.js";
import {Contextmenu} from "./contextmenu.js";
import {Role, RoleList} from "./role.js";
import {Member} from "./member.js";
import {Dialog, FormError, type Options, Settings} from "./settings.js";
import type {Permissions} from "./permissions.js";
import {SnowFlake} from "./snowflake.js";
import type {
	channeljson,
	guildjson,
	memberjson,
	invitejson,
	rolesjson,
	emojipjson,
	extendedProperties,
	banObj,
	templateSkim,
} from "./jsontypes.js";
import {User} from "./user.js";
import {I18n} from "./i18n.js";
import {Emoji} from "./emoji.js";
import {webhookMenu} from "./webhooks.js";
import {createImg} from "./utils/utils.js";
import {Sticker} from "./sticker.js";
import {ProgessiveDecodeJSON} from "./utils/progessiveLoad.js";
export async function makeInviteMenu(inviteMenu: Options, guild: Guild, url: string) {
	const invDiv = document.createElement("div");
	const bansp = ProgessiveDecodeJSON<invitejson[]>(url, {
		headers: guild.headers,
	});
	const createInviteHTML = (invite: invitejson) => {
		const div = document.createElement("div");
		div.classList.add("templateMiniBox");

		const edit = document.createElement("button");
		edit.textContent = I18n.edit();

		const code = document.createElement("span");
		code.textContent = invite.code;

		const used = document.createElement("span");
		used.textContent = I18n.invite.used(`${invite.uses}`);

		edit.onclick = () => {
			const opt = inviteMenu.addSubOptions(invite.code);
			const inviter = new User(invite.inviter, guild.localuser);

			opt.addMDText(
				`${window.location.origin}/invite/${invite.code}?${new URLSearchParams([["instance", guild.info.wellknown]])}`,
			);

			opt.addText(I18n.invite.used(`${invite.uses}`));
			if (invite.max_uses !== 0) opt.addText(I18n.invite.maxUses(`${invite.max_uses}`));

			const channel = guild.channels.find((_) => _.id === invite.channel_id);
			if (channel) {
				opt.addText(I18n.invite.forChannel(channel.name));
			}

			opt.addText(I18n.invite.createdAt(new Date(invite.created_at).toLocaleDateString(I18n.lang)));

			let expires = I18n.invite.never();
			if (invite.expires_at) {
				expires = new Date(invite.expires_at).toLocaleDateString(I18n.lang);
			}
			opt.addText(I18n.invite.expires(expires));

			opt.addText(I18n.webhooks.createdBy());
			opt.addHTMLArea(inviter.createWidget(guild));

			opt.addButtonInput("", I18n.delete(), async () => {
				if (
					(
						await fetch(`${guild.info.api}/invites/${invite.code}`, {
							method: "DELETE",
							headers: guild.headers,
						})
					).ok
				) {
					invsArr = invsArr.filter((_) => _ !== invite);
					inviteMenu.returnFromSub();
					loadPage(currentPage);
				}
			});
		};

		div.append(used, code, edit);
		return div;
	};
	let invsArr: invitejson[] = [];
	let onpage = 0;
	async function loadArr() {
		let invsArr2: invitejson[] = [];
		let waiting = false;
		async function addHTML() {
			if (waiting) return;
			waiting = true;
			await new Promise((res) => setTimeout(res, 0));
			waiting = false;
			invDiv.append(...invsArr2.map((inv) => createInviteHTML(inv)));
			invsArr2 = [];
		}
		while (!(await bansp).done) {
			const inv = await (await (await bansp).getNext()).getWhole();
			invsArr.push(inv);
			if (onpage < 50) {
				invsArr2.push(inv);
				addHTML();
				onpage++;
			} else {
				next.disabled = false;
			}
		}
	}
	let currentPage = 0;
	function loadPage(page = 0) {
		invDiv.innerHTML = "";
		for (onpage = 0; onpage < 50; onpage++) {
			const inv = invsArr[onpage + page * 50];
			if (!inv) break;
			invDiv.append(createInviteHTML(inv));
		}
		if (onpage === 50 && invsArr[onpage + page * 50]) {
			next.disabled = false;
		} else {
			next.disabled = true;
		}
	}

	const pageNav = document.createElement("div");
	const back = document.createElement("button");
	back.textContent = I18n.search.back();
	back.disabled = !currentPage;
	back.onclick = () => {
		back.disabled = !(currentPage - 1);
		next.disabled = false;
		loadPage(--currentPage);
	};

	const next = document.createElement("button");
	next.textContent = I18n.search.next();
	next.disabled = true;
	pageNav.append(back, next);
	inviteMenu.addHTMLArea(pageNav);
	next.onclick = () => {
		loadPage(++currentPage);
		back.disabled = false;
	};

	loadArr();
	loadPage(currentPage);
	inviteMenu.addHTMLArea(invDiv);
}
class Guild extends SnowFlake {
	owner!: Localuser;
	headers!: Localuser["headers"];
	channels!: Channel[];
	properties!: guildjson["properties"];
	member_count!: number;
	roles!: Role[];
	roleids!: Map<string, Role>;
	prevchannel: Channel | undefined;
	banner!: string;
	message_notifications!: number;
	headchannels!: Channel[];
	position!: number;
	parent_id!: string;
	member!: Member;
	html!: HTMLElement;
	emojis!: emojipjson[];
	large!: boolean;
	stickers!: Sticker[];
	members = new Set<Member>();
	static contextmenu = new Contextmenu<Guild, undefined>("guild menu");
	static setupcontextmenu() {
		Guild.contextmenu.addButton(
			() => I18n.getTranslation("guild.makeInvite"),
			function (this: Guild) {
				const d = new Dialog("");
				this.makeInviteMenu(d.options);
				d.show();
			},
			{
				enabled: function () {
					return this.member.hasPermission("CREATE_INSTANT_INVITE");
				},
				color: "blue",
			},
		);
		Guild.contextmenu.addSeperator();

		Guild.contextmenu.addButton(
			() => I18n.getTranslation("guild.markRead"),
			function (this: Guild) {
				this.markAsRead();
			},
		);

		Guild.contextmenu.addButton(
			() => I18n.getTranslation("guild.notifications"),
			function (this: Guild) {
				this.setnotifcation();
			},
		);
		Guild.contextmenu.addSeperator();
		Guild.contextmenu.addButton(
			() => I18n.getTranslation("user.editServerProfile"),
			function () {
				this.member.showEditProfile();
			},
		);
		Guild.contextmenu.addSeperator();

		Guild.contextmenu.addButton(
			() => I18n.getTranslation("guild.leave"),
			function (this: Guild) {
				this.confirmleave();
			},
			{
				visable: function (_) {
					return this.properties.owner_id !== this.member.user.id;
				},
				color: "red",
			},
		);

		Guild.contextmenu.addButton(
			() => I18n.getTranslation("guild.delete"),
			function (this: Guild) {
				this.confirmDelete();
			},
			{
				visable: function (_) {
					return this.properties.owner_id === this.member.user.id;
				},
				color: "red",
				icon: {
					css: "svg-delete",
				},
			},
		);

		Guild.contextmenu.addButton(
			() => I18n.getTranslation("guild.settings"),
			function (this: Guild) {
				this.generateSettings();
			},
			{
				visable: function () {
					return this.member.hasPermission("MANAGE_GUILD");
				},
				icon: {
					css: "svg-settings",
				},
			},
		);

		Guild.contextmenu.addSeperator();
		Guild.contextmenu.addButton(
			() => I18n.getTranslation("guild.copyId"),
			function (this: Guild) {
				navigator.clipboard.writeText(this.id);
			},
		);
		//TODO mute guild button
	}
	generateSettings() {
		const settings = new Settings(I18n.getTranslation("guild.settingsFor", this.properties.name));
		const textChannels = this.channels.filter((e) => {
			//TODO there are almost certainly more types. is Voice valid?
			return new Set([0, 5]).has(e.type);
		});
		{
			const overview = settings.addButton(I18n.getTranslation("guild.overview"));
			const form = overview.addForm("", (_) => {}, {
				headers: this.headers,
				traditionalSubmit: true,
				fetchURL: `${this.info.api}/guilds/${this.id}`,
				method: "PATCH",
			});
			form.addTextInput(I18n.getTranslation("guild.name:"), "name", {
				initText: this.properties.name,
			});

			form.addFileInput(I18n.getTranslation("guild.banner:"), "banner", {clear: true});
			form.addFileInput(I18n.getTranslation("guild.icon:"), "icon", {clear: true});

			form.addHR();

			console.log(textChannels, this.channels);
			const options = ["DISCOVERABLE", "COMMUNITY", "INVITES_DISABLED"] as const;
			const defaultIndex = options.findIndex((_) => this.properties.features.includes(_));
			form.addSelect(
				I18n.guild.howJoin(),
				"features",
				options.map((_) => I18n.guild[_]()),
				{
					defaultIndex: defaultIndex === -1 ? 2 : defaultIndex,
				},
				options,
			);

			form.addCheckboxInput(I18n.getTranslation("guild.sendrandomwelcome?"), "s1", {
				initState: !(this.properties.system_channel_flags & 1),
			});
			form.addCheckboxInput(I18n.getTranslation("guild.stickWelcomeReact?"), "s4", {
				initState: !(this.properties.system_channel_flags & 8),
			});
			form.addCheckboxInput(I18n.getTranslation("guild.boostMessage?"), "s2", {
				initState: !(this.properties.system_channel_flags & 2),
			});
			form.addCheckboxInput(I18n.getTranslation("guild.helpTips?"), "s3", {
				initState: !(this.properties.system_channel_flags & 4),
			});
			form.addPreprocessor((e: any) => {
				let bits = 0;
				bits += (1 - e.s1) * 1;
				e.s1 = undefined;
				bits += (1 - e.s2) * 2;
				e.s2 = undefined;
				bits += (1 - e.s3) * 4;
				e.s3 = undefined;
				bits += (1 - e.s4) * 8;
				e.s4 = undefined;
				e.system_channel_flags = bits;
				let temp = this.properties.features;
				console.log([...temp]);
				//@ts-ignore
				temp = temp.filter((_) => !options.includes(_));
				temp.push(e.features);
				if (e.features === "DISCOVERABLE") {
					temp.push("COMMUNITY");
				}
				if (temp.includes("COMMUNITY")) {
					if (!com) {
						this.addCommunity(settings, textChannels);
						com = true;
					}
				}
				e.features = temp;
			});

			form.addHR();
			form.addSelect(
				I18n.getTranslation("guild.defaultNoti"),
				"default_message_notifications",
				[I18n.getTranslation("guild.onlyMentions"), I18n.getTranslation("guild.all")],
				{
					defaultIndex: [1, 0].indexOf(this.properties.default_message_notifications),
					radio: true,
				},
				[1, 0],
			);
			form.addHR();
			let region = this.properties.region;
			if (!region) {
				region = "";
			}
			form.addTextInput(I18n.getTranslation("guild.region:"), "region", {initText: region});
		}
		this.makeInviteMenu(
			settings.addButton(I18n.getTranslation("invite.inviteMaker")),
			textChannels,
		);
		const s1 = settings.addButton(I18n.getTranslation("guild.roles"));
		const permlist: [Role, Permissions][] = [];
		for (const thing of this.roles) {
			permlist.push([thing, thing.permissions]);
		}
		s1.options.push(new RoleList(permlist, this, this.updateRolePermissions.bind(this), false));
		{
			const emoji = settings.addButton(I18n.getTranslation("emoji.title"));
			emoji.addButtonInput("", I18n.getTranslation("emoji.upload"), () => {
				const popup = new Dialog(I18n.getTranslation("emoji.upload"));
				const form = popup.options.addForm(
					"",
					() => {
						popup.hide();
					},
					{
						fetchURL: `${this.info.api}/guilds/${this.id}/emojis`,
						method: "POST",
						headers: this.headers,
					},
				);
				form.addFileInput(I18n.getTranslation("emoji.image:"), "image", {required: true});
				form.addTextInput(I18n.getTranslation("emoji.name:"), "name", {required: true});
				popup.show();
			});
			const containdiv = document.createElement("div");
			const genDiv = () => {
				containdiv.innerHTML = "";
				for (const emoji of this.emojis) {
					const div = document.createElement("div");
					div.classList.add("flexltr", "emojiOption");
					const emojic = new Emoji(emoji, this);

					const text = document.createElement("input");
					text.type = "text";
					text.value = emoji.name;
					text.addEventListener("change", () => {
						fetch(`${this.info.api}/guilds/${this.id}/emojis/${emoji.id}`, {
							method: "PATCH",
							headers: this.headers,
							body: JSON.stringify({name: text.value}),
						}).then((e) => {
							if (!e.ok) text.value = emoji.name;
						}); //if not ok, undo
					});

					const del = document.createElement("span");
					del.classList.add("svgicon", "svg-x", "deleteEmoji");
					del.onclick = () => {
						const diaolog = new Dialog("");
						diaolog.options.addTitle(I18n.getTranslation("emoji.confirmDel"));
						const options = diaolog.options.addOptions("", {ltr: true});
						options.addButtonInput("", I18n.getTranslation("yes"), () => {
							fetch(`${this.info.api}/guilds/${this.id}/emojis/${emoji.id}`, {
								method: "DELETE",
								headers: this.headers,
							});
							diaolog.hide();
						});
						options.addButtonInput("", I18n.getTranslation("no"), () => {
							diaolog.hide();
						});
						diaolog.show();
					};

					div.append(emojic.getHTML(true), ":", text, ":", del);

					containdiv.append(div);
				}
			};
			this.onEmojiUpdate = () => {
				if (!document.body.contains(containdiv)) {
					this.onEmojiUpdate = () => {};
					return;
				}
				genDiv();
			};
			genDiv();
			emoji.addHTMLArea(containdiv);
		}
		{
			const emoji = settings.addButton(I18n.sticker.title());
			emoji.addButtonInput("", I18n.sticker.upload(), () => {
				const popup = new Dialog(I18n.sticker.upload());
				const form = popup.options.addForm("", async () => {
					const body = new FormData();
					body.set("name", name.value);
					if (!filei.value) throw new FormError(filei, I18n.sticker.errFileMust());
					const file = filei.value.item(0);
					if (!file) throw new FormError(filei, I18n.sticker.errFileMust());
					body.set("file", file);
					if (!tags.value) throw new FormError(tags, I18n.sticker.errEmjMust());
					if (tags.value.id) {
						body.set("tags", tags.value.id);
					} else if (tags.value.emoji) {
						body.set("tags", tags.value.emoji);
					} else {
						throw new FormError(tags, I18n.sticker.errEmjMust());
					}
					const res = await fetch(`${this.info.api}/guilds/${this.id}/stickers`, {
						method: "POST",
						headers: {
							Authorization: this.headers.Authorization,
						},
						body,
					});
					if (res.ok) {
						popup.hide();
					} else {
						const json = await res.json();
						if ("message" in json && typeof json.message === "string") {
							throw new FormError(filei, json.message);
						}
					}
				});
				const filei = form.addFileInput(I18n.sticker.image(), "file", {required: true});
				const name = form.addTextInput(I18n.sticker.name(), "name", {required: true});
				const tags = form.addEmojiInput(I18n.sticker.tags(), "tags", this.localuser, {
					required: true,
				});
				popup.show();
			});
			const containdiv = document.createElement("div");
			containdiv.classList.add("stickersDiv");
			const genDiv = () => {
				containdiv.innerHTML = "";
				for (const sticker of this.stickers) {
					const div = document.createElement("div");
					div.classList.add("flexttb", "stickerOption");

					const text = document.createElement("span");
					text.textContent = sticker.name;

					div.onclick = () => {
						const form = emoji.addSubForm(emoji.name, () => {}, {
							fetchURL: `${this.info.api}/guilds/${this.id}/stickers/${sticker.id}`,
							method: "PATCH",
							headers: this.headers,
							traditionalSubmit: true,
						});

						form.addHTMLArea(sticker.getHTML());
						form.addTextInput(I18n.sticker.name(), "name", {
							initText: sticker.name,
						});

						form.addMDInput(I18n.sticker.desc(), "description", {
							initText: sticker.description,
						});

						const initEmoji = Emoji.getEmojiFromIDOrString(sticker.tags, this.localuser);
						form.addEmojiInput(I18n.sticker.tags(), "tags", this.localuser, {
							initEmoji,
							required: false,
						});

						form.addButtonInput("", I18n.sticker.del(), () => {
							const diaolog = new Dialog("");
							diaolog.options.addTitle(I18n.sticker.confirmDel());
							const options = diaolog.options.addOptions("", {ltr: true});
							options.addButtonInput("", I18n.yes(), () => {
								fetch(`${this.info.api}/guilds/${this.id}/stickers/${sticker.id}`, {
									method: "DELETE",
									headers: this.headers,
								});
								diaolog.hide();
							});
							options.addButtonInput("", I18n.no(), () => {
								diaolog.hide();
							});
							diaolog.show();
						});
					};

					div.append(sticker.getHTML(), text);

					containdiv.append(div);
				}
			};
			this.onStickerUpdate = () => {
				emoji.returnFromSub();
				if (!document.body.contains(containdiv)) {
					this.onStickerUpdate = () => {};
					return;
				}
				genDiv();
			};
			genDiv();
			emoji.addHTMLArea(containdiv);
		}
		const inviteMenu = settings.addButton(I18n.guild.invites());
		makeInviteMenu(inviteMenu, this, `${this.info.api}/guilds/${this.id}/invites`);

		const banMenu = settings.addButton(I18n.guild.bans());
		const makeBanMenu = () => {
			const banDiv = document.createElement("div");
			const bansp = ProgessiveDecodeJSON<banObj[]>(`${this.info.api}/guilds/${this.id}/bans`, {
				headers: this.headers,
			});
			const createBanHTML = (ban: banObj) => {
				const div = document.createElement("div");
				div.classList.add("flexltr", "bandiv");
				let src: string;
				if (ban.user.avatar !== null) {
					src = `${this.info.cdn}/avatars/${ban.user.id}/${ban.user.avatar}.png`;
				} else {
					const int = Number((BigInt(ban.user.id) >> 22n) % 6n);
					src = `${this.info.cdn}/embed/avatars/${int}.png`;
				}
				const img = createImg(src);
				img.classList.add("pfp");
				const divUserRes = document.createElement("div");
				divUserRes.classList.add("flexttb");

				const username = document.createElement("span");
				username.textContent = ban.user.username;

				divUserRes.append(username);
				if (ban.reason) {
					const reason = document.createElement("span");
					reason.innerText = ban.reason;
					divUserRes.append(I18n.guild.banReason(ban.reason));
				}
				div.append(img, divUserRes);
				div.onclick = async (_) => {
					const opt = banMenu.addSubOptions(ban.user.username);

					opt.addHTMLArea(img.cloneNode(true) as HTMLElement);
					opt.addText(ban.user.username);
					if (ban.reason) opt.addText(I18n.guild.banReason(ban.reason));
					//FIXME the API sends back the wrong response, so I don't have this info
					/*
					const moreInfo = (await (
						await fetch(this.info.api + "/guilds/" + this.id + "/bans/" + ban.user.id, {
							headers: this.headers,
						})
					).json()) as addInfoBan;
					const userWhoBanned = await User.resolve(moreInfo.executor_id, this.localuser);
					opt.addHTMLArea(userWhoBanned.createWidget(this));
					//*/
					opt.addButtonInput("", I18n.user.unban(ban.user.username), async () => {
						bansArr = bansArr.filter((_) => _ !== ban);

						await fetch(`${this.info.api}/guilds/${this.id}/bans/${ban.user.id}`, {
							headers: this.headers,
							method: "DELETE",
						});
						loadPage(currentPage);
						banMenu.returnFromSub();
					});
				};
				return div;
			};
			let bansArr: banObj[] = [];
			let onpage = 0;
			async function loadArr() {
				let bansArr2: banObj[] = [];
				let waiting = false;
				async function addHTML() {
					if (waiting) return;
					waiting = true;
					await new Promise((res) => setTimeout(res, 0));
					waiting = false;
					banDiv.append(...bansArr2.map((ban) => createBanHTML(ban)));
					bansArr2 = [];
				}
				while (!(await bansp).done) {
					const ban = await (await (await bansp).getNext()).getWhole();
					bansArr.push(ban);
					if (onpage < 50) {
						bansArr2.push(ban);
						addHTML();
						onpage++;
					} else {
						next.disabled = false;
					}
				}
			}
			let currentPage = 0;
			function loadPage(page = 0) {
				banDiv.innerHTML = "";
				for (onpage = 0; onpage < 50; onpage++) {
					const ban = bansArr[onpage + page * 50];
					if (!ban) break;
					banDiv.append(createBanHTML(ban));
				}
				if (onpage === 50 && bansArr[onpage + page * 50]) {
					next.disabled = false;
				} else {
					next.disabled = true;
				}
			}

			const pageNav = document.createElement("div");
			const back = document.createElement("button");
			back.textContent = I18n.search.back();
			back.disabled = !currentPage;
			back.onclick = () => {
				back.disabled = !(currentPage - 1);
				next.disabled = false;
				loadPage(--currentPage);
			};

			const next = document.createElement("button");
			next.textContent = I18n.search.next();
			next.disabled = true;
			pageNav.append(back, next);
			banMenu.addHTMLArea(pageNav);
			next.onclick = () => {
				loadPage(++currentPage);
				back.disabled = false;
			};

			loadArr();
			loadPage(currentPage);
			return banDiv;
		};
		banMenu.addHTMLArea(makeBanMenu);
		const widgetMenu = settings.addButton(I18n.widget());
		(async () => {
			const cur = (await (
				await fetch(`${this.info.api}/guilds/${this.id}/widget`, {
					headers: this.headers,
				})
			).json()) as {
				enabled: boolean;
				channel_id?: null | string;
			};
			const form = widgetMenu.addForm("", () => {}, {
				traditionalSubmit: true,
				fetchURL: `${this.info.api}/guilds/${this.id}/widget`,
				headers: this.headers,
				method: "PATCH",
			});
			form.addCheckboxInput(I18n.widgetEnabled(), "enabled", {initState: cur.enabled});
			const channels = this.channels.filter((_) => _.type !== 4);
			form.addSelect(
				I18n.channel.name(),
				"channel_id",
				channels.map((_) => _.name),
				{
					defaultIndex: channels.findIndex((_) => _.id === cur.channel_id),
				},
				channels.map((_) => _.id),
			);
		})();
		const webhooks = settings.addButton(I18n.webhooks.base());
		webhookMenu(this, `${this.info.api}/guilds/${this.id}/webhooks`, webhooks);
		const template = settings.addButton(I18n.guild.templates());
		(async () => {
			template.addText(I18n.guild.templcateMetaDesc());
			const generateTemplateArea = (temp: templateSkim) => {
				const div = document.createElement("div");
				div.classList.add("flexltr", "templateMiniBox");
				const code = document.createElement("span");

				code.textContent = `${temp.code} (${temp.name})`;

				const edit = document.createElement("button");
				edit.textContent = I18n.edit();
				edit.onclick = () => {
					const form = template.addSubForm(
						I18n.guild.editingTemplate(temp.name),
						(tempy) => {
							const template = tempy as templateSkim;
							temp.name = template.name;
							temp.description = template.description;
						},
						{
							fetchURL: `${this.info.api}/guilds/${this.id}/templates/${temp.code}`,
							method: "PATCH",
							headers: this.headers,
						},
					);
					const search = new URLSearchParams([["instance", this.info.wellknown]]);
					form.addMDText(
						I18n.guild.templateURL(
							`${window.location.origin}/template/${temp.code}?${search}`,
						),
					);

					const name = form.addTextInput(I18n.guild.templateName(), "name", {
						initText: temp.name,
					});
					form.addMDInput(I18n.guild.templateDesc(), "description", {
						initText: temp.description,
					});
					User.resolve(temp.creator_id, this.localuser).then((_) => {
						form.addText(I18n.guild.tempCreatedBy());
						form.addHTMLArea(_.createWidget(this));
					});
					form.addText(I18n.guild.tempUseCount(`${temp.usage_count || 0}`));
					form.addPreprocessor(() => {
						if (name.value.length < 2) {
							throw new FormError(name, I18n.guild.templateNameShort());
						}
					});
				};

				div.append(code, edit);
				template.addHTMLArea(div);
			};
			template.addButtonInput("", I18n.guild.createNewTemplate(), () => {
				const form = template.addSubForm(
					I18n.guild.createNewTemplate(),
					(code) => {
						template.returnFromSub();
						generateTemplateArea(code as templateSkim);
					},
					{
						fetchURL: `${this.info.api}/guilds/${this.id}/templates`,
						method: "POST",
						headers: this.headers,
					},
				);
				form.addText(I18n.guild.templcateMetaDesc());
				const name = form.addTextInput(I18n.guild.templateName(), "name");
				form.addMDInput(I18n.guild.templateDesc(), "description");
				form.addPreprocessor(() => {
					if (name.value.length < 2) {
						throw new FormError(name, I18n.guild.templateNameShort());
					}
				});
			});
			const templates = (await (
				await fetch(`${this.info.api}/guilds/${this.id}/templates`, {headers: this.headers})
			).json()) as templateSkim[];
			for (const temp of templates.reverse()) {
				generateTemplateArea(temp);
			}
		})();
		let com = false;
		if (this.properties.features.includes("COMMUNITY")) {
			this.addCommunity(settings, textChannels);
			com = true;
		}
		settings.show();
	}
	onStickerUpdate = (_stickers: Sticker[]) => {};
	addCommunity(settings: Settings, textChannels: Channel[]) {
		const com = settings.addButton(I18n.guild.community()).addForm("", () => {}, {
			fetchURL: `${this.info.api}/guilds/${this.id}`,
			method: "PATCH",
			headers: this.headers,
			traditionalSubmit: true,
		});
			com.addMDInput(I18n.getTranslation("guild.description:"), "description", {
				initText: this.properties.description,
			});
		{
			let defaultIndex = textChannels.findIndex((_) => this.properties.rules_channel_id === _.id);
			if (defaultIndex === -1) {
				defaultIndex = textChannels.length;
			}
			com.addSelect(
				I18n.guild.ruleId(),
				"rules_channel_id",
				[...textChannels.map((_) => _.name), "none"],
				{
					defaultIndex,
				},
				[...textChannels.map((_) => _.id), undefined],
			);
		}
		{
			const sysmap = [null, ...textChannels.map((e) => e.id)];
			com.addSelect(
				I18n.getTranslation("guild.systemSelect:"),
				"system_channel_id",
				["No system messages", ...textChannels.map((e) => e.name)],
				{defaultIndex: sysmap.indexOf(this.properties.system_channel_id)},
				sysmap,
			);
		}
	}
	makeInviteMenu(options: Options, valid: undefined | Channel[]) {
		if (!valid) {
			valid = this.channels.filter((e) => {
				//TODO there are almost certainly more types. is Voice valid?
				return new Set([0, 5]).has(e.type);
			});
		}
		let channel = valid[0];
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
		copycontainer.onclick = (_) => {
			if (text.textContent) {
				navigator.clipboard.writeText(text.textContent);
			}
		};
		div.append(copycontainer);
		const update = () => {
			fetch(`${this.info.api}/channels/${channel.id}/invites`, {
				method: "POST",
				headers: this.headers,
				body: JSON.stringify({
					flags: 0,
					target_type: null,
					target_user_id: null,
					max_age: `${expires}`,
					max_uses: uses,
					temporary: uses !== 0,
				}),
			})
				.then((_) => _.json())
				.then((json) => {
					const params = new URLSearchParams("");
					params.set("instance", this.info.wellknown);
					const encoded = params.toString();
					text.textContent = `${location.origin}/invite/${json.code}?${encoded}`;
				});
		};

		options.addTitle(I18n.getTranslation("inviteOptions.title"));
		const text2 = options.addText("");
		options
			.addSelect(
				I18n.getTranslation("invite.channel:"),
				() => {},
				valid.map((e) => e.name),
			)
			.watchForChange((e) => {
				channel = valid[e];
				text2.setText(I18n.getTranslation("invite.subtext", channel.name, this.properties.name));
			});

		options.addSelect(
			I18n.getTranslation("invite.expireAfter"),
			() => {},
			["30m", "1h", "6h", "12h", "1d", "7d", "30d", "never"].map((e) =>
				I18n.getTranslation(`inviteOptions.${e}`),
			),
		).onchange = (e) => {
			expires = [1800, 3600, 21600, 43200, 86400, 604800, 2592000, 0][e];
		};

		const timeOptions = ["1", "5", "10", "25", "50", "100"].map((e) =>
			I18n.getTranslation("inviteOptions.limit", e),
		);
		timeOptions.unshift(I18n.getTranslation("inviteOptions.noLimit"));
		options.addSelect(I18n.getTranslation("invite.expireAfter"), () => {}, timeOptions).onchange = (
			e,
		) => {
			uses = [0, 1, 5, 10, 25, 50, 100][e];
		};

		options.addButtonInput("", I18n.getTranslation("invite.createInvite"), () => {
			update();
		});

		options.addHTMLArea(div);
	}
	roleUpdate: (role: Role, added: -1 | 0 | 1) => unknown = () => {};
	sortRoles() {
		this.roles.sort((a, b) => b.position - a.position);
	}
	async recalcRoles() {
		let position = this.roles.length;
		const map = this.roles.map((_) => {
			position--;
			return {id: _.id, position};
		});
		await fetch(`${this.info.api}/guilds/${this.id}/roles`, {
			method: "PATCH",
			body: JSON.stringify(map),
			headers: this.headers,
		});
	}
	newRole(rolej: rolesjson) {
		const role = new Role(rolej, this);
		this.roles.push(role);
		this.roleids.set(role.id, role);
		this.sortRoles();
		this.roleUpdate(role, 1);
	}
	updateRole(rolej: rolesjson) {
		const role = this.roleids.get(rolej.id) as Role;
		role.newJson(rolej);
		this.roleUpdate(role, 0);
	}
	memberupdate(json: memberjson) {
		let member: undefined | Member = undefined;
		for (const thing of this.members) {
			if (thing.id === json.id) {
				member = thing;
				break;
			}
		}

		if (!member) return;
		member.update(json);
		if (member === this.member) {
			console.log(member);
			this.loadGuild();
		}
	}
	deleteRole(id: string) {
		const role = this.roleids.get(id);
		if (!role) return;
		this.roleids.delete(id);
		this.roles.splice(this.roles.indexOf(role), 1);
		this.roleUpdate(role, -1);
	}
	onEmojiUpdate = (_: emojipjson[]) => {};
	update(json: extendedProperties) {
		this.large = json.large;
		this.member_count = json.member_count;
		this.emojis = json.emojis || [];
		this.headers = this.owner.headers;
		this.properties.features = json.features;
		if (this.properties.icon !== json.icon) {
			this.properties.icon = json.icon;
			if (this.HTMLicon) {
				const divy = this.generateGuildIcon();
				this.HTMLicon.replaceWith(divy);
				this.HTMLicon = divy;
			}
		}
		this.roleids = new Map();
		this.banner = json.banner;
	}
	constructor(json: guildjson | -1, owner: Localuser, member: memberjson | User | null) {
		if (json === -1 || member === null) {
			super("@me");
			return;
		}
		if (json.stickers.length) {
			console.log(json.stickers, ":3");
		}
		super(json.id);
		this.owner = owner;
		this.large = json.large;
		this.member_count = json.member_count;
		this.emojis = json.emojis || [];
		this.headers = this.owner.headers;
		this.channels = [];
		if (json.properties) {
			this.properties = json.properties;
		}
		this.roles = [];
		this.roleids = new Map();
		this.banner = json.properties.banner;
		if (json.roles) {
			for (const roley of json.roles) {
				const roleh = new Role(roley, this);
				this.roles.push(roleh);
				this.roleids.set(roleh.id, roleh);
			}
		}

		this.message_notifications = 0;

		this.sortRoles();
		if (member instanceof User) {
			console.warn(member);
			Member.resolveMember(member, this).then((_) => {
				if (_) {
					this.member = _;
				} else {
					console.error("Member was unable to resolve");
				}
			});
		} else {
			Member.new(member, this).then((_) => {
				if (_) {
					this.member = _;
				}
			});
		}

		this.perminfo ??= {channels: {}};
		for (const thing of json.channels) {
			const temp = new Channel(thing, this);
			this.channels.push(temp);
			this.localuser.channelids.set(temp.id, temp);
		}
		this.headchannels = [];
		for (const thing of this.channels) {
			const parent = thing.resolveparent(this);
			if (!parent) {
				this.headchannels.push(thing);
			}
		}
		this.prevchannel = this.localuser.channelids.get(this.perminfo.prevchannel);
		this.stickers = json.stickers.map((_) => new Sticker(_, this)) || [];
	}
	get perminfo() {
		return this.localuser.perminfo.guilds[this.id];
	}
	set perminfo(e) {
		this.localuser.perminfo.guilds[this.id] = e;
	}
	notisetting(settings: {
		channel_overrides: {
			message_notifications: number;
			muted: boolean;
			mute_config: {selected_time_window: number; end_time: number};
			channel_id: string;
		}[];
		message_notifications: any;
		flags?: number;
		hide_muted_channels?: boolean;
		mobile_push?: boolean;
		mute_config?: null;
		mute_scheduled_events?: boolean;
		muted?: boolean;
		notify_highlights?: number;
		suppress_everyone?: boolean;
		suppress_roles?: boolean;
		version?: number;
		guild_id?: string;
	}) {
		this.message_notifications = settings.message_notifications;
		for (const override of settings.channel_overrides) {
			const channel = this.localuser.channelids.get(override.channel_id);
			if (!channel) continue;
			channel.handleUserOverrides(override);
		}
	}
	setnotifcation() {
		const options = ["all", "onlyMentions", "none"].map((e) => I18n.getTranslation(`guild.${e}`));
		const notiselect = new Dialog("");
		const form = notiselect.options.addForm(
			"",
			(_, sent: any) => {
				notiselect.hide();
				this.message_notifications = sent.message_notifications;
			},
			{
				fetchURL: `${this.info.api}/users/@me/guilds/${this.id}/settings/`,
				method: "PATCH",
				headers: this.headers,
			},
		);
		form.addSelect(
			I18n.getTranslation("guild.selectnoti"),
			"message_notifications",
			options,
			{
				radio: true,
				defaultIndex: this.message_notifications,
			},
			[0, 1, 2],
		);
		notiselect.show();
	}
	confirmleave() {
		const full = new Dialog("");
		full.options.addTitle(I18n.getTranslation("guild.confirmLeave"));
		const options = full.options.addOptions("", {ltr: true});
		options.addButtonInput("", I18n.getTranslation("guild.yesLeave"), () => {
			this.leave().then((_) => {
				full.hide();
			});
		});
		options.addButtonInput("", I18n.getTranslation("guild.noLeave"), () => {
			full.hide();
		});
		full.show();
	}
	async leave() {
		return fetch(`${this.info.api}/users/@me/guilds/${this.id}`, {
			method: "DELETE",
			headers: this.headers,
		});
	}
	printServers() {
		let build = "";
		for (const thing of this.headchannels) {
			build += `${thing.name}:${thing.position}\n`;
			for (const thingy of thing.children) {
				build += `   ${thingy.name}:${thingy.position}\n`;
			}
		}
		console.log(build);
	}
	calculateReorder() {
		let position = -1;
		const build: {
			id: string;
			position: number | undefined;
			parent_id: string | undefined;
		}[] = [];
		for (const thing of this.headchannels) {
			const thisthing: {
				id: string;
				position: number | undefined;
				parent_id: string | undefined;
			} = {id: thing.id, position: undefined, parent_id: undefined};
			if (thing.position <= position) {
				thing.position = thisthing.position = position + 1;
			}
			position = thing.position;
			console.log(position);
			if (thing.move_id && thing.move_id !== thing.parent_id) {
				thing.parent_id = thing.move_id;
				thisthing.parent_id = thing.parent?.id;
				thing.move_id = undefined;
			}
			if (thisthing.position || thisthing.parent_id) {
				build.push(thisthing);
			}
			if (thing.children.length > 0) {
				const things = thing.calculateReorder();
				for (const thing of things) {
					build.push(thing);
				}
			}
		}
		console.log(build);
		this.printServers();
		if (build.length === 0) {
			return;
		}
		const serverbug = false;
		if (serverbug) {
			for (const thing of build) {
				console.log(build, thing);
				fetch(`${this.info.api}/guilds/${this.id}/channels`, {
					method: "PATCH",
					headers: this.headers,
					body: JSON.stringify([thing]),
				});
			}
		} else {
			fetch(`${this.info.api}/guilds/${this.id}/channels`, {
				method: "PATCH",
				headers: this.headers,
				body: JSON.stringify(build),
			});
		}
	}
	get localuser() {
		return this.owner;
	}
	get info() {
		return this.owner.info;
	}
	sortchannels() {
		this.headchannels.sort((a, b) => {
			return a.position - b.position;
		});
	}
	HTMLicon?: HTMLElement;
	static generateGuildIcon(guild: Guild | (invitejson["guild"] & {info: {cdn: string}})) {
		const divy = document.createElement("div");
		divy.classList.add("servernoti");

		const noti = document.createElement("div");
		noti.classList.add("unread");
		divy.append(noti);
		if (guild instanceof Guild) {
			guild.localuser.guildhtml.set(guild.id, divy);
			guild.html = divy;
		}
		let icon: string | null;
		if (guild instanceof Guild) {
			icon = guild.properties.icon;
		} else {
			icon = guild.icon;
		}
		if (icon !== null) {
			const img = createImg(`${guild.info.cdn}/icons/${guild.id}/${icon}.png`);
			img.classList.add("pfp", "servericon");
			divy.appendChild(img);
			if (guild instanceof Guild) {
				img.onclick = () => {
					console.log(guild.loadGuild);
					guild.loadGuild();
					guild.loadChannel();
				};
				Guild.contextmenu.bindContextmenu(img, guild, undefined);
			}
		} else {
			const div = document.createElement("div");
			let name: string;
			if (guild instanceof Guild) {
				name = guild.properties.name;
			} else {
				name = guild.name;
			}
			const build = name
				.replace(/'s /g, " ")
				.replace(/\w+/g, (word) => word[0])
				.replace(/\s/g, "");
			div.textContent = build;
			div.classList.add("blankserver", "servericon");
			divy.appendChild(div);
			if (guild instanceof Guild) {
				div.onclick = () => {
					guild.loadGuild();
					guild.loadChannel();
				};
				Guild.contextmenu.bindContextmenu(div, guild, undefined);
			}
		}
		return divy;
	}
	generateGuildIcon() {
		return Guild.generateGuildIcon(this);
	}
	confirmDelete() {
		let confirmname = "";

		const full = new Dialog("");
		full.options.addTitle(I18n.getTranslation("guild.confirmDelete", this.properties.name));
		full.options.addTextInput(I18n.getTranslation("guild.serverName"), () => {}).onchange = (e) =>
			(confirmname = e);

		const options = full.options.addOptions("", {ltr: true});
		options.addButtonInput("", I18n.getTranslation("guild.yesDelete"), () => {
			if (confirmname !== this.properties.name) {
				//TODO maybe some sort of form error? idk
				alert("names don't match");
				return;
			}
			this.delete().then((_) => {
				full.hide();
			});
		});

		options.addButtonInput("", I18n.getTranslation("guild.noDelete"), () => {
			full.hide();
		});
		full.show();
	}
	async delete() {
		return fetch(`${this.info.api}/guilds/${this.id}/delete`, {
			method: "POST",
			headers: this.headers,
		});
	}
	get mentions() {
		let mentions = 0;
		for (const thing of this.channels) {
			mentions += thing.mentions;
		}
		return mentions;
	}
	unreads(html?: HTMLElement | undefined) {
		if (html) {
			this.html = html;
		} else {
			html = this.html;
		}
		if (!html) {
			return;
		}
		let read = true;
		const mentions = this.mentions;
		for (const thing of this.channels) {
			if (thing.hasunreads) {
				read = false;
				break;
			}
		}
		const noti = html.children[0];
		if (mentions !== 0) {
			noti.classList.add("pinged");
			noti.textContent = `${mentions}`;
		} else {
			noti.textContent = "";
			noti.classList.remove("pinged");
		}
		if (read) {
			noti.classList.remove("notiunread");
		} else {
			noti.classList.add("notiunread");
		}
	}
	getHTML() {
		const sideContainDiv = document.getElementById("sideContainDiv");
		if (sideContainDiv) {
			sideContainDiv.classList.remove("searchDiv");
			sideContainDiv.classList.remove("hideSearchDiv");
		}
		const searchBox = document.getElementById("searchBox");
		if (searchBox) searchBox.textContent = "";

		//this.printServers();
		this.sortchannels();
		this.printServers();
		const build = document.createElement("div");

		for (const thing of this.headchannels) {
			build.appendChild(thing.createguildHTML(this.isAdmin()));
		}
		return build;
	}
	isAdmin() {
		return this.member.isAdmin();
	}
	async markAsRead() {
		const build: {
			read_states: {
				channel_id: string;
				message_id: string | null | undefined;
				read_state_type: number;
			}[];
		} = {read_states: []};
		for (const thing of this.channels) {
			if (thing.hasunreads) {
				build.read_states.push({
					channel_id: thing.id,
					message_id: thing.lastmessageid,
					read_state_type: 0,
				});
				thing.lastreadmessageid = thing.lastmessageid;
				if (!thing.myhtml) continue;
				thing.myhtml.classList.remove("cunread");
			}
		}
		this.unreads();
		fetch(`${this.info.api}/read-states/ack-bulk`, {
			method: "POST",
			headers: this.headers,
			body: JSON.stringify(build),
		});
	}
	hasRole(r: Role | string) {
		console.log("this should run");
		if (r instanceof Role) {
			r = r.id;
		}
		return this.member.hasRole(r);
	}
	loadChannel(ID?: string | undefined | null, addstate = true) {
		if (ID) {
			const channel = this.localuser.channelids.get(ID);
			if (channel) {
				channel.getHTML(addstate);
				return;
			}
		}
		if (this.prevchannel && ID !== null) {
			console.log(this.prevchannel);
			this.prevchannel.getHTML(addstate);
			return;
		}
		if (this.id !== "@me") {
			for (const thing of this.channels) {
				if (thing.type !== 4) {
					thing.getHTML(addstate);
					return;
				}
			}
		}
		this.removePrevChannel();
		this.noChannel(addstate);
	}
	removePrevChannel() {
		if (this.localuser.channelfocus) {
			this.localuser.channelfocus.infinite.delete();
		}
		if (this !== this.localuser.lookingguild) {
			this.loadGuild();
		}
		if (this.localuser.channelfocus?.myhtml) {
			this.localuser.channelfocus.myhtml.classList.remove("viewChannel");
		}
		this.prevchannel = undefined;
		this.localuser.channelfocus = undefined;
		const replybox = document.getElementById("replybox") as HTMLElement;
		const typebox = document.getElementById("typebox") as HTMLElement;
		replybox.classList.add("hideReplyBox");
		typebox.classList.remove("typeboxreplying");
		(document.getElementById("typebox") as HTMLDivElement).contentEditable = "false";
		(document.getElementById("upload") as HTMLElement).style.visibility = "hidden";
		(document.getElementById("typediv") as HTMLElement).style.visibility = "hidden";
		(document.getElementById("sideDiv") as HTMLElement).innerHTML = "";
	}
	noChannel(addstate: boolean) {
		if (addstate) {
			history.pushState([this.id, undefined], "", `/channels/${this.id}`);
		}
		this.localuser.pageTitle(I18n.getTranslation("guild.emptytitle"));
		const channelTopic = document.getElementById("channelTopic") as HTMLSpanElement;
		channelTopic.setAttribute("hidden", "");

		const loading = document.getElementById("loadingdiv") as HTMLDivElement;
		loading.classList.remove("loading");
		this.localuser.getSidePannel();

		const messages = document.getElementById("channelw") as HTMLDivElement;
		for (const thing of Array.from(messages.getElementsByClassName("messagecontainer"))) {
			thing.remove();
		}
		const h1 = document.createElement("h1");
		h1.classList.add("messagecontainer");
		h1.textContent = I18n.getTranslation("guild.emptytext");
		messages.append(h1);
	}
	loadGuild() {
		this.localuser.loadGuild(this.id);
	}
	updateChannel(json: channeljson) {
		const channel = this.localuser.channelids.get(json.id);
		if (channel) {
			channel.updateChannel(json);
			this.headchannels = [];
			for (const thing of this.channels) {
				thing.children = [];
			}
			this.headchannels = [];
			for (const thing of this.channels) {
				const parent = thing.resolveparent(this);
				if (!parent) {
					this.headchannels.push(thing);
				}
			}
			this.printServers();
		}
	}
	createChannelpac(json: channeljson) {
		const thischannel = new Channel(json, this);
		this.localuser.channelids.set(json.id, thischannel);
		this.channels.push(thischannel);
		thischannel.resolveparent(this);
		if (!thischannel.parent) {
			this.headchannels.push(thischannel);
		}
		this.calculateReorder();
		this.printServers();
		return thischannel;
	}
	goToChannelDelay(id: string) {
		const channel = this.channels.find((_) => _.id === id);
		if (channel) {
			this.loadChannel(channel.id);
		} else {
			this.localuser.gotoid = id;
		}
	}
	createchannels(func = this.createChannel.bind(this)) {
		const options = ["text", "announcement", "voice"].map((e) =>
			I18n.getTranslation(`channel.${e}`),
		);

		const channelselect = new Dialog("");
		const form = channelselect.options.addForm("", (e: any) => {
			func(e.name, e.type);
			channelselect.hide();
		});

		form.addSelect(
			I18n.getTranslation("channel.selectType"),
			"type",
			options,
			{radio: true},
			[0, 5, 2],
		);
		form.addTextInput(I18n.getTranslation("channel.selectName"), "name");
		channelselect.show();
	}
	createcategory() {
		const category = 4;
		const channelselect = new Dialog("");
		const options = channelselect.options;
		const form = options.addForm("", (e: any) => {
			this.createChannel(e.name, category);
			channelselect.hide();
		});
		form.addTextInput(I18n.getTranslation("channel.selectCatName"), "name");
		channelselect.show();
	}
	delChannel(json: channeljson) {
		const channel = this.localuser.channelids.get(json.id);
		this.localuser.channelids.delete(json.id);
		if (!channel) return;
		this.channels.splice(this.channels.indexOf(channel), 1);
		const indexy = this.headchannels.indexOf(channel);
		if (indexy !== -1) {
			this.headchannels.splice(indexy, 1);
		}
		if (channel === this.prevchannel) {
			this.prevchannel = undefined;
		}
		/*
		const build=[];
		for(const thing of this.channels){
		console.log(thing.id);
		if(thing!==channel){
		build.push(thing)
		}else{
		console.log("fail");
		if(thing.parent){
		thing.parent.delChannel(json);
		}
		}
		}
		this.channels=build;
		*/
		this.printServers();
	}
	createChannel(name: string, type: number) {
		fetch(`${this.info.api}/guilds/${this.id}/channels`, {
			method: "POST",
			headers: this.headers,
			body: JSON.stringify({name, type}),
		})
			.then((_) => _.json())
			.then((_) => this.goToChannelDelay(_.id));
	}
	async createRole(name: string) {
		const fetched = await fetch(`${this.info.api}/guilds/${this.id}roles`, {
			method: "POST",
			headers: this.headers,
			body: JSON.stringify({
				name,
				color: 0,
				permissions: "0",
			}),
		});
		const json = await fetched.json();
		const role = new Role(json, this);
		this.roleids.set(role.id, role);
		this.roles.push(role);
		return role;
	}
	async updateRolePermissions(id: string, perms: Permissions) {
		const role = this.roleids.get(id);
		if (!role) {
			return;
		}
		role.permissions.allow = perms.allow;
		role.permissions.deny = perms.deny;

		await fetch(`${this.info.api}/guilds/${this.id}/roles/${role.id}`, {
			method: "PATCH",
			headers: this.headers,
			body: JSON.stringify({
				color: role.color,
				hoist: role.hoist,
				icon: role.icon,
				mentionable: role.mentionable,
				name: role.name,
				permissions: role.permissions.allow.toString(),
				unicode_emoji: role.unicode_emoji,
			}),
		});
	}
}
Guild.setupcontextmenu();
export {Guild};
