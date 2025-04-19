import {Guild} from "./guild.js";
import type {Channel} from "./channel.js";
import {Direct} from "./direct.js";
import {AVoice} from "./audio/voice.js";
import {User} from "./user.js";
import {createImg, getapiurls, getBulkUsers, SW} from "./utils/utils.js";
import {getBulkInfo, setTheme, type Specialuser} from "./utils/utils.js";
import type {
	channeljson,
	guildjson,
	mainuserjson,
	memberjson,
	memberlistupdatejson,
	messageCreateJson,
	messagejson,
	presencejson,
	readyjson,
	startTypingjson,
	wsjson,
} from "./jsontypes.js";
import {Member} from "./member.js";
import {Dialog, type Form, FormError, type Options, Settings} from "./settings.js";
import {getTextNodeAtPosition, MarkDown, saveCaretPosition} from "./markdown.js";
import {Bot} from "./bot.js";
import type {Role} from "./role.js";
import {VoiceFactory} from "./voice.js";
import {I18n, langmap} from "./i18n.js";
import {Emoji} from "./emoji.js";
import {Play} from "./audio/play.js";
import {Message} from "./message.js";
import {badgeArr} from "./Dbadges.js";
import {Rights} from "./rights.js";
import {Contextmenu} from "./contextmenu.js";
import {Sticker} from "./sticker.js";

