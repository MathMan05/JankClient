import {Contextmenu} from "./contextmenu.js";
import {Guild} from "./guild.js";
import {Hover} from "./hover.js";
import type {emojijson} from "./jsontypes.js";
import type {Localuser} from "./localuser.js";
import {BinRead} from "./utils/binaryUtils.js";

//I need to recompile the emoji format for translation
class Emoji {
	static emojis: {
		name: string;
		emojis: {
			name: string;
			emoji: string;
		}[];
	}[];
	name: string;
	id?: string;
	emoji?: string;
	animated: boolean;
	owner: Guild | Localuser;
	get guild() {
		if (this.owner instanceof Guild) {
			return this.owner;
		}
		return null;
	}
	get localuser() {
		if (this.owner instanceof Guild) {
			return this.owner.localuser;
		}
			return this.owner;
	}
	get info() {
		return this.owner.info;
	}
	constructor(json: emojijson, owner: Guild | Localuser) {
		this.name = json.name;
		this.id = json.id;
		this.animated = json.animated || false;
		this.owner = owner;
		this.emoji = json.emoji;
	}
	get humanName() {
		if (this.id) {
			const trim = this.name.split(":")[1];
			if (trim) {
				return trim;
			}
		}
		return this.name;
	}
	getHTML(bigemoji = false) {
		if (this.id) {
			const emojiElem = document.createElement("img");
			emojiElem.classList.add("md-emoji");
			emojiElem.classList.add(bigemoji ? "bigemoji" : "smallemoji");
			emojiElem.crossOrigin = "anonymous";
			emojiElem.src =
				`${this.info.cdn}/emojis/${this.id}.${this.animated ? "gif" : "png"}?size=32`;
			emojiElem.alt = this.name;
			emojiElem.loading = "lazy";

			const hover = new Hover(this.humanName);
			hover.addEvent(emojiElem);

			return emojiElem;
		}if (this.emoji) {
			const emojiElem = document.createElement("span");
			emojiElem.classList.add("md-emoji");
			emojiElem.classList.add(bigemoji ? "bigemoji" : "smallemoji");
			emojiElem.textContent = this.emoji;

			const hover = new Hover(this.humanName);
			hover.addEvent(emojiElem);

			return emojiElem;
		}
			throw new Error("This path should *never* be gone down, this means a malformed emoji");
	}
	static decodeEmojiList(buffer: ArrayBuffer) {
		const reader = new BinRead(buffer);
		const build: {name: string; emojis: {name: string; emoji: string}[]}[] = [];
		let cats = reader.read16();

		for (; cats !== 0; cats--) {
			const name = reader.readString16();
			const emojis: {
				name: string;
				skin_tone_support: boolean;
				emoji: string;
			}[] = [];
			let emojinumber = reader.read16();
			for (; emojinumber !== 0; emojinumber--) {
				//console.log(emojis);
				const name = reader.readString8();
				const len = reader.read8();
				const skin_tone_support = len > 127;
				const emoji = reader.readStringNo(len - Number(skin_tone_support) * 128);
				emojis.push({
					name,
					skin_tone_support,
					emoji,
				});
			}
			build.push({
				name,
				emojis,
			});
		}
		Emoji.emojis = build;
	}
	static grabEmoji() {
		fetch("/emoji.bin")
			.then((e) => {
				return e.arrayBuffer();
			})
			.then((e) => {
				Emoji.decodeEmojiList(e);
			});
	}
	static getEmojiFromIDOrString(idOrString: string, localuser: Localuser) {
		for (const list of Emoji.emojis) {
			const emj = list.emojis.find((_) => _.emoji === idOrString);
			if (emj) {
				return new Emoji(emj, localuser);
			}
		}
		for (const guild of localuser.guilds) {
			if (!guild.emojis) continue;
			const emj = guild.emojis.find((_) => _.id === idOrString);
			if (emj) {
				return new Emoji(emj, localuser);
			}
		}
		return new Emoji(
			{
				id: idOrString,
				name: "",
			},
			localuser,
		);
	}
	static async emojiPicker(
		this: typeof Emoji,
		x: number,
		y: number,
		localuser: Localuser,
	): Promise<Emoji> {
		let res: (r: Emoji) => void;
		Emoji;
		const promise: Promise<Emoji> = new Promise((r) => {
			res = r;
		});
		const menu = document.createElement("div");
		menu.classList.add("flexttb", "emojiPicker");
		if (y > 0) {
			menu.style.top = `${y}px`;
		} else {
			menu.style.bottom = `${y * -1}px`;
		}
		if (x > 0) {
			menu.style.left = `${x}px`;
		} else {
			menu.style.right = `${x * -1}px`;
		}

		const topBar = document.createElement("div");
		topBar.classList.add("flexltr", "emojiHeading");

		const title = document.createElement("h2");
		title.textContent = Emoji.emojis[0].name;
		title.classList.add("emojiTitle");
		topBar.append(title);

		const search = document.createElement("input");
		search.type = "text";
		topBar.append(search);

		let html: HTMLElement | undefined = undefined;
		let topEmoji: undefined | Emoji = undefined;
		function updateSearch(this: typeof Emoji) {
			if (search.value === "") {
				if (html) html.click();
				search.style.removeProperty("width");
				topEmoji = undefined;
				return;
			}

			search.style.setProperty("width", "3in");
			title.innerText = "";
			body.innerHTML = "";
			const searchResults = this.searchEmoji(search.value, localuser, 200);
			if (searchResults[0]) {
				topEmoji = searchResults[0][0];
			}
			for (const [emoji] of searchResults) {
				const emojiElem = document.createElement("div");
				emojiElem.classList.add("emojiSelect");

				emojiElem.append(emoji.getHTML());
				body.append(emojiElem);

				emojiElem.addEventListener("click", () => {
					res(emoji);
					if (Contextmenu.currentmenu !== "") {
						Contextmenu.currentmenu.remove();
					}
				});
			}
		}
		search.addEventListener("input", () => {
			updateSearch.call(Emoji);
		});
		search.addEventListener("keyup", (e) => {
			if (e.key === "Enter" && topEmoji) {
				res(topEmoji);
				if (Contextmenu.currentmenu !== "") {
					Contextmenu.currentmenu.remove();
				}
			}
		});

		menu.append(topBar);

		const selection = document.createElement("div");
		selection.classList.add("flexltr", "emojirow");
		const body = document.createElement("div");
		body.classList.add("emojiBody");

		let isFirst = true;

		[
			localuser.lookingguild,
			...localuser.guilds
				.filter((guild) => guild.id !== "@me" && guild.emojis.length > 0)
				.filter((guild) => guild !== localuser.lookingguild),
		]
			.filter((guild) => guild !== undefined)
			.forEach((guild) => {
				const select = document.createElement("div");
				select.classList.add("emojiSelect");

				if (guild.properties.icon) {
					const img = document.createElement("img");
					img.classList.add("pfp", "servericon", "emoji-server");
					img.crossOrigin = "anonymous";
					img.src =
						`${localuser.info.cdn}/icons/${guild.properties.id}/${guild.properties.icon}.png?size=48`;
					img.alt = `Server: ${guild.properties.name}`;
					select.appendChild(img);
				} else {
					const div = document.createElement("span");
					div.textContent = guild.properties.name
						.replace(/'s /g, " ")
						.replace(/\w+/g, (word) => word[0])
						.replace(/\s/g, "");
					select.append(div);
				}

				selection.append(select);

				const clickEvent = () => {
					search.value = "";
					updateSearch.call(Emoji);
					title.textContent = guild.properties.name;
					body.innerHTML = "";
					for (const emojit of guild.emojis) {
						const emojiElem = document.createElement("div");
						emojiElem.classList.add("emojiSelect");

						const emojiClass = new Emoji(
							{
								id: emojit.id as string,
								name: emojit.name,
								animated: emojit.animated as boolean,
							},
							localuser,
						);
						emojiElem.append(emojiClass.getHTML());
						body.append(emojiElem);

						emojiElem.addEventListener("click", () => {
							res(emojiClass);
							if (Contextmenu.currentmenu !== "") {
								Contextmenu.currentmenu.remove();
							}
						});
					}
				};

				select.addEventListener("click", clickEvent);
				if (isFirst) {
					clickEvent();
					isFirst = false;
				}
			});

		if (Contextmenu.currentmenu !== "") {
			Contextmenu.currentmenu.remove();
		}
		document.body.append(menu);
		Contextmenu.currentmenu = menu;
		Contextmenu.keepOnScreen(menu);
		let i = 0;
		for (const thing of Emoji.emojis) {
			const select = document.createElement("div");
			select.textContent = thing.emojis[0].emoji;
			select.classList.add("emojiSelect");
			selection.append(select);
			const clickEvent = () => {
				search.value = "";
				updateSearch.call(Emoji);
				title.textContent = thing.name;
				body.innerHTML = "";
				for (const emojit of thing.emojis.map((_) => new Emoji(_, localuser))) {
					const emoji = document.createElement("div");
					emoji.classList.add("emojiSelect");
					emoji.append(emojit.getHTML());
					body.append(emoji);
					emoji.onclick = (_) => {
						res(emojit);
						if (Contextmenu.currentmenu !== "") {
							Contextmenu.currentmenu.remove();
						}
					};
				}
			};
			select.onclick = clickEvent;
			if (i === 0) {
				html = select;
				clickEvent();
			}
			i++;
		}
		menu.append(selection);
		menu.append(body);
		search.focus();
		return promise;
	}
	static searchEmoji(search: string, localuser: Localuser, results = 50): [Emoji, number][] {
		//NOTE this function is used for searching in the emoji picker for reactions, and the emoji auto-fill
		const ranked: [emojijson, number][] = [];
		function similar(json: emojijson) {
			if (json.name.includes(search)) {
				ranked.push([json, search.length / json.name.length]);
				return true;
			}if (json.name.toLowerCase().includes(search.toLowerCase())) {
				ranked.push([json, search.length / json.name.length / 1.4]);
				return true;
			}
				return false;
		}
		for (const group of Emoji.emojis) {
			for (const emoji of group.emojis) {
				similar(emoji);
			}
		}
		const weakGuild = new WeakMap<emojijson, Guild>();
		for (const guild of localuser.guilds) {
			if (guild.id !== "@me" && guild.emojis.length !== 0) {
				for (const emoji of guild.emojis) {
					if (similar(emoji)) {
						weakGuild.set(emoji, guild);
					}
				}
			}
		}
		ranked.sort((a, b) => b[1] - a[1]);
		return ranked.splice(0, results).map((a) => {
			return [new Emoji(a[0], weakGuild.get(a[0]) || localuser), a[1]];
		});
	}
}
Emoji.grabEmoji();
export {Emoji};