const wsCodesRetry = new Set([4000, 4001, 4002, 4003, 4005, 4007, 4008, 4009]);
interface CustomHTMLDivElement extends HTMLDivElement {
	markdown: MarkDown;
}
class Localuser {
	badges = new Map<
		string,
		{id: string; description: string; icon: string; link?: string; translate?: boolean}
	>(
		badgeArr as [
			string,
			{id: string; description: string; icon: string; link?: string; translate?: boolean},
		][],
	);
	lastSequence: number | null = null;
	token!: string;
	userinfo!: Specialuser;
	serverurls!: Specialuser["serverurls"];
	initialized!: boolean;
	info!: Specialuser["serverurls"];
	headers!: {"Content-type": string; Authorization: string};
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
	voiceFactory?: VoiceFactory;
	play?: Play;
	instancePing = {
		name: "Unknown",
	};
	mfa_enabled!: boolean;
	get perminfo() {
		return this.userinfo.localuserStore;
	}
	set perminfo(e) {
		this.userinfo.localuserStore = e;
	}
	static users = getBulkUsers();
	static showAccountSwitcher(thisUser: Localuser): void {
		const table = document.createElement("div");
		table.classList.add("flexttb", "accountSwitcher");

		for (const user of Object.values(Localuser.users.users)) {
			const specialUser = user as Specialuser;
			const userInfo = document.createElement("div");
			userInfo.classList.add("flexltr", "switchtable");

			const pfp = createImg(specialUser.pfpsrc);
			pfp.classList.add("pfp");
			userInfo.append(pfp);

			const userDiv = document.createElement("div");
			userDiv.classList.add("userinfo");
			userDiv.textContent = specialUser.username;
			userDiv.append(document.createElement("br"));

			const span = document.createElement("span");
			span.textContent = specialUser.serverurls.wellknown
				.replace("https://", "")
				.replace("http://", "");
			span.classList.add("serverURL");
			userDiv.append(span);

			userInfo.append(userDiv);
			table.append(userInfo);

			userInfo.addEventListener("click", () => {
				thisUser.unload();
				thisUser.swapped = true;
				const loading = document.getElementById("loading") as HTMLDivElement;
				loading.classList.remove("doneloading");
				loading.classList.add("loading");

				thisUser = new Localuser(specialUser);
				Localuser.users.currentuser = specialUser.uid;
				sessionStorage.setItem("currentuser", specialUser.uid);
				localStorage.setItem("userinfos", JSON.stringify(Localuser.users));

				thisUser.initwebsocket().then(() => {
					thisUser.loaduser();
					thisUser.init();
					loading.classList.add("doneloading");
					loading.classList.remove("loading");
					console.log("done loading");
				});

				userInfo.remove();
			});
		}

		const switchAccountDiv = document.createElement("div");
		switchAccountDiv.classList.add("switchtable");
		switchAccountDiv.textContent = I18n.getTranslation("switchAccounts");
		switchAccountDiv.addEventListener("click", () => {
			window.location.href = "/login.html";
		});
		table.append(switchAccountDiv);

		if (Contextmenu.currentmenu) {
			Contextmenu.currentmenu.remove();
		}
		Contextmenu.currentmenu = table;
		document.body.append(table);
	}
	static userMenu = this.generateUserMenu();
	static generateUserMenu() {
		const menu = new Contextmenu<Localuser, void>("");
		menu.addButton(
			() => I18n.localuser.addStatus(),
			function () {
				const d = new Dialog(I18n.localuser.status());
				const opt = d.float.options.addForm(
					"",
					() => {
						const status = cust.value;
						sessionStorage.setItem("cstatus", JSON.stringify({text: status}));
						//this.user.setstatus(status);
						d.hide();
					},
					{
						fetchURL: `${this.info.api}/users/@me/settings`,
						method: "PATCH",
						headers: this.headers,
					},
				);
				opt.addText(I18n.localuser.customStatusWarn());
				opt.addPreprocessor((obj) => {
					if ("custom_status" in obj) {
						obj.custom_status = {text: obj.custom_status};
					}
				});
				const cust = opt.addTextInput(I18n.localuser.status(), "custom_status", {});
				d.show();
			},
		);
		menu.addButton(
			() => I18n.localuser.status(),
			function () {
				const d = new Dialog(I18n.localuser.status());
				const opt = d.float.options;
				const selection = ["online", "invisible", "dnd", "idle"] as const;
				opt.addText(I18n.localuser.statusWarn());
				const smap = selection.map((_) => I18n.user[_]());
				let index = selection.indexOf(
					sessionStorage.getItem("status") as "online" | "invisible" | "dnd" | "idle",
				);
				if (index === -1) {
					index = 0;
				}
				opt
					.addSelect("", () => {}, smap, {
						defaultIndex: index,
					})
					.watchForChange(async (i) => {
						const status = selection[i];
						await fetch(`${this.info.api}/users/@me/settings`, {
							body: JSON.stringify({
								status,
							}),
							headers: this.headers,
							method: "PATCH",
						});
						sessionStorage.setItem("status", status);
						this.user.setstatus(status);
					});
				d.show();
			},
		);
		menu.addButton(
			() => I18n.switchAccounts(),
			function () {
				Localuser.showAccountSwitcher(this);
			},
		);
		return menu;
	}
	constructor(userinfo: Specialuser | -1) {
		Play.playURL("/audio/sounds.jasf").then((_) => {
			this.play = _;
		});
		if (userinfo === -1) {
			this.rights = new Rights("");
			return;
		}
		this.token = userinfo.token;
		this.userinfo = userinfo;
		this.perminfo.guilds ??= {};
		this.perminfo.user ??= {};
		this.serverurls = this.userinfo.serverurls;
		this.initialized = false;
		this.info = this.serverurls;
		this.headers = {
			"Content-type": "application/json; charset=UTF-8",
			Authorization: this.userinfo.token,
		};
		const rights = this.perminfo.user.rights || "875069521787904";
		this.rights = new Rights(rights);

		if (this.perminfo.user.disableColors === undefined) this.perminfo.user.disableColors = true;
		this.updateTranslations();
	}
	async gottenReady(ready: readyjson): Promise<void> {
		await I18n.done;
		this.initialized = true;
		this.ready = ready;
		this.guilds = [];
		this.guildids = new Map();
		this.user = new User(ready.d.user, this);
		this.user.setstatus(sessionStorage.getItem("status") || "online");
		this.resume_gateway_url = ready.d.resume_gateway_url;
		this.session_id = ready.d.session_id;

		this.mdBox();

		this.voiceFactory = new VoiceFactory({id: this.user.id});
		this.handleVoice();
		this.mfa_enabled = ready.d.user.mfa_enabled as boolean;
		this.userinfo.username = this.user.username;
		this.userinfo.id = this.user.id;
		this.userinfo.pfpsrc = this.user.getpfpsrc();

		this.status = this.ready.d.user_settings.status;
		this.channelfocus = undefined;
		this.lookingguild = undefined;
		this.guildhtml = new Map();
		const members: {[key: string]: memberjson} = {};
		if (ready.d.merged_members) {
			for (const thing of ready.d.merged_members) {
				members[thing[0].guild_id] = thing[0];
			}
		}
		for (const thing of ready.d.guilds) {
			const temp = new Guild(thing, this, members[thing.id]);
			this.guilds.push(temp);
			this.guildids.set(temp.id, temp);
		}
		{
			const temp = new Direct(ready.d.private_channels, this);
			this.guilds.push(temp);
			this.guildids.set(temp.id, temp);
		}
		if (ready.d.user_guild_settings) {
			console.log(ready.d.user_guild_settings.entries);

			for (const thing of ready.d.user_guild_settings.entries) {
				(this.guildids.get(thing.guild_id) as Guild).notisetting(thing);
			}
		}
		if (ready.d.read_state) {
			for (const thing of ready.d.read_state.entries) {
				const channel = this.channelids.get(thing.channel_id);
				if (!channel) {
					continue;
				}
				channel.readStateInfo(thing);
			}
		}
		for (const thing of ready.d.relationships) {
			const user = new User(thing.user, this);
			user.nickname = thing.nickname;
			user.relationshipType = thing.type;
			this.inrelation.add(user);
		}

		this.pingEndpoint();
	}
	inrelation = new Set<User>();
	outoffocus(): void {
		const servers = document.getElementById("servers") as HTMLDivElement;
		servers.innerHTML = "";
		const channels = document.getElementById("channels") as HTMLDivElement;
		channels.innerHTML = "";
		if (this.channelfocus) {
			this.channelfocus.infinite.delete();
		}
		this.lookingguild = undefined;
		this.channelfocus = undefined;
	}
	unload(): void {
		this.initialized = false;
		this.outoffocus();
		this.guilds = [];
		this.guildids = new Map();
		if (this.ws) {
			this.ws.close(4040);
		}
	}
	swapped = false;
	resume_gateway_url?: string;
	session_id?: string;
	async initwebsocket(resume = false): Promise<void> {
		let returny: () => void;
		if (!this.resume_gateway_url || !this.session_id) {
			resume = false;
		}
		const ws = new WebSocket(
			`${resume ? this.resume_gateway_url : this.serverurls.gateway.toString()}?encoding=json&v=9${DecompressionStream ? "&compress=zlib-stream" : ""}`,
		);
		this.ws = ws;
		let ds: DecompressionStream;
		let w: WritableStreamDefaultWriter;
		let r: ReadableStreamDefaultReader;
		let arr: Uint8Array;
		let build = "";
		if (DecompressionStream) {
			ds = new DecompressionStream("deflate");
			w = ds.writable.getWriter();
			r = ds.readable.getReader();
			arr = new Uint8Array();
		}
		const promise = new Promise<void>((res) => {
			returny = res;
			ws.addEventListener("open", (_event) => {
				console.log("WebSocket connected");
				if (resume) {
					ws.send(
						JSON.stringify({
							op: 6,
							d: {
								token: this.token,
								session_id: this.session_id,
								seq: this.lastSequence,
							},
						}),
					);
					this.resume_gateway_url = undefined;
					this.session_id = undefined;
				} else {
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
									status: sessionStorage.getItem("status") || "online",
									since: null, //new Date().getTime()
									activities: [],
									afk: false,
								},
							},
						}),
					);
				}
			});
			const textdecode = new TextDecoder();
			if (DecompressionStream) {
				(async () => {
					while (true) {
						const read = await r.read();
						const data = textdecode.decode(read.value, {stream: true});
						build += data;
						try {
							const temp = JSON.parse(build);
							build = "";
							await this.handleEvent(temp);
							if (temp.op === 0 && temp.t === "READY") {
								returny();
							}
						} catch {}
					}
				})();
			}
		});

		let order = new Promise<void>((res) => res());

		ws.addEventListener("message", async (event) => {
			const temp2 = order;
			order = new Promise<void>(async (res) => {
				await temp2;
				let temp: {op: number; t: string};
				try {
					if (event.data instanceof Blob) {
						const buff = await event.data.arrayBuffer();
						const array = new Uint8Array(buff);

						const temparr = new Uint8Array(array.length + arr.length);
						temparr.set(arr, 0);
						temparr.set(array, arr.length);
						arr = temparr;

						const len = array.length;
						if (
							!(
								array[len - 1] === 255 &&
								array[len - 2] === 255 &&
								array[len - 3] === 0 &&
								array[len - 4] === 0
							)
						) {
							return;
						}
						w.write(arr.buffer);
						arr = new Uint8Array();
						return; //had to move the while loop due to me being dumb
					}
						temp = JSON.parse(event.data);

					await this.handleEvent(temp as readyjson);
					if (temp.op === 0 && temp.t === "READY") {
						returny();
					}
				} catch (e) {
					console.error(e);
				} finally {
					res();
				}
			});
		});

		ws.addEventListener("close", async (event) => {
			this.ws = undefined;
			console.log(`WebSocket closed with code ${event.code}`);
			if (
				(event.code > 1000 && event.code < 1016 && this.errorBackoff === 0) ||
				(wsCodesRetry.has(event.code) && this.errorBackoff === 0)
			) {
				this.errorBackoff++;
				this.initwebsocket(true).then(() => {
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
			if (
				(event.code > 1000 && event.code < 1016) ||
				wsCodesRetry.has(event.code) ||
				event.code === 4041
			) {
				if (this.connectionSucceed !== 0 && Date.now() > this.connectionSucceed + 20000) {
					this.errorBackoff = 0;
				} else this.errorBackoff++;
				this.connectionSucceed = 0;
				const loaddesc = document.getElementById("load-desc") as HTMLElement;

				loaddesc.innerHTML = "";
				loaddesc.append(
					new MarkDown(
						I18n.getTranslation("errorReconnect", `${Math.round(0.2 + this.errorBackoff * 2.8)}`),
					).makeHTML(),
				);
				switch (
					this.errorBackoff //try to recover from bad domain
				) {
					case 3: {
						const newurls = await getapiurls(this.info.wellknown);
						if (newurls) {
							this.info = newurls;
							this.serverurls = newurls;
							this.userinfo.json.serverurls = this.info;
							break;
						}
						break;
					}

					case 4: {
						const newurls = await getapiurls(new URL(this.info.wellknown).origin);
						if (newurls) {
							this.info = newurls;
							this.serverurls = newurls;
							this.userinfo.json.serverurls = this.info;
							break;
						}
						break;
					}
					case 5: {
						const breakappart = new URL(this.info.wellknown).origin.split(".");
						const url = `https://${breakappart.at(-2)}.${breakappart.at(-1)}`;
						const newurls = await getapiurls(url);
						if (newurls) {
							this.info = newurls;
							this.serverurls = newurls;
							this.userinfo.json.serverurls = this.info;
						}
						break;
					}
				}
				setTimeout(
					() => {
						if (this.swapped) return;
						(document.getElementById("load-desc") as HTMLElement).textContent =
							I18n.getTranslation("retrying");
						this.initwebsocket().then(() => {
							this.loaduser();
							this.init();
							const loading = document.getElementById("loading") as HTMLElement;
							loading.classList.add("doneloading");
							loading.classList.remove("loading");
							console.log("done loading");
						});
					},
					200 + this.errorBackoff * 2800,
				);
			} else
				(document.getElementById("load-desc") as HTMLElement).textContent =
					I18n.getTranslation("unableToConnect");
		});
		await promise;
	}
	relationshipsUpdate = () => {};
	rights: Rights;
	updateRights(rights: string | number) {
		this.rights.update(rights);
		this.perminfo.user.rights = rights;
	}
	async handleEvent(temp: wsjson) {
		console.debug(temp);
		if (temp.s) this.lastSequence = temp.s;
		if (temp.op === 9 && this.ws) {
			this.errorBackoff = 0;
			this.ws.close(4041);
		}
		if (temp.op === 0) {
			switch (temp.t) {
				case "MESSAGE_CREATE":
					if (this.initialized) {
						this.messageCreate(temp);
					}
					break;
				case "MESSAGE_DELETE": {
					temp.d.guild_id ??= "@me";
					const channel = this.channelids.get(temp.d.channel_id);
					if (!channel) break;
					const message = channel.messages.get(temp.d.id);
					if (!message) break;
					message.deleteEvent();
					break;
				}
				case "READY":
					await this.gottenReady(temp as readyjson);
					break;
				case "MESSAGE_UPDATE": {
					temp.d.guild_id ??= "@me";
					const channel = this.channelids.get(temp.d.channel_id);
					if (!channel) break;
					const message = channel.messages.get(temp.d.id);
					if (!message) break;
					message.giveData(temp.d);
					break;
				}
				case "TYPING_START":
					if (this.initialized) {
						this.typingStart(temp);
					}
					break;
				case "USER_UPDATE":
					if (this.initialized) {
						const users = this.userMap.get(temp.d.id);
						if (users) {
							users.userupdate(temp.d);
						}
					}
					break;
				case "CHANNEL_PINS_UPDATE": {
					temp.d.guild_id ??= "@me";
					const channel = this.channelids.get(temp.d.channel_id);
					if (!channel) break;
					channel.pinnedMessages = undefined;
					channel.lastpin = `${new Date()}`;
					const pinnedM = document.getElementById("pinnedMDiv");
					if (pinnedM) {
						pinnedM.classList.add("unreadPin");
					}
					break;
				}
				case "CHANNEL_UPDATE":
					if (this.initialized) {
						this.updateChannel(temp.d);
					}
					break;
				case "CHANNEL_CREATE":
					if (this.initialized) {
						this.createChannel(temp.d);
					}
					break;
				case "CHANNEL_DELETE":
					if (this.initialized) {
						this.delChannel(temp.d);
					}
					break;
				case "GUILD_DELETE": {
					const guildy = this.guildids.get(temp.d.id);
					if (guildy) {
						this.guildids.delete(temp.d.id);
						this.guilds.splice(this.guilds.indexOf(guildy), 1);
						guildy.html.remove();
					}
					break;
				}
				case "GUILD_UPDATE": {
					const guildy = this.guildids.get(temp.d.id);
					if (guildy) {
						guildy.update(temp.d);
					}
					break;
				}
				case "GUILD_CREATE":
					(async () => {
						const guildy = new Guild(temp.d, this, this.user);
						this.guilds.push(guildy);
						this.guildids.set(guildy.id, guildy);
						const divy = guildy.generateGuildIcon();
						guildy.HTMLicon = divy;
						(document.getElementById("servers") as HTMLDivElement).insertBefore(
							divy,
							document.getElementById("bottomseparator"),
						);
					})();
					break;
				case "MESSAGE_REACTION_ADD":
					{
						temp.d.guild_id ??= "@me";
						const guild = this.guildids.get(temp.d.guild_id);
						if (!guild) break;
						const channel = this.channelids.get(temp.d.channel_id);
						if (!channel) break;
						const message = channel.messages.get(temp.d.message_id);
						if (!message) break;
						let thing: Member | {id: string};
						if (temp.d.member) {
							thing = (await Member.new(temp.d.member, guild)) as Member;
						} else {
							thing = {id: temp.d.user_id};
						}
						message.reactionAdd(temp.d.emoji, thing);
					}
					break;
				case "MESSAGE_REACTION_REMOVE":
					{
						temp.d.guild_id ??= "@me";
						const channel = this.channelids.get(temp.d.channel_id);
						if (!channel) break;

						const message = channel.messages.get(temp.d.message_id);
						if (!message) break;

						message.reactionRemove(temp.d.emoji, temp.d.user_id);
					}
					break;
				case "MESSAGE_REACTION_REMOVE_ALL":
					{
						temp.d.guild_id ??= "@me";
						const channel = this.channelids.get(temp.d.channel_id);
						if (!channel) break;
						const message = channel.messages.get(temp.d.message_id);
						if (!message) break;
						message.reactionRemoveAll();
					}
					break;
				case "MESSAGE_REACTION_REMOVE_EMOJI":
					{
						temp.d.guild_id ??= "@me";
						const channel = this.channelids.get(temp.d.channel_id);
						if (!channel) break;
						const message = channel.messages.get(temp.d.message_id);
						if (!message) break;
						message.reactionRemoveEmoji(temp.d.emoji);
					}
					break;
				case "GUILD_MEMBERS_CHUNK":
					this.gotChunk(temp.d);
					break;
				case "GUILD_MEMBER_LIST_UPDATE": {
					this.memberListUpdate(temp);
					break;
				}
				case "VOICE_STATE_UPDATE":
					if (this.voiceFactory) {
						this.voiceFactory.voiceStateUpdate(temp);
					}

					break;
				case "VOICE_SERVER_UPDATE":
					if (this.voiceFactory) {
						this.voiceFactory.voiceServerUpdate(temp);
					}
					break;
				case "GUILD_ROLE_CREATE": {
					const guild = this.guildids.get(temp.d.guild_id);
					if (!guild) break;
					guild.newRole(temp.d.role);
					break;
				}
				case "GUILD_ROLE_UPDATE": {
					const guild = this.guildids.get(temp.d.guild_id);
					if (!guild) break;
					guild.updateRole(temp.d.role);
					break;
				}
				case "GUILD_ROLE_DELETE": {
					const guild = this.guildids.get(temp.d.guild_id);
					if (!guild) break;
					guild.deleteRole(temp.d.role_id);
					break;
				}
				case "GUILD_MEMBER_UPDATE": {
					const guild = this.guildids.get(temp.d.guild_id);
					if (!guild) break;
					guild.memberupdate(temp.d);
					break;
				}
				case "RELATIONSHIP_ADD": {
					const user = new User(temp.d.user, this);
					user.nickname = null;
					user.relationshipType = temp.d.type;
					this.inrelation.add(user);
					this.relationshipsUpdate();
					const me = this.guildids.get("@me");
					if (!me) break;
					me.unreads();
					break;
				}
				case "RELATIONSHIP_REMOVE": {
					const user = this.userMap.get(temp.d.id);
					if (!user) return;
					user.nickname = null;
					user.relationshipType = 0;
					this.inrelation.delete(user);
					this.relationshipsUpdate();
					break;
				}
				case "PRESENCE_UPDATE": {
					if (temp.d.user) {
						this.presences.set(temp.d.user.id, temp.d);
					}
					break;
				}
				case "GUILD_MEMBER_ADD": {
					const guild = this.guildids.get(temp.d.guild_id);
					if (!guild) break;
					Member.new(temp.d, guild);
					break;
				}
				case "GUILD_MEMBER_REMOVE": {
					const guild = this.guildids.get(temp.d.guild_id);
					if (!guild) break;
					const user = new User(temp.d.user, this);
					const member = user.members.get(guild);
					if (!(member instanceof Member)) break;
					member.remove();
					break;
				}
				case "GUILD_EMOJIS_UPDATE": {
					const guild = this.guildids.get(temp.d.guild_id);
					if (!guild) break;
					guild.emojis = temp.d.emojis;
					guild.onEmojiUpdate(guild.emojis);
					break;
				}
				case "GUILD_STICKERS_UPDATE": {
					const guild = this.guildids.get(temp.d.guild_id);
					if (!guild) break;
					guild.stickers = temp.d.stickers.map((_) => new Sticker(_, guild));
					guild.onStickerUpdate(guild.stickers);
					break;
				}
				default: {
					//@ts-ignore
					console.warn(`Unhandled case ${temp.t}`, temp);
				}
			}
		} else if (temp.op === 10) {
			if (!this.ws) return;
			console.log("heartbeat down");
			this.heartbeat_interval = temp.d.heartbeat_interval;
			this.ws.send(JSON.stringify({op: 1, d: this.lastSequence}));
		} else if (temp.op === 11) {
			setTimeout((_: any) => {
				if (!this.ws) return;
				if (this.connectionSucceed === 0) this.connectionSucceed = Date.now();
				this.ws.send(JSON.stringify({op: 1, d: this.lastSequence}));
			}, this.heartbeat_interval);
		} else {
			console.log(`Unhandled case ${temp.d}`, temp);
		}
	}
	get currentVoice() {
		return this.voiceFactory?.currentVoice;
	}
	async joinVoice(channel: Channel) {
		if (!this.voiceFactory) return;
		if (!this.ws) return;
		this.ws.send(JSON.stringify(this.voiceFactory.joinVoice(channel.id, channel.guild.id)));
		return undefined;
	}
	changeVCStatus(status: string) {
		const statuselm = document.getElementById("VoiceStatus");
		if (!statuselm) throw new Error("Missing status element");
		statuselm.textContent = status;
	}
	handleVoice() {
		if (this.voiceFactory) {
			this.voiceFactory.onJoin = (voice) => {
				voice.onSatusChange = (status) => {
					this.changeVCStatus(status);
				};
			};
		}
	}

	heartbeat_interval = 0;
	updateChannel(json: channeljson): void {
		const guild = this.guildids.get(json.guild_id);
		if (guild) {
			guild.updateChannel(json);
			if (json.guild_id === this.lookingguild?.id) {
				this.loadGuild(json.guild_id);
			}
		}
	}
	createChannel(json: channeljson): undefined | Channel {
		json.guild_id ??= "@me";
		const guild = this.guildids.get(json.guild_id);
		if (!guild) return;
		const channel = guild.createChannelpac(json);
		if (json.guild_id === this.lookingguild?.id) {
			this.loadGuild(json.guild_id, true);
		}
		if (channel.id === this.gotoid) {
			guild.loadGuild();
			guild.loadChannel(channel.id);
			this.gotoid = undefined;
		}
		return channel; // Add this line to return the 'channel' variable
	}
	async memberListUpdate(list: memberlistupdatejson | undefined) {
		if (this.searching) return;
		const div = document.getElementById("sideDiv") as HTMLDivElement;
		div.innerHTML = "";
		div.classList.remove("searchDiv");
		div.classList.remove("hideSearchDiv");
		const guild = this.lookingguild;
		if (!guild) return;
		const channel = this.channelfocus;
		if (!channel) return;
		if (list) {
			const counts = new Map<string, number>();
			for (const thing of list.d.ops[0].items) {
				if ("member" in thing) {
					await Member.new(thing.member, guild);
				} else {
					counts.set(thing.group.id, thing.group.count);
				}
			}
		}

		const elms: Map<Role | "offline" | "online", Member[]> = new Map([]);
		for (const role of guild.roles) {
			if (role.hoist) {
				elms.set(role, []);
			}
		}
		elms.set("online", []);
		elms.set("offline", []);
		const members = new Set(guild.members);
		members.forEach((member) => {
			if (!channel.hasPermission("VIEW_CHANNEL", member)) {
				members.delete(member);
				console.log(member, "can't see");
				return;
			}
		});
		for (const [role, list] of elms) {
			members.forEach((member) => {
				if (role === "offline") {
					if (member.user.getStatus() === "offline" || member.user.getStatus() === "invisible") {
						list.push(member);
						members.delete(member);
					}
					return;
				}
				if (member.user.getStatus() === "offline" || member.user.getStatus() === "invisible") {
					return;
				}
				if (role !== "online" && member.hasRole(role.id)) {
					list.push(member);
					members.delete(member);
				}
			});
			if (!list.length) continue;
			list.sort((a, b) => {
				return a.name.toLowerCase() > b.name.toLowerCase() ? 1 : -1;
			});
		}
		const online = [...members];
		online.sort((a, b) => {
			return a.name.toLowerCase() > b.name.toLowerCase() ? 1 : -1;
		});
		elms.set("online", online);
		for (const [role, list] of elms) {
			if (!list.length) continue;
			const category = document.createElement("div");
			category.classList.add("memberList");
			const title = document.createElement("h3");
			if (role === "offline") {
				title.textContent = I18n.getTranslation("user.offline");
				category.classList.add("offline");
			} else if (role === "online") {
				title.textContent = I18n.getTranslation("user.online");
			} else {
				title.textContent = role.name;
			}
			category.append(title);
			const membershtml = document.createElement("div");
			membershtml.classList.add("flexttb");

			for (const member of list) {
				const memberdiv = document.createElement("div");
				const pfp = await member.user.buildstatuspfp(member);
				const username = document.createElement("span");
				username.classList.add("ellipsis");
				username.textContent = member.name;
				member.bind(username);
				member.user.bind(memberdiv, member.guild, false);
				memberdiv.append(pfp, username);
				memberdiv.classList.add("flexltr", "liststyle", "memberListStyle");
				membershtml.append(memberdiv);
			}
			category.append(membershtml);
			div.append(category);
		}

		console.log(elms);
	}
	async getSidePannel() {
		if (this.ws && this.channelfocus) {
			console.log(this.channelfocus.guild.id);
			if (this.channelfocus.guild.id === "@me") {
				this.memberListUpdate();
				return;
			}
			this.ws.send(
				JSON.stringify({
					d: {
						channels: {[this.channelfocus.id]: [[0, 99]]},
						guild_id: this.channelfocus.guild.id,
					},
					op: 14,
				}),
			);
		} else {
			console.log("false? :3");
		}
	}
	gotoid: string | undefined;
	async goToChannel(id: string, addstate = true) {
		const channel = this.channelids.get(id);
		if (channel) {
			const guild = channel.guild;
			guild.loadGuild();
			guild.loadChannel(id, addstate);
		} else {
			this.gotoid = id;
		}
	}
	delChannel(json: channeljson): void {
		let guild_id = json.guild_id;
		guild_id ??= "@me";
		const guild = this.guildids.get(guild_id);
		if (guild) {
			guild.delChannel(json);
		}

		if (json.guild_id === this.lookingguild?.id) {
			this.loadGuild(json.guild_id, true);
		}
	}
	init(): void {
		const location = window.location.href.split("/");
		this.buildservers();
		if (location[3] === "channels") {
			const guild = this.loadGuild(location[4]);
			if (!guild) {
				return;
			}
			guild.loadChannel(location[5]);
			this.channelfocus = this.channelids.get(location[5]);
		}
	}
	loaduser(): void {
		(document.getElementById("username") as HTMLSpanElement).textContent = this.user.username;
		(document.getElementById("userpfp") as HTMLImageElement).src = this.user.getpfpsrc();
		(document.getElementById("status") as HTMLSpanElement).textContent = this.status;
	}
	isAdmin(): boolean {
		if (this.lookingguild) {
			return this.lookingguild.isAdmin();
		}
			return false;
	}

	loadGuild(id: string, forceReload = false): Guild | undefined {
		this.searching = false;
		let guild = this.guildids.get(id);
		if (!guild) {
			guild = this.guildids.get("@me");
		}
		console.log(forceReload);
		if (!forceReload && this.lookingguild === guild) {
			return guild;
		}
		if (this.channelfocus && this.lookingguild !== guild) {
			this.channelfocus.infinite.delete();
			this.channelfocus = undefined;
		}
		if (this.lookingguild) {
			this.lookingguild.html.classList.remove("serveropen");
		}

		if (!guild) return;
		if (guild.html) {
			guild.html.classList.add("serveropen");
		}
		this.lookingguild = guild;
		(document.getElementById("serverName") as HTMLElement).textContent = guild.properties.name;
		const banner = document.getElementById("servertd");
		console.log(guild.banner, banner);
		if (banner) {
			if (guild.banner) {
				//https://cdn.discordapp.com/banners/677271830838640680/fab8570de5bb51365ba8f36d7d3627ae.webp?size=240
				banner.style.setProperty(
					"background-image",
					`linear-gradient(rgba(0, 0, 0, 1) 0%, rgba(0, 0, 0, 0) 40%), url(${this.info.cdn}/banners/${guild.id}/${guild.banner})`,
				);
				banner.classList.add("Banner");
				//background-image:
			} else {
				banner.style.removeProperty("background-image");
				banner.classList.remove("Banner");
			}
			if (guild.id !== "@me") {
				banner.style.setProperty("cursor", "pointer");
				banner.onclick = (e) => {
					e.preventDefault();
					e.stopImmediatePropagation();
					const box = banner.getBoundingClientRect();
					Guild.contextmenu.makemenu(box.left + 16, box.bottom + 5, guild, undefined);
				};
			} else {
				banner.style.removeProperty("cursor");
				banner.onclick = () => {};
			}
		}
		//console.log(this.guildids,id)
		const channels = document.getElementById("channels") as HTMLDivElement;
		channels.innerHTML = "";
		const html = guild.getHTML();
		channels.appendChild(html);
		return guild;
	}
	buildservers(): void {
		const serverlist = document.getElementById("servers") as HTMLDivElement; //
		const outdiv = document.createElement("div");
		const home: any = document.createElement("span");
		const div = document.createElement("div");
		div.classList.add("home", "servericon");

		home.classList.add("svgicon", "svg-home");
		(this.guildids.get("@me") as Guild).html = outdiv;
		const unread = document.createElement("div");
		unread.classList.add("unread");
		outdiv.append(unread);
		outdiv.append(div);
		div.appendChild(home);

		outdiv.classList.add("servernoti");
		serverlist.append(outdiv);
		home.onclick = () => {
			const guild = this.guildids.get("@me");
			if (!guild) return;
			guild.loadGuild();
			guild.loadChannel();
		};
		const sentdms = document.createElement("div");
		sentdms.classList.add("sentdms");
		serverlist.append(sentdms);
		sentdms.id = "sentdms";

		const br = document.createElement("hr");
		br.classList.add("lightbr");
		serverlist.appendChild(br);
		for (const thing of this.guilds) {
			if (thing instanceof Direct) {
				(thing as Direct).unreaddms();
				continue;
			}
			const divy = thing.generateGuildIcon();
			thing.HTMLicon = divy;
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
			div.onclick = (_) => {
				this.createGuild();
			};
			const guilddsdiv = document.createElement("div");
			const guildDiscoveryContainer = document.createElement("span");
			guildDiscoveryContainer.classList.add("svgicon", "svg-explore");
			guilddsdiv.classList.add("home", "servericon");
			guilddsdiv.appendChild(guildDiscoveryContainer);
			serverlist.appendChild(guilddsdiv);
			guildDiscoveryContainer.addEventListener("click", () => {
				this.guildDiscovery();
			});
		}
		this.unreads();
	}
	passTemplateID(id: string) {
		this.createGuild(id);
	}
	createGuild(templateID?: string) {
		const full = new Dialog("");
		const buttons = full.options.addButtons("", {top: true});
		const viacode = buttons.add(I18n.getTranslation("invite.joinUsing"));
		{
			const form = viacode.addForm("", async (e: any) => {
				let parsed = "";
				if (e.code.includes("/")) {
					parsed = e.code.split("/")[e.code.split("/").length - 1];
				} else {
					parsed = e.code;
				}
				const json = await (
					await fetch(`${this.info.api}/invites/${parsed}`, {
						method: "POST",
						headers: this.headers,
					})
				).json();
				if (json.message) {
					throw new FormError(text, json.message);
				}
				full.hide();
			});
			const text = form.addTextInput(I18n.getTranslation("invite.inviteLinkCode"), "code");
		}
		const guildcreate = buttons.add(I18n.getTranslation("guild.create"));
		{
			const form = guildcreate.addForm("", (fields: any) => {
				this.makeGuild(fields).then((_) => {
					if (_.message) {
						loading.hide();
						full.show();
						alert(_.errors.name._errors[0].message);
					} else {
						loading.hide();
						full.hide();
					}
				});
			});
			form.addFileInput(I18n.getTranslation("guild.icon:"), "icon", {files: "one"});
			form.addTextInput(I18n.getTranslation("guild.name:"), "name", {required: true});
			const loading = new Dialog("");
			loading.float.options.addTitle(I18n.guild.creating());
			form.onFormError = () => {
				loading.hide();
				full.show();
			};
			form.addPreprocessor(() => {
				loading.show();
				full.hide();
			});
		}
		const guildcreateFromTemplate = buttons.add(I18n.guild.createFromTemplate());
		{
			const form = guildcreateFromTemplate.addForm(
				"",
				(_: any) => {
					if (_.message) {
						loading.hide();
						full.show();
						alert(_.message);
						const htmlarea = buttons.htmlarea.deref();
						if (htmlarea) buttons.generateHTMLArea(guildcreateFromTemplate, htmlarea);
					} else {
						loading.hide();
						full.hide();
					}
				},
				{
					method: "POST",
					headers: this.headers,
				},
			);
			const template = form.addTextInput(I18n.guild.template(), "template", {
				initText: templateID || "",
			});
			form.addFileInput(I18n.getTranslation("guild.icon:"), "icon", {files: "one"});
			form.addTextInput(I18n.getTranslation("guild.name:"), "name", {required: true});

			const loading = new Dialog("");
			loading.float.options.addTitle(I18n.guild.creating());
			form.onFormError = () => {
				loading.hide();
				full.show();
			};
			form.addPreprocessor((e) => {
				loading.show();
				full.hide();
				if ("template" in e) e.template = undefined;
				let code: string;
				if (URL.canParse(template.value)) {
					const url = new URL(template.value);
					code = url.pathname.split("/").at(-1) as string;
					if (url.host === "discord.com") {
						code = `discord:${code}`;
					}
				} else {
					code = template.value;
				}
				form.fetchURL = `${this.info.api}/guilds/templates/${code}`;
			});
		}
		full.show();
		if (templateID) {
			const htmlarea = buttons.htmlarea.deref();
			if (htmlarea) buttons.generateHTMLArea(guildcreateFromTemplate, htmlarea);
		}
	}
	async makeGuild(fields: {name: string; icon: string | null}) {
		return await (
			await fetch(`${this.info.api}/guilds`, {
				method: "POST",
				headers: this.headers,
				body: JSON.stringify(fields),
			})
		).json();
	}
	async guildDiscovery() {
		const content = document.createElement("div");
		content.classList.add("flexttb", "guildy");
		content.textContent = I18n.getTranslation("guild.loadingDiscovery");
		const full = new Dialog("");
		full.options.addHTMLArea(content);
		full.show();

		const res = await fetch(`${this.info.api}/discoverable-guilds?limit=50`, {
			headers: this.headers,
		});
		const json = await res.json();
		console.log([...json.guilds], json.guilds);
		//@ts-ignore
		json.guilds = json.guilds.sort((a, b) => {
			return b.member_count - a.member_count;
		});
		content.innerHTML = "";
		const title = document.createElement("h2");
		title.textContent = I18n.getTranslation("guild.disoveryTitle", `${json.guilds.length}`);
		content.appendChild(title);

		const guilds = document.createElement("div");
		guilds.id = "discovery-guild-content";

		json.guilds.forEach((guild: guildjson["properties"]) => {
			const content = document.createElement("div");
			content.classList.add("discovery-guild");

			if (guild.banner) {
				const banner = createImg(
					`${this.info.cdn}/icons/${guild.id}/${guild.banner}.png?size=256`,
				);
				banner.classList.add("banner");
				banner.crossOrigin = "anonymous";
				banner.alt = "";
				content.appendChild(banner);
			}

			const nameContainer = document.createElement("div");
			nameContainer.classList.add("flex");
			const img = createImg(
				this.info.cdn +
					(guild.icon
						? `/icons/${guild.id}/${guild.icon}.png?size=48`
						: "/embed/avatars/3.png"),
			);
			img.classList.add("icon");
			img.crossOrigin = "anonymous";

			img.alt = "";
			nameContainer.appendChild(img);

			const name = document.createElement("h3");
			name.textContent = guild.name;
			nameContainer.appendChild(name);
			content.appendChild(nameContainer);
			const desc = document.createElement("p");
			desc.textContent = guild.description;
			content.appendChild(desc);

			content.addEventListener("click", async () => {
				const joinRes = await fetch(`${this.info.api}/guilds/${guild.id}/members/@me`, {
					method: "PUT",
					headers: this.headers,
				});
				if (joinRes.ok) full.hide();
			});
			guilds.appendChild(content);
		});
		content.appendChild(guilds);
	}
	messageCreate(messagep: messageCreateJson): void {
		messagep.d.guild_id ??= "@me";
		const channel = this.channelids.get(messagep.d.channel_id);
		if (channel) {
			channel.messageCreate(messagep);
			this.unreads();
		}
	}
	unreads(): void {
		for (const thing of this.guilds) {
			if (thing.id === "@me") {
				continue;
			}
			const html = this.guildhtml.get(thing.id);
			thing.unreads(html);
		}
	}
	async typingStart(typing: startTypingjson): Promise<void> {
		const channel = this.channelids.get(typing.d.channel_id);
		if (!channel) return;
		channel.typingStart(typing);
	}
	updatepfp(file: Blob): void {
		const reader = new FileReader();
		reader.readAsDataURL(file);
		reader.onload = () => {
			fetch(`${this.info.api}/users/@me`, {
				method: "PATCH",
				headers: this.headers,
				body: JSON.stringify({
					avatar: reader.result,
				}),
			});
		};
	}
	updatebanner(file: Blob | null): void {
		if (file) {
			const reader = new FileReader();
			reader.readAsDataURL(file);
			reader.onload = () => {
				fetch(`${this.info.api}/users/@me`, {
					method: "PATCH",
					headers: this.headers,
					body: JSON.stringify({
						banner: reader.result,
					}),
				});
			};
		} else {
			fetch(`${this.info.api}/users/@me`, {
				method: "PATCH",
				headers: this.headers,
				body: JSON.stringify({
					banner: null,
				}),
			});
		}
	}
	updateProfile(json: {bio?: string; pronouns?: string; accent_color?: number}) {
		fetch(`${this.info.api}/users/@me/profile`, {
			method: "PATCH",
			headers: this.headers,
			body: JSON.stringify(json),
		});
	}
	async showusersettings() {
		const settings = new Settings(I18n.getTranslation("localuser.settings"));
		{
			const userOptions = settings.addButton(I18n.getTranslation("localuser.userSettings"), {
				ltr: true,
			});
			const hypotheticalProfile = document.createElement("div");
			let file: undefined | File | null;
			let newpronouns: string | undefined;
			let newbio: string | undefined;
			const hypouser = this.user.clone();
			let color: string;
			async function regen() {
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
				(_) => {
					if (file) {
						this.updatepfp(file);
					}
				},
				{clear: true},
			);
			finput.watchForChange((_) => {
				if (!_) {
					file = null;
					hypouser.avatar = null;
					hypouser.hypotheticalpfp = true;
					regen();
					return;
				}
				if (_.length) {
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
				(_) => {
					if (bfile !== undefined) {
						this.updatebanner(bfile);
					}
				},
				{clear: true},
			);
			binput.watchForChange((_) => {
				if (!_) {
					bfile = null;
					hypouser.banner = undefined;
					hypouser.hypotheticalbanner = true;
					regen();
					return;
				}
				if (_.length) {
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
				(_) => {
					if (newpronouns !== undefined || newbio !== undefined || changed !== undefined) {
						this.updateProfile({
							pronouns: newpronouns,
							bio: newbio,
							accent_color: Number.parseInt(`0x${color.substr(1)}`, 16),
						});
					}
				},
				{initText: this.user.pronouns},
			);
			pronounbox.watchForChange((_) => {
				hypouser.pronouns = _;
				newpronouns = _;
				regen();
			});
			const bioBox = settingsLeft.addMDInput(I18n.getTranslation("bio"), (_) => {}, {
				initText: this.user.bio.rawString,
			});
			bioBox.watchForChange((_) => {
				newbio = _;
				hypouser.bio = new MarkDown(_, this);
				regen();
			});

			if (this.user.accent_color) {
				color = `#${this.user.accent_color.toString(16)}`;
			} else {
				color = "transparent";
			}
			const colorPicker = settingsLeft.addColorInput(
				I18n.getTranslation("profileColor"),
				(_) => {},
				{initColor: color},
			);
			colorPicker.watchForChange((_) => {
				console.log();
				color = _;
				hypouser.accent_color = Number.parseInt(`0x${_.substr(1)}`, 16);
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
					(_) => {
						localStorage.setItem("theme", themes[_]);
						setTheme();
					},
					themes,
					{
						defaultIndex: themes.indexOf(localStorage.getItem("theme") as string),
					},
				);
			}
			{
				const initArea = (index: number) => {
					console.log(index === sounds.length - 1);
					if (index === sounds.length - 1) {
						const input = document.createElement("input");
						input.type = "file";
						input.accept = "audio/*";
						input.addEventListener("change", () => {
							if (input.files?.length === 1) {
								const file = input.files[0];

								const reader = new FileReader();
								reader.onload = () => {
									const dataUrl = reader.result;
									if (typeof dataUrl !== "string") return;
									this.perminfo.sound = {};
									try {
										this.perminfo.sound.cSound = dataUrl;
										console.log(this.perminfo.sound.cSound);
										this.playSound("custom");
									} catch (_) {
										alert(I18n.localuser.soundTooLarge());
									}
								};
								reader.readAsDataURL(file);
							}
						});
						area.append(input);
					} else {
						area.innerHTML = "";
					}
				};
				const sounds = [...AVoice.sounds, I18n.localuser.customSound()];
				const initIndex = sounds.indexOf(this.getNotificationSound());
				tas
					.addSelect(
						I18n.getTranslation("localuser.notisound"),
						(index) => {
							this.setNotificationSound(sounds[index]);
						},
						sounds,
						{defaultIndex: initIndex},
					)
					.watchForChange((index) => {
						initArea(index);
						this.playSound(sounds[index]);
					});

				const area = document.createElement("div");
				initArea(initIndex);
				tas.addHTMLArea(area);
			}

			{
				let userinfos = getBulkInfo();
				tas.addColorInput(
					I18n.getTranslation("localuser.accentColor"),
					(_) => {
						userinfos = getBulkInfo();
						userinfos.accent_color = _;
						localStorage.setItem("userinfos", JSON.stringify(userinfos));
						document.documentElement.style.setProperty("--accent-color", userinfos.accent_color);
					},
					{initColor: userinfos.accent_color},
				);
			}
		}
		{
			const update = settings.addButton(I18n.getTranslation("localuser.updateSettings"));
			const sw = update.addSelect(
				I18n.getTranslation("localuser.swSettings"),
				() => {},
				["SWOff", "SWOffline", "SWOn"].map((e) => I18n.getTranslation(`localuser.${e}`)),
				{
					defaultIndex: ["false", "offlineOnly", "true"].indexOf(
						localStorage.getItem("SWMode") as string,
					),
				},
			);
			sw.onchange = (e) => {
				SW.setMode(["false", "offlineOnly", "true"][e] as "false" | "offlineOnly" | "true");
			};
			update.addButtonInput("", I18n.getTranslation("localuser.CheckUpdate"), () => {
				SW.checkUpdate();
			});
			update.addButtonInput("", I18n.getTranslation("localuser.clearCache"), () => {
				SW.forceClear();
			});
		}
		{
			const security = settings.addButton(I18n.getTranslation("localuser.accountSettings"));
			const genSecurity = () => {
				security.removeAll();
				if (this.mfa_enabled) {
					security.addButtonInput("", I18n.getTranslation("localuser.2faDisable"), () => {
						const form = security.addSubForm(
							I18n.getTranslation("localuser.2faDisable"),
							(_: any) => {
								if (_.message) {
									switch (_.code) {
										case 60008:
											form.error("code", I18n.getTranslation("badCode"));
											break;
									}
								} else {
									this.mfa_enabled = false;
									security.returnFromSub();
									genSecurity();
								}
							},
							{
								fetchURL: `${this.info.api}/users/@me/mfa/totp/disable`,
								headers: this.headers,
							},
						);
						form.addTextInput(I18n.getTranslation("localuser.2faCode"), "code", {required: true});
					});
				} else {
					security.addButtonInput("", I18n.getTranslation("localuser.2faEnable"), async () => {
						let secret = "";
						for (let i = 0; i < 18; i++) {
							secret += "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567"[Math.floor(Math.random() * 32)];
						}
						const form = security.addSubForm(
							I18n.getTranslation("localuser.setUp2fa"),
							(_: any) => {
								if (_.message) {
									switch (_.code) {
										case 60008:
											form.error("code", I18n.getTranslation("localuser.badCode"));
											break;
										case 400:
											form.error("password", I18n.getTranslation("localuser.badPassword"));
											break;
									}
								} else {
									genSecurity();
									this.mfa_enabled = true;
									security.returnFromSub();
								}
							},
							{
								fetchURL: `${this.info.api}/users/@me/mfa/totp/enable/`,
								headers: this.headers,
							},
						);
						form.addTitle(I18n.getTranslation("localuser.setUp2faInstruction"));
						form.addText(I18n.getTranslation("localuser.2faCodeGive", secret));
						form.addTextInput(I18n.getTranslation("localuser.password:"), "password", {
							required: true,
							password: true,
						});
						form.addTextInput(I18n.getTranslation("localuser.2faCode"), "code", {required: true});
						form.setValue("secret", secret);
					});
				}
				security.addButtonInput("", I18n.getTranslation("localuser.changeDiscriminator"), () => {
					const form = security.addSubForm(
						I18n.getTranslation("localuser.changeDiscriminator"),
						(_) => {
							security.returnFromSub();
						},
						{
							fetchURL: `${this.info.api}/users/@me/`,
							headers: this.headers,
							method: "PATCH",
						},
					);
					form.addTextInput(I18n.getTranslation("localuser.newDiscriminator"), "discriminator");
				});
				security.addButtonInput("", I18n.getTranslation("localuser.changeEmail"), () => {
					const form = security.addSubForm(
						I18n.getTranslation("localuser.changeEmail"),
						(_) => {
							security.returnFromSub();
						},
						{
							fetchURL: `${this.info.api}/users/@me/`,
							headers: this.headers,
							method: "PATCH",
						},
					);
					form.addTextInput(I18n.getTranslation("localuser.password:"), "password", {
						password: true,
					});
					if (this.mfa_enabled) {
						form.addTextInput(I18n.getTranslation("localuser.2faCode"), "code");
					}
					form.addTextInput(I18n.getTranslation("localuser.newEmail:"), "email");
				});
				security.addButtonInput("", I18n.getTranslation("localuser.changeUsername"), () => {
					const form = security.addSubForm(
						I18n.getTranslation("localuser.changeUsername"),
						(_) => {
							security.returnFromSub();
						},
						{
							fetchURL: `${this.info.api}/users/@me/`,
							headers: this.headers,
							method: "PATCH",
						},
					);
					form.addTextInput(I18n.getTranslation("localuser.password:"), "password", {
						password: true,
					});
					if (this.mfa_enabled) {
						form.addTextInput(I18n.getTranslation("localuser.2faCode"), "code");
					}
					form.addTextInput(I18n.getTranslation("localuser.newUsername"), "username");
				});
				security.addButtonInput("", I18n.getTranslation("localuser.changePassword"), () => {
					const form = security.addSubForm(
						I18n.getTranslation("localuser.changePassword"),
						(_) => {
							security.returnFromSub();
						},
						{
							fetchURL: `${this.info.api}/users/@me/`,
							headers: this.headers,
							method: "PATCH",
						},
					);
					form.addTextInput(I18n.getTranslation("localuser.oldPassword:"), "password", {
						password: true,
					});
					if (this.mfa_enabled) {
						form.addTextInput(I18n.getTranslation("localuser.2faCode"), "code");
					}
					let in1 = "";
					let in2 = "";
					form
						.addTextInput(I18n.getTranslation("localuser.newPassword:"), "")
						.watchForChange((text) => {
							in1 = text;
						});
					const copy = form.addTextInput("New password again:", "");
					copy.watchForChange((text) => {
						in2 = text;
					});
					form.setValue("new_password", () => {
						if (in1 === in2) {
							return in1;
						}
							throw new FormError(copy, I18n.getTranslation("localuser.PasswordsNoMatch"));
					});
				});

				security.addSelect(
					I18n.getTranslation("localuser.language"),
					(e) => {
						I18n.setLanguage(I18n.options()[e]);
						this.updateTranslations();
					},
					[...langmap.values()],
					{
						defaultIndex: I18n.options().indexOf(I18n.lang),
					},
				);
				{
					const box = security.addCheckboxInput(
						I18n.getTranslation("localuser.enableEVoice"),
						() => {},
						{initState: Boolean(localStorage.getItem("Voice enabled"))},
					);
					box.onchange = (e) => {
						if (e) {
							if (confirm(I18n.getTranslation("localuser.VoiceWarning"))) {
								localStorage.setItem("Voice enabled", "true");
							} else {
								box.value = false;
								const checkbox = box.input.deref();
								if (checkbox) {
									checkbox.checked = false;
								}
							}
						} else {
							localStorage.removeItem("Voice enabled");
						}
					};
					const box2 = security.addCheckboxInput("Enable logging of bad stuff", () => {}, {
						initState: Boolean(localStorage.getItem("logbad")),
					});
					box2.onchange = (e) => {
						if (e) {
							if (confirm("this is meant for spacebar devs")) {
								localStorage.setItem("logbad", "true");
							} else {
								box2.value = false;
								const checkbox = box2.input.deref();
								if (checkbox) {
									checkbox.checked = false;
								}
							}
						} else {
							localStorage.removeItem("logbad");
						}
					};
				}
			};
			genSecurity();
		}
		{
			const accessibility = settings.addButton(I18n.accessibility.name());
			accessibility.addCheckboxInput(
				I18n.accessibility.roleColors(),
				(t) => {
					console.log(t);
					this.perminfo.user.disableColors = !t;
				},
				{
					initState: !this.perminfo.user.disableColors,
				},
			);
			const gifSettings = ["hover", "always", "never"] as const;
			accessibility.addSelect(
				I18n.accessibility.playGif(),
				(i) => {
					localStorage.setItem("gifSetting", gifSettings[i]);
				},
				gifSettings.map((_) => I18n.accessibility.gifSettings[_]()),
				{
					defaultIndex:
						((gifSettings as readonly string[]).indexOf(
							localStorage.getItem("gifSetting") as string,
						) + 1 || 1) - 1,
				},
			);
		}
		{
			const connections = settings.addButton(I18n.getTranslation("localuser.connections"));
			const connectionContainer = document.createElement("div");
			connectionContainer.id = "connection-container";

			fetch(`${this.info.api}/connections`, {
				headers: this.headers,
			})
				.then((r) => r.json())
				.then((json) => {
					Object.keys(json)
						.sort((key) => (json[key].enabled ? -1 : 1))
						.forEach((key) => {
							const connection = json[key];

							const container = document.createElement("div");
							container.textContent = key.charAt(0).toUpperCase() + key.slice(1);

							if (connection.enabled) {
								container.addEventListener("click", async () => {
									const connectionRes = await fetch(
										`${this.info.api}/connections/${key}/authorize`,
										{
											headers: this.headers,
										},
									);
									const connectionJSON = await connectionRes.json();
									window.open(connectionJSON.url, "_blank", "noopener noreferrer");
								});
							} else {
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

			fetch(`${this.info.api}/teams`, {
				headers: this.headers,
			}).then(async (teamsRes) => {
				const teams = await teamsRes.json();

				devPortal.addButtonInput("", I18n.getTranslation("localuser.createApp"), () => {
					const form = devPortal.addSubForm(
						I18n.getTranslation("localuser.createApp"),
						(json: any) => {
							if (json.message) form.error("name", json.message);
							else {
								devPortal.returnFromSub();
								this.manageApplication(json.id, devPortal);
							}
						},
						{
							fetchURL: `${this.info.api}/applications`,
							headers: this.headers,
							method: "POST",
						},
					);

					form.addTextInput("Name:", "name", {required: true});
					form.addSelect(
						I18n.getTranslation("localuser.team:"),
						"team_id",
						["Personal", ...teams.map((team: {name: string}) => team.name)],
						{
							defaultIndex: 0,
						},
					);
				});

				const appListContainer = document.createElement("div");
				appListContainer.id = "app-list-container";
				fetch(`${this.info.api}/applications`, {
					headers: this.headers,
				})
					.then((r) => r.json())
					.then((json) => {
						json.forEach(
							(application: {
								cover_image: any;
								icon: any;
								id: string | undefined;
								name: string | number;
								bot: any;
							}) => {
								const container = document.createElement("div");

								if (application.cover_image || application.icon) {
									const cover = createImg(
										`${this.info.cdn}/app-icons/${application.id}/${application.cover_image || application.icon}.png?size=256`,
									);
									cover.alt = "";
									cover.loading = "lazy";
									container.appendChild(cover);
								}

								const name = document.createElement("h2");
								name.textContent = application.name + (application.bot ? " (Bot)" : "");
								container.appendChild(name);

								container.addEventListener("click", async () => {
									this.manageApplication(application.id, devPortal);
								});
								appListContainer.appendChild(container);
							},
						);
					});
				devPortal.addHTMLArea(appListContainer);
			});
		}
		{
			const deleteAccount = settings.addButton(I18n.localuser.deleteAccount()).addForm(
				"",
				(e) => {
					if ("message" in e) {
						if (typeof e.message === "string") {
							throw new FormError(password, e.message);
						}
					} else {
						this.userinfo.remove();
						window.location.href = "/";
					}
				},
				{
					headers: this.headers,
					method: "POST",
					fetchURL: `${this.info.api}/users/@me/delete/`,
					traditionalSubmit: false,
					submitText: I18n.localuser.deleteAccountButton(),
				},
			);
			const shrek = deleteAccount.addTextInput(
				I18n.localuser.areYouSureDelete(I18n.localuser.sillyDeleteConfirmPhrase()),
				"shrek",
			);
			const password = deleteAccount.addTextInput(I18n.localuser["password:"](), "password", {
				password: true,
			});
			deleteAccount.addPreprocessor((obj) => {
				if ("shrek" in obj) {
					if (obj.shrek !== I18n.localuser.sillyDeleteConfirmPhrase()) {
						throw new FormError(shrek, I18n.localuser.mustTypePhrase());
					}
					obj.shrek = undefined;
				} else {
					throw new FormError(shrek, I18n.localuser.mustTypePhrase());
				}
			});
		}
		if (
			this.rights.hasPermission("OPERATOR") ||
			this.rights.hasPermission("CREATE_REGISTRATION_TOKENS")
		) {
			const manageInstance = settings.addButton(I18n.localuser.manageInstance());
			if (this.rights.hasPermission("OPERATOR")) {
				manageInstance.addButtonInput("", I18n.manageInstance.stop(), () => {
					const menu = new Dialog("");
					const options = menu.float.options;
					options.addTitle(I18n.manageInstance.AreYouSureStop());
					const yesno = options.addOptions("", {ltr: true});
					yesno.addButtonInput("", I18n.yes(), () => {
						fetch(`${this.info.api}/stop`, {headers: this.headers, method: "POST"});
						menu.hide();
					});
					yesno.addButtonInput("", I18n.no(), () => {
						menu.hide();
					});
					menu.show();
				});
			}
			if (this.rights.hasPermission("CREATE_REGISTRATION_TOKENS")) {
				manageInstance.addButtonInput("", I18n.manageInstance.createTokens(), () => {
					const tokens = manageInstance.addSubOptions(I18n.manageInstance.createTokens(), {
						noSubmit: true,
					});
					const count = tokens.addTextInput(I18n.manageInstance.count(), () => {}, {
						initText: "1",
					});
					const length = tokens.addTextInput(I18n.manageInstance.length(), () => {}, {
						initText: "32",
					});
					const format = tokens.addSelect(
						I18n.manageInstance.format(),
						() => {},
						[
							I18n.manageInstance.TokenFormats.JSON(),
							I18n.manageInstance.TokenFormats.plain(),
							I18n.manageInstance.TokenFormats.URLs(),
						],
						{
							defaultIndex: 2,
						},
					);
					format.watchForChange((e) => {
						if (e !== 2) {
							urlOption.removeAll();
						} else {
							makeURLMenu();
						}
					});
					const urlOption = tokens.addOptions("");
					const urlOptionsJSON = {
						url: window.location.origin,
						type: "Jank",
					};
					function makeURLMenu() {
						urlOption
							.addTextInput(I18n.manageInstance.clientURL(), () => {}, {
								initText: urlOptionsJSON.url,
							})
							.watchForChange((str) => {
								urlOptionsJSON.url = str;
							});
						urlOption
							.addSelect(
								I18n.manageInstance.regType(),
								() => {},
								["Jank", I18n.manageInstance.genericType()],
								{
									defaultIndex: ["Jank", "generic"].indexOf(urlOptionsJSON.type),
								},
							)
							.watchForChange((i) => {
								urlOptionsJSON.type = ["Jank", "generic"][i];
							});
					}
					makeURLMenu();
					tokens.addButtonInput("", I18n.manageInstance.create(), async () => {
						const params = new URLSearchParams();
						params.set("count", count.value);
						params.set("length", length.value);
						const json = (await (
							await fetch(
								`${this.info.api}/auth/generate-registration-tokens?${params.toString()}`,
								{
									headers: this.headers,
								},
							)
						).json()) as {tokens: string[]};
						if (format.index === 0) {
							pre.textContent = JSON.stringify(json.tokens);
						} else if (format.index === 1) {
							pre.textContent = json.tokens.join("\n");
						} else if (format.index === 2) {
							if (urlOptionsJSON.type === "Jank") {
								const options = new URLSearchParams();
								options.set("instance", this.info.wellknown);
								pre.textContent = json.tokens
									.map((token) => {
										options.set("token", token);
										return `${urlOptionsJSON.url}/register?${options.toString()}`;
									})
									.join("\n");
							} else {
								const options = new URLSearchParams();
								pre.textContent = json.tokens
									.map((token) => {
										options.set("token", token);
										return `${urlOptionsJSON.url}/register?${options.toString()}`;
									})
									.join("\n");
							}
						}
					});
					tokens.addButtonInput("", I18n.manageInstance.copy(), async () => {
						try {
							if (pre.textContent) {
								await navigator.clipboard.writeText(pre.textContent);
							}
						} catch (err) {
							console.error(err);
						}
					});
					const pre = document.createElement("pre");
					tokens.addHTMLArea(pre);
				});
			}
		}
		(async () => {
			const jankInfo = settings.addButton(I18n.jankInfo());
			const img = document.createElement("img");
			img.src = "/logo.svg";
			jankInfo.addHTMLArea(img);
			img.width = 128;
			img.height = 128;
			const ver = await (await fetch("/getupdates")).text();
			jankInfo.addMDText(I18n.clientDesc(ver, window.location.origin, `${this.rights.allow}`));
			jankInfo.addButtonInput("", I18n.instInfo(), () => {
				this.instanceStats();
			});
		})();
		settings.show();
	}
	readonly botTokens: Map<string, string> = new Map();
	async manageApplication(appId, container: Options) {
		if (this.perminfo.applications) {
			for (const item of Object.keys(this.perminfo.applications)) {
				this.botTokens.set(item, this.perminfo.applications[item]);
			}
		}
		const res = await fetch(`${this.info.api}/applications/${appId}`, {
			headers: this.headers,
		});
		const json = await res.json();
		const form = container.addSubForm(json.name, () => {}, {
			fetchURL: `${this.info.api}/applications/${appId}`,
			method: "PATCH",
			headers: this.headers,
			traditionalSubmit: true,
		});
		form.addTextInput(I18n.getTranslation("localuser.appName"), "name", {initText: json.name});
		form.addMDInput(I18n.getTranslation("localuser.description"), "description", {
			initText: json.description,
		});
		form.addFileInput("Icon:", "icon");
		form.addTextInput(I18n.getTranslation("localuser.privacyPolcyURL"), "privacy_policy_url", {
			initText: json.privacy_policy_url,
		});
		form.addTextInput(I18n.getTranslation("localuser.TOSURL"), "terms_of_service_url", {
			initText: json.terms_of_service_url,
		});
		form.addCheckboxInput(I18n.getTranslation("localuser.publicAvaliable"), "bot_public", {
			initState: json.bot_public,
		});
		form.addCheckboxInput(I18n.getTranslation("localuser.requireCode"), "bot_require_code_grant", {
			initState: json.bot_require_code_grant,
		});
		form.addButtonInput(
			"",
			I18n.getTranslation(`localuser.${json.bot ? "manageBot" : "addBot"}`),
			async () => {
				if (!json.bot) {
					if (!confirm(I18n.getTranslation("localuser.confirmAddBot"))) {
						return;
					}
					const updateRes = await fetch(`${this.info.api}/applications/${appId}/bot`, {
						method: "POST",
						headers: this.headers,
					});
					const updateJSON = await updateRes.json();
					this.botTokens.set(appId, updateJSON.token);
				}
				this.manageBot(appId, form);
			},
		);
	}
	async manageBot(appId, container: Form) {
		const res = await fetch(`${this.info.api}/applications/${appId}`, {
			headers: this.headers,
		});
		const json = await res.json();
		if (!json.bot) {
			return alert(I18n.getTranslation("localuser.confuseNoBot"));
		}
		const bot: mainuserjson = json.bot;
		const form = container.addSubForm(
			I18n.getTranslation("localuser.editingBot", bot.username),
			(out) => {
				console.log(out);
			},
			{
				method: "PATCH",
				fetchURL: `${this.info.api}/applications/${appId}/bot`,
				headers: this.headers,
				traditionalSubmit: true,
			},
		);
		form.addTextInput(I18n.getTranslation("localuser.botUsername"), "username", {
			initText: bot.username,
		});
		form.addFileInput(I18n.getTranslation("localuser.botAvatar"), "avatar");
		form.addButtonInput("", I18n.getTranslation("localuser.resetToken"), async () => {
			if (!confirm(I18n.getTranslation("localuser.confirmReset"))) {
				return;
			}
			const updateRes = await fetch(`${this.info.api}/applications/${appId}/bot/reset`, {
				method: "POST",
				headers: this.headers,
			});
			const updateJSON = await updateRes.json();
			text.setText(I18n.getTranslation("localuser.tokenDisplay", updateJSON.token));
			this.botTokens.set(appId, updateJSON.token);
			if (this.perminfo.applications[appId]) {
				this.perminfo.applications[appId] = updateJSON.token;
			}
		});
		const text = form.addText(
			I18n.getTranslation(
				"localuser.tokenDisplay",
				this.botTokens.has(appId) ? (this.botTokens.get(appId) as string) : "*****************",
			),
		);
		const check = form.addOptions("", {noSubmit: true});
		if (!this.perminfo.applications) {
			this.perminfo.applications = {};
		}
		const checkbox = check.addCheckboxInput(I18n.getTranslation("localuser.saveToken"), () => {}, {
			initState: !!this.perminfo.applications[appId],
		});
		checkbox.watchForChange((_) => {
			if (_) {
				if (this.botTokens.has(appId)) {
					this.perminfo.applications[appId] = this.botTokens.get(appId);
				} else {
					alert(I18n.getTranslation("localuser.noToken"));
					checkbox.setState(false);
				}
			} else {
				delete this.perminfo.applications[appId];
			}
		});
		form.addButtonInput("", I18n.getTranslation("localuser.advancedBot"), () => {
			const token = this.botTokens.get(appId);
			if (token) {
				const botc = new Bot(bot, token, this);
				botc.settings();
			}
		});
		form.addButtonInput("", I18n.getTranslation("localuser.botInviteCreate"), () => {
			Bot.InviteMaker(appId, form, this.info);
		});
	}
	readonly autofillregex = Object.freeze(/[@#:]([a-z0-9 ]*)$/i);
	mdBox() {
		const typebox = document.getElementById("typebox") as CustomHTMLDivElement;
		const typeMd = typebox.markdown;
		typeMd.owner = this;
		typeMd.onUpdate = (str, pre) => {
			this.search(document.getElementById("searchOptions") as HTMLDivElement, typeMd, str, pre);
		};
	}
	async pinnedClick(rect: DOMRect) {
		if (!this.channelfocus) return;
		await this.channelfocus.pinnedClick(rect);
	}
	async makeStickerBox(rect: DOMRect) {
		const sticker = await Sticker.stickerPicker(
			-0 + rect.right - window.innerWidth,
			-20 + rect.top - window.innerHeight,
			this,
		);
		console.log(sticker);
		if (this.channelfocus) {
			this.channelfocus.sendMessage("", {
				embeds: [],
				attachments: [],
				sticker_ids: [sticker.id],
				replyingto: this.channelfocus.replyingto,
			});
			this.channelfocus.replyingto = null;
		}
	}
	async makeGifBox(rect: DOMRect) {
		interface fullgif {
			id: string;
			title: string;
			url: string;
			src: string;
			gif_src: string;
			width: number;
			height: number;
			preview: string;
		}
		const menu = document.createElement("div");
		menu.classList.add("flexttb", "gifmenu");
		menu.style.bottom = `${window.innerHeight - rect.top + 15}px`;
		menu.style.right = `${window.innerWidth - rect.right}px`;
		document.body.append(menu);
		Contextmenu.keepOnScreen(menu);
		if (Contextmenu.currentmenu !== "") {
			Contextmenu.currentmenu.remove();
		}
		Contextmenu.currentmenu = menu;
		const trending = (await (
			await fetch(
				`${this.info.api}/gifs/trending?${new URLSearchParams([["locale", I18n.lang]])}`,
				{headers: this.headers},
			)
		).json()) as {
			categories: {
				name: string;
				src: string;
			}[];
			gifs: [fullgif];
		};
		const gifbox = document.createElement("div");
		gifbox.classList.add("gifbox");
		const search = document.createElement("input");
		let gifs = gifbox;
		const searchBox = async () => {
			gifs.remove();
			if (search.value === "") {
				menu.append(gifbox);
				gifs = gifbox;
				return;
			}
			gifs = document.createElement("div");
			gifs.classList.add("gifbox");
			menu.append(gifs);
			const sValue = search.value;
			const gifReturns = (await (
				await fetch(
					`${this.info.api}/gifs/search?${new URLSearchParams([
							["locale", I18n.lang],
							["q", sValue],
							["limit", "500"],
						])}`,
					{headers: this.headers},
				)
			).json()) as fullgif[];
			if (sValue !== search.value) {
				return;
			}
			let left = 0;
			let right = 0;
			for (const gif of gifReturns) {
				const div = document.createElement("div");
				div.classList.add("gifBox");
				const img = document.createElement("img");
				img.src = gif.gif_src;
				img.alt = gif.title;
				const scale = gif.width / 196;

				img.width = gif.width / scale;
				img.height = gif.height / scale;
				div.append(img);

				if (left <= right) {
					div.style.top = `${left}px`;
					left += Math.ceil(img.height) + 10;
					div.style.left = "5px";
				} else {
					div.style.top = `${right}px`;
					right += Math.ceil(img.height) + 10;
					div.style.left = "210px";
				}

				gifs.append(div);

				div.onclick = () => {
					if (this.channelfocus) {
						this.channelfocus.sendMessage(gif.url, {
							embeds: [],
							attachments: [],
							sticker_ids: [],
							replyingto: this.channelfocus.replyingto,
						});
						menu.remove();
						this.channelfocus.replyingto = null;
					}
				};
			}
			gifs.style.height = `${Math.max(left, right)}px`;
		};
		let last = "";
		search.onkeyup = () => {
			if (last === search.value) {
				return;
			}
			last = search.value;
			searchBox();
		};
		search.classList.add("searchGifBar");
		search.placeholder = I18n.searchGifs();
		for (const category of trending.categories) {
			const div = document.createElement("div");
			div.classList.add("gifPreviewBox");
			const img = document.createElement("img");
			img.src = category.src;
			const title = document.createElement("span");
			title.textContent = category.name;
			div.append(img, title);
			gifbox.append(div);
			div.onclick = (e) => {
				e.stopImmediatePropagation();
				search.value = category.name;
				searchBox();
			};
		}
		menu.append(search, gifbox);
		search.focus();
	}
	async TBEmojiMenu(rect: DOMRect) {
		const typebox = document.getElementById("typebox") as CustomHTMLDivElement;
		const p = saveCaretPosition(typebox);
		if (!p) return;
		const original = MarkDown.getText();

		const emoji = await Emoji.emojiPicker(
			-0 + rect.right - window.innerWidth,
			-20 + rect.top - window.innerHeight,
			this,
		);
		p();
		const md = typebox.markdown;
		this.MDReplace(
			emoji.id
				? `<${emoji.animated ? "a" : ""}:${emoji.name}:${emoji.id}>`
				: (emoji.emoji as string),
			original,
			md,
			null,
		);
	}
	MDReplace(
		replacewith: string,
		original: string,
		typebox: MarkDown,
		start: RegExp | null = this.autofillregex,
	) {
		let raw = typebox.rawString;
		const empty = raw.length === 0;
		raw = original !== "" ? raw.split(original)[1] : raw;
		if (raw === undefined && !empty) return;
		if (empty) {
			raw = "";
		}
		raw = (start ? original.replace(start, "") : original) + replacewith + raw;

		typebox.txt = raw.split("");
		const match = start ? original.match(start) : true;
		if (match) {
			typebox.boxupdate(
				replacewith.length - (match === true ? 0 : match[0].length),
				false,
				original.length,
			);
		}
	}
	MDSearchOptions(
		options: [string, string, undefined | HTMLElement][],
		original: string,
		div: HTMLDivElement,
		typebox: MarkDown,
	) {
		if (!div) return;
		div.innerHTML = "";
		let i = 0;
		const htmloptions: HTMLSpanElement[] = [];
		for (const thing of options) {
			if (i === 8) {
				break;
			}
			i++;
			const span = document.createElement("span");
			htmloptions.push(span);
			if (thing[2]) {
				span.append(thing[2]);
			}

			span.append(thing[0]);
			span.onclick = (e) => {
				if (e) {
					const selection = window.getSelection() as Selection;
					const box = typebox.box.deref();
					if (!box) return;
					if (selection) {
						const pos = getTextNodeAtPosition(
							box,
							original.length -
								(original.match(this.autofillregex) as RegExpMatchArray)[0].length +
								thing[1].length,
						);
						selection.removeAllRanges();
						const range = new Range();
						range.setStart(pos.node, pos.position);
						selection.addRange(range);
					}
					e.preventDefault();
					box.focus();
				}
				this.MDReplace(thing[1], original, typebox);
				div.innerHTML = "";
				remove();
			};
			div.prepend(span);
		}
		const remove = () => {
			if (div && div.innerHTML === "") {
				this.keyup = () => false;
				this.keydown = () => {};
				return true;
			}
			return false;
		};
		if (htmloptions[0]) {
			let curindex = 0;
			let cur = htmloptions[0];
			cur.classList.add("selected");
			const cancel = new Set(["ArrowUp", "ArrowDown", "Enter", "Tab"]);
			this.keyup = (event) => {
				if (remove()) return false;
				if (cancel.has(event.key)) {
					switch (event.key) {
						case "ArrowUp":
							if (htmloptions[curindex + 1]) {
								cur.classList.remove("selected");
								curindex++;
								cur = htmloptions[curindex];
								cur.classList.add("selected");
							}
							break;
						case "ArrowDown":
							if (htmloptions[curindex - 1]) {
								cur.classList.remove("selected");
								curindex--;
								cur = htmloptions[curindex];
								cur.classList.add("selected");
							}
							break;
						case "Enter":
						case "Tab":
							cur.click();
							break;
					}
					return true;
				}
				return false;
			};
			this.keydown = (event) => {
				if (remove()) return;
				if (cancel.has(event.key)) {
					event.preventDefault();
				}
			};
		} else {
			remove();
		}
	}
	MDFindChannel(name: string, orginal: string, box: HTMLDivElement, typebox: MarkDown) {
		const maybe: [number, Channel][] = [];
		if (this.lookingguild && this.lookingguild.id !== "@me") {
			for (const channel of this.lookingguild.channels) {
				const confidence = channel.similar(name);
				if (confidence > 0) {
					maybe.push([confidence, channel]);
				}
			}
		}
		maybe.sort((a, b) => b[0] - a[0]);
		this.MDSearchOptions(
			maybe.map((a) => [`# ${a[1].name}`, `<#${a[1].id}> `, undefined]),
			orginal,
			box,
			typebox,
		);
	}
	async getUser(id: string) {
		if (this.userMap.has(id)) {
			return this.userMap.get(id) as User;
		}
		return new User(await (await fetch(`${this.info.api}/users/${id}`)).json(), this);
	}
	MDFineMentionGen(name: string, original: string, box: HTMLDivElement, typebox: MarkDown) {
		const members: [Member, number][] = [];
		if (this.lookingguild) {
			for (const member of this.lookingguild.members) {
				const rank = member.compare(name);
				if (rank > 0) {
					members.push([member, rank]);
				}
			}
		}
		members.sort((a, b) => b[1] - a[1]);
		this.MDSearchOptions(
			members.map((a) => [`@${a[0].name}`, `<@${a[0].id}> `, undefined]),
			original,
			box,
			typebox,
		);
	}
	MDFindMention(name: string, original: string, box: HTMLDivElement, typebox: MarkDown) {
		if (this.ws && this.lookingguild) {
			this.MDFineMentionGen(name, original, box, typebox);
			const nonce = `${Math.floor(Math.random() * 10 ** 8)}`;
			if (this.lookingguild.member_count <= this.lookingguild.members.size) return;
			this.ws.send(
				JSON.stringify({
					op: 8,
					d: {
						guild_id: [this.lookingguild.id],
						query: name,
						limit: 8,
						presences: true,
						nonce,
					},
				}),
			);
			this.searchMap.set(nonce, async (e) => {
				console.log(e);
				if (e.members?.[0]) {
					if (e.members[0].user) {
						for (const thing of e.members) {
							await Member.new(thing, this.lookingguild as Guild);
						}
					} else {
						const prom1: Promise<User>[] = [];
						for (const thing of e.members) {
							prom1.push(this.getUser(thing.id));
						}
						Promise.all(prom1);
						for (const thing of e.members) {
							if (!this.userMap.has(thing.id)) {
								console.warn("Dumb server bug for this member", thing);
								continue;
							}
							await Member.new(thing, this.lookingguild as Guild);
						}
					}
					if (!typebox.rawString.startsWith(original)) return;
					this.MDFineMentionGen(name, original, box, typebox);
				}
			});
		}
	}
	findEmoji(search: string, orginal: string, box: HTMLDivElement, typebox: MarkDown) {
		const emj = Emoji.searchEmoji(search, this, 10);
		const map = emj.map(([emoji]): [string, string, HTMLElement] => {
			return [
				emoji.name,
				emoji.id
					? `<${emoji.animated ? "a" : ""}:${emoji.name}:${emoji.id}>`
					: (emoji.emoji as string),
				emoji.getHTML(),
			];
		});
		this.MDSearchOptions(map, orginal, box, typebox);
	}
	search(box: HTMLDivElement, md: MarkDown, str: string, pre: boolean) {
		if (!pre) {
			const match = str.match(this.autofillregex);

			if (match) {
				const [type, search] = [match[0][0], match[0].split(/@|#|:/)[1]];
				switch (type) {
					case "#":
						this.MDFindChannel(search, str, box, md);
						break;
					case "@":
						this.MDFindMention(search, str, box, md);
						break;
					case ":":
						if (search.length >= 2) {
							this.findEmoji(search, str, box, md);
						} else {
							this.MDSearchOptions([], "", box, md);
						}
						break;
					default:
						return;
				}
				return;
			}
		}
		box.innerHTML = "";
	}
	searching = false;
	updateTranslations() {
		const searchBox = document.getElementById("searchBox") as HTMLDivElement;
		searchBox.style.setProperty("--hint-text", JSON.stringify(I18n.search.search()));
	}
	curSearch?: symbol;
	mSearch(query: string) {
		const searchy = Symbol("search");
		this.curSearch = searchy;
		const p = new URLSearchParams("?");
		this.searching = true;
		p.set("content", query.trim());
		p.set("sort_by", "timestamp");
		p.set("sort_order", "desc");
		let maxpage: undefined | number = undefined;
		const sideDiv = document.getElementById("sideDiv");
		const sideContainDiv = document.getElementById("sideContainDiv");
		if (!sideDiv || !sideContainDiv) return;
		const genPage = (page: number) => {
			p.set("offset", `${page * 50}`);
			fetch(`${this.info.api}/guilds/${this.lookingguild?.id}/messages/search/?${p.toString()}`, {
				headers: this.headers,
			})
				.then((_) => _.json())
				.then((json: {messages: [messagejson][]; total_results: number}) => {
					if (this.curSearch !== searchy) {
						return;
					}
					//FIXME total_results shall be ignored as it's known to be bad, spacebar bug.
					const messages = json.messages
						.map(([m]) => {
							const c = this.channelids.get(m.channel_id);
							if (!c) return;
							if (c.messages.get(m.id)) {
								return c.messages.get(m.id);
							}
							return new Message(m, c, true);
						})
						.filter((_) => _ !== undefined);
					sideDiv.innerHTML = "";
					if (messages.length === 0 && page !== 0) {
						maxpage = page - 1;
						genPage(page - 1);
						return;
					}if (messages.length !== 50) {
						maxpage = page;
					}
					const sortBar = document.createElement("div");
					sortBar.classList.add("flexltr", "sortBar");

					const newB = document.createElement("button");
					const old = document.createElement("button");
					[newB.textContent, old.textContent] = [I18n.search.new(), I18n.search.old()];
					old.onclick = () => {
						p.set("sort_order", "asc");
						deleteMessages();
						genPage(0);
					};
					newB.onclick = () => {
						p.set("sort_order", "desc");
						deleteMessages();
						genPage(0);
					};
					if (p.get("sort_order") === "asc") {
						old.classList.add("selectedB");
					} else {
						newB.classList.add("selectedB");
					}

					const spaceElm = document.createElement("div");
					spaceElm.classList.add("spaceElm");

					sortBar.append(I18n.search.page(`${page + 1}`), spaceElm, newB, old);

					sideDiv.append(sortBar);

					sideContainDiv.classList.add("searchDiv");
					let channel: Channel | undefined = undefined;
					function deleteMessages() {
						for (const elm of htmls) elm.remove();
					}
					const htmls: HTMLElement[] = [];
					sideContainDiv.classList.remove("hideSearchDiv");
					for (const message of messages) {
						if (channel !== message.channel) {
							channel = message.channel;
							const h3 = document.createElement("h3");
							h3.textContent = channel.name;
							h3.classList.add("channelSTitle");
							sideDiv.append(h3);
							htmls.push(h3);
						}
						const html = message.buildhtml(undefined, true);
						html.addEventListener("click", async () => {
							try {
								sideContainDiv.classList.add("hideSearchDiv");
								await message.channel.focus(message.id);
							} catch (e) {
								console.error(e);
							}
						});
						sideDiv.append(html);
						htmls.push(html);
					}
					if (messages.length === 0) {
						const noMs = document.createElement("h3");
						noMs.textContent = I18n.search.nofind();
						sideDiv.append(noMs);
					}
					const bottombuttons = document.createElement("div");
					bottombuttons.classList.add("flexltr", "searchNavButtons");
					const next = document.createElement("button");
					if (page === maxpage) next.disabled = true;
					next.onclick = () => {
						deleteMessages();
						genPage(page + 1);
					};
					const prev = document.createElement("button");
					prev.onclick = () => {
						deleteMessages();
						genPage(page - 1);
					};
					if (page === 0) prev.disabled = true;
					[next.textContent, prev.textContent] = [I18n.search.next(), I18n.search.back()];
					bottombuttons.append(prev, next);
					sideDiv.append(bottombuttons);
					sideDiv.scrollTo({top: 0, behavior: "instant"});
				});
		};
		if (query === "") {
			sideContainDiv.classList.remove("searchDiv");
			sideContainDiv.classList.remove("hideSearchDiv");
			sideDiv.innerHTML = "";
			this.searching = false;
			this.getSidePannel();
			return;
		}
		genPage(0);
	}

	keydown: (event: KeyboardEvent) => unknown = () => {};
	keyup: (event: KeyboardEvent) => boolean = () => false;
	//---------- resolving members code -----------
	readonly waitingmembers = new Map<
		string,
		Map<string, (returns: memberjson | undefined) => void>
	>();
	readonly presences: Map<string, presencejson> = new Map();
	async resolvemember(id: string, guildid: string): Promise<memberjson | undefined> {
		if (guildid === "@me") {
			return undefined;
		}
		const guild = this.guildids.get(guildid);
		const borked = true;
		if (!guild || (borked && guild.member_count > 250)) {
			//sorry puyo, I need to fix member resolving while it's broken on large guilds
			try {
				const req = await fetch(`${this.info.api}/guilds/${guildid}/members/${id}`, {
					headers: this.headers,
				});
				if (req.status !== 200) {
					return undefined;
				}
				return await req.json();
			} catch {
				return undefined;
			}
		}
		let guildmap = this.waitingmembers.get(guildid);
		if (!guildmap) {
			guildmap = new Map();
			this.waitingmembers.set(guildid, guildmap);
		}
		const promise: Promise<memberjson | undefined> = new Promise((res) => {
			guildmap.set(id, res);
			this.getmembers();
		});
		return await promise;
	}
	fetchingmembers: Map<string, boolean> = new Map();
	noncemap: Map<string, (r: [memberjson[], string[]]) => void> = new Map();
	noncebuild: Map<string, [memberjson[], string[], number[]]> = new Map();
	searchMap = new Map<
		string,
		(arg: {
			chunk_index: number;
			chunk_count: number;
			nonce: string;
			not_found?: string[];
			members?: memberjson[];
			presences: presencejson[];
		}) => unknown
	>();
	async gotChunk(chunk: {
		chunk_index: number;
		chunk_count: number;
		nonce: string;
		not_found?: string[];
		members?: memberjson[];
		presences: presencejson[];
	}) {
		for (const thing of chunk.presences) {
			if (thing.user) {
				this.presences.set(thing.user.id, thing);
			}
		}
		if (this.searchMap.has(chunk.nonce)) {
			const func = this.searchMap.get(chunk.nonce);
			this.searchMap.delete(chunk.nonce);
			if (func) {
				func(chunk);
				return;
			}
		}
		chunk.members ??= [];
		const arr = this.noncebuild.get(chunk.nonce);
		if (!arr) return;
		arr[0] = arr[0].concat(chunk.members);
		if (chunk.not_found) {
			arr[1] = chunk.not_found;
		}
		arr[2].push(chunk.chunk_index);
		if (arr[2].length === chunk.chunk_count) {
			this.noncebuild.delete(chunk.nonce);
			const func = this.noncemap.get(chunk.nonce);
			if (!func) return;
			func([arr[0], arr[1]]);
			this.noncemap.delete(chunk.nonce);
		}
	}
	async getmembers() {
		const promise = new Promise((res) => {
			setTimeout(res, 10);
		});
		await promise; //allow for more to be sent at once :P
		if (this.ws) {
			this.waitingmembers.forEach(async (value, guildid) => {
				const keys = value.keys();
				if (this.fetchingmembers.has(guildid)) {
					return;
				}
				const build: string[] = [];
				for (const key of keys) {
					build.push(key);
					if (build.length === 100) {
						break;
					}
				}
				if (!build.length) {
					this.waitingmembers.delete(guildid);
					return;
				}
				const promise: Promise<[memberjson[], string[]]> = new Promise((res) => {
					const nonce = `${Math.floor(Math.random() * 100000000000)}`;
					this.noncemap.set(nonce, res);
					this.noncebuild.set(nonce, [[], [], []]);
					if (!this.ws) return;
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
						}),
					);
					this.fetchingmembers.set(guildid, true);
				});
				const prom = await promise;
				const data = prom[0];
				for (const thing of data) {
					if (value.has(thing.id)) {
						const func = value.get(thing.id);
						if (!func) {
							value.delete(thing.id);
							continue;
						}
						func(thing);
						value.delete(thing.id);
					}
				}
				for (const thing of prom[1]) {
					if (value.has(thing)) {
						const func = value.get(thing);
						if (!func) {
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
	async pingEndpoint() {
		const userInfo = getBulkInfo();
		if (!userInfo.instances) userInfo.instances = {};
		const wellknown = this.info.wellknown;
		if (!userInfo.instances[wellknown]) {
			const pingRes = await fetch(`${this.info.api}/ping`);
			const pingJSON = await pingRes.json();
			userInfo.instances[wellknown] = pingJSON;
			localStorage.setItem("userinfos", JSON.stringify(userInfo));
		}
		this.instancePing = userInfo.instances[wellknown].instance;

		this.pageTitle("Loading...");
	}
	pageTitle(channelName = "", guildName = "") {
		(document.getElementById("channelname") as HTMLSpanElement).textContent = channelName;
		(document.getElementsByTagName("title")[0] as HTMLTitleElement).textContent =
			`${channelName +
			(guildName ? ` | ${guildName}` : "")} | ${this.instancePing.name} | Jank Client`;
	}
	async instanceStats() {
		const dialog = new Dialog("");
		dialog.options.addTitle(I18n.getTranslation("instanceStats.name", this.instancePing.name));
		dialog.show();
		const res = await fetch(`${this.info.api}/policies/stats`, {
			headers: this.headers,
		});
		const json = await res.json();
		dialog.options.addText(I18n.getTranslation("instanceStats.users", json.counts.user));
		dialog.options.addText(I18n.getTranslation("instanceStats.servers", json.counts.guild));
		dialog.options.addText(I18n.getTranslation("instanceStats.messages", json.counts.message));
		dialog.options.addText(I18n.getTranslation("instanceStats.members", json.counts.members));
	}
	setNotificationSound(sound: string) {
		const userinfos = getBulkInfo();
		userinfos.preferences.notisound = sound;
		localStorage.setItem("userinfos", JSON.stringify(userinfos));
	}
	playSound(name = this.getNotificationSound()) {
		if (this.play) {
			const voice = this.play.audios.get(name);
			if (voice) {
				voice.play();
			} else if (this.perminfo.sound?.cSound) {
				const audio = document.createElement("audio");
				audio.src = this.perminfo.sound.cSound;
				audio.play().catch();
			}
		}
	}
	getNotificationSound() {
		const userinfos = getBulkInfo();
		return userinfos.preferences.notisound;
	}
}
export {Localuser};
