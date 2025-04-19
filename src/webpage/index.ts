import {Localuser} from "./localuser.js";
import {Contextmenu} from "./contextmenu.js";
import {mobile} from "./utils/utils.js";
import {setTheme} from "./utils/utils.js";
import {MarkDown} from "./markdown.js";
import type {Message} from "./message.js";
import {File} from "./file.js";
import {I18n} from "./i18n.js";
(async () => {
	const templateID = new URLSearchParams(window.location.search).get("templateID");
	await I18n.done;

	if (!Localuser.users.currentuser) {
		window.location.href = "/login.html";
		return;
	}
	{
		const loadingText = document.getElementById("loadingText");
		const loaddesc = document.getElementById("load-desc");
		const switchaccounts = document.getElementById("switchaccounts");
		const filedroptext = document.getElementById("filedroptext");
		if (loadingText && loaddesc && switchaccounts && filedroptext) {
			loadingText.textContent = I18n.getTranslation("htmlPages.loadingText");
			loaddesc.textContent = I18n.getTranslation("htmlPages.loaddesc");
			switchaccounts.textContent = I18n.getTranslation("htmlPages.switchaccounts");
			filedroptext.textContent = I18n.getTranslation("uploadFilesText");
		}
	}
	I18n;

	const userInfoElement = document.getElementById("userinfo") as HTMLDivElement;
	userInfoElement.addEventListener("click", (event) => {
		event.stopImmediatePropagation();
		const rect = userInfoElement.getBoundingClientRect();
		Localuser.userMenu.makemenu(rect.x, rect.top - 10 - window.innerHeight, thisUser);
	});

	const switchAccountsElement = document.getElementById("switchaccounts") as HTMLDivElement;
	switchAccountsElement.addEventListener("click", (event) => {
		event.stopImmediatePropagation();
		Localuser.showAccountSwitcher(thisUser);
	});

	let thisUser: Localuser;
	try {
		const current = sessionStorage.getItem("currentuser") || Localuser.users.currentuser;
		if (!Localuser.users.users[current]) {
			window.location.href = "/login";
		}
		thisUser = new Localuser(Localuser.users.users[current]);
		thisUser.initwebsocket().then(() => {
			thisUser.loaduser();
			thisUser.init();
			const loading = document.getElementById("loading") as HTMLDivElement;
			loading.classList.add("doneloading");
			loading.classList.remove("loading");
			console.log("done loading");
			if (templateID) {
				thisUser.passTemplateID(templateID);
			}
		});
	} catch (e) {
		console.error(e);
		(document.getElementById("load-desc") as HTMLSpanElement).textContent =
			I18n.getTranslation("accountNotStart");
		thisUser = new Localuser(-1);
	}

	const menu = new Contextmenu<void, void>("create rightclick");
	menu.addButton(
		I18n.getTranslation("channel.createChannel"),
		() => {
			if (thisUser.lookingguild) {
				thisUser.lookingguild.createchannels();
			}
		},
		{visable: () => thisUser.isAdmin()},
	);

	menu.addButton(
		I18n.getTranslation("channel.createCatagory"),
		() => {
			if (thisUser.lookingguild) {
				thisUser.lookingguild.createcategory();
			}
		},
		{visable: () => thisUser.isAdmin()},
	);

	menu.bindContextmenu(document.getElementById("channels") as HTMLDivElement);

	const pasteImageElement = document.getElementById("pasteimage") as HTMLDivElement;
	let replyingTo: Message | null = null;
	window.addEventListener("popstate", (e) => {
		if (e.state instanceof Object) {
			thisUser.goToChannel(e.state[1], false);
		}
		//console.log(e.state,"state:3")
	});
	async function handleEnter(event: KeyboardEvent): Promise<void> {
		if (thisUser.keyup(event)) {
			return;
		}
		const channel = thisUser.channelfocus;
		if (!channel) return;
		if (markdown.rawString === "" && event.key === "ArrowUp") {
			channel.editLast();
			return;
		}
		channel.typingstart();

		if (event.key === "Enter" && !event.shiftKey) {
			event.preventDefault();
			replyingTo = thisUser.channelfocus ? thisUser.channelfocus.replyingto : null;
			if (replyingTo?.div) {
				replyingTo.div.classList.remove("replying");
			}
			if (thisUser.channelfocus) {
				thisUser.channelfocus.replyingto = null;
			}
			channel.sendMessage(markdown.rawString, {
				attachments: images,
				embeds: [], // Add an empty array for the embeds property
				replyingto: replyingTo,
				sticker_ids: [],
			});
			if (thisUser.channelfocus) {
				thisUser.channelfocus.makereplybox();
			}
			while (images.length) {
				images.pop();
				pasteImageElement.removeChild(imagesHtml.pop() as HTMLElement);
			}

			typebox.innerHTML = "";
			typebox.markdown.txt = [];
		}
	}

	interface CustomHTMLDivElement extends HTMLDivElement {
		markdown: MarkDown;
	}

	const typebox = document.getElementById("typebox") as CustomHTMLDivElement;
	const markdown = new MarkDown("", thisUser);
	typebox.markdown = markdown;
	typebox.addEventListener("keyup", handleEnter);
	typebox.addEventListener("keydown", (event) => {
		thisUser.keydown(event);
		if (event.key === "Enter" && !event.shiftKey) event.preventDefault();
	});
	markdown.giveBox(typebox);
	{
		const searchBox = document.getElementById("searchBox") as CustomHTMLDivElement;
		const markdown = new MarkDown("", thisUser);
		searchBox.markdown = markdown;
		const searchX = document.getElementById("searchX") as HTMLElement;
		searchBox.addEventListener("keydown", (event) => {
			if (event.key === "Enter") {
				event.preventDefault();
				thisUser.mSearch(markdown.rawString);
			}
		});
		searchBox.addEventListener("keyup", () => {
			if (searchBox.textContent === "") {
				setTimeout(() => (searchBox.innerHTML = ""), 0);
				searchX.classList.add("svg-search");
				searchX.classList.remove("svg-plainx");
				searchBox.parentElement?.classList.remove("searching");
			} else {
				searchX.classList.remove("svg-search");
				searchX.classList.add("svg-plainx");
				searchBox.parentElement?.classList.add("searching");
			}
		});
		const sideContainDiv = document.getElementById("sideContainDiv") as HTMLElement;
		searchBox.onclick = () => {
			sideContainDiv.classList.remove("hideSearchDiv");
		};
		searchX.onclick = () => {
			if (searchX.classList.contains("svg-plainx")) {
				markdown.txt = [];
				searchBox.innerHTML = "";
				searchX.classList.add("svg-search");
				searchBox.parentElement?.classList.remove("searching");
				searchX.classList.remove("svg-plainx");
				thisUser.mSearch("");
			} else {
				searchBox.parentElement?.classList.add("searching");
			}
		};

		markdown.giveBox(searchBox);
		markdown.setCustomBox((e) => {
			const span = document.createElement("span");
			span.textContent = e.replace("\n", "");
			return span;
		});
	}
	const images: Blob[] = [];
	const imagesHtml: HTMLElement[] = [];

	document.addEventListener("paste", async (e: ClipboardEvent) => {
		if (!e.clipboardData) return;

		for (const file of Array.from(e.clipboardData.files)) {
			const fileInstance = File.initFromBlob(file);
			e.preventDefault();
			const html = fileInstance.upHTML(images, file);
			pasteImageElement.appendChild(html);
			images.push(file);
			imagesHtml.push(html);
		}
	});

	setTheme();

	function userSettings(): void {
		thisUser.showusersettings();
	}

	(document.getElementById("settings") as HTMLImageElement).onclick = userSettings;
	const memberListToggle = document.getElementById("memberlisttoggle") as HTMLInputElement;
	memberListToggle.checked = !localStorage.getItem("memberNotChecked");
	memberListToggle.onchange = () => {
		if (!memberListToggle.checked) {
			localStorage.setItem("memberNotChecked", "true");
		} else {
			localStorage.removeItem("memberNotChecked");
		}
	};
	if (mobile) {
		const channelWrapper = document.getElementById("channelw") as HTMLDivElement;
		channelWrapper.onclick = () => {
			const toggle = document.getElementById("maintoggle") as HTMLInputElement;
			toggle.checked = true;
		};
		memberListToggle.checked = false;
	}
	let dragendtimeout = setTimeout(() => {});
	document.addEventListener("dragover", (e) => {
		clearTimeout(dragendtimeout);
		const data = e.dataTransfer;
		const bg = document.getElementById("gimmefile") as HTMLDivElement;

		if (data) {
			const isfile = data.types.includes("Files") || data.types.includes("application/x-moz-file");
			if (!isfile) {
				bg.hidden = true;
				return;
			}
			e.preventDefault();
			bg.hidden = false;
			//console.log(data.types,data)
		} else {
			bg.hidden = true;
		}
	});
	document.addEventListener("dragleave", (_) => {
		dragendtimeout = setTimeout(() => {
			const bg = document.getElementById("gimmefile") as HTMLDivElement;
			bg.hidden = true;
		}, 1000);
	});
	document.addEventListener("dragenter", (e) => {
		e.preventDefault();
	});
	document.addEventListener("drop", (e) => {
		const data = e.dataTransfer;
		const bg = document.getElementById("gimmefile") as HTMLDivElement;
		bg.hidden = true;
		if (data) {
			const isfile = data.types.includes("Files") || data.types.includes("application/x-moz-file");
			if (isfile) {
				e.preventDefault();
				console.log(data.files);
				for (const file of Array.from(data.files)) {
					const fileInstance = File.initFromBlob(file);
					const html = fileInstance.upHTML(images, file);
					pasteImageElement.appendChild(html);
					images.push(file);
					imagesHtml.push(html);
				}
			}
		}
	});
	const pinnedM = document.getElementById("pinnedM") as HTMLElement;
	pinnedM.onclick = (e) => {
		thisUser.pinnedClick(pinnedM.getBoundingClientRect());
		e.preventDefault();
		e.stopImmediatePropagation();
	};
	(document.getElementById("upload") as HTMLElement).onclick = () => {
		const input = document.createElement("input");
		input.type = "file";
		input.click();
		input.multiple = true;
		console.log("clicked");
		input.onchange = () => {
			if (input.files) {
				for (const file of Array.from(input.files)) {
					const fileInstance = File.initFromBlob(file);
					const html = fileInstance.upHTML(images, file);
					pasteImageElement.appendChild(html);
					images.push(file);
					imagesHtml.push(html);
				}
			}
		};
	};
	const emojiTB = document.getElementById("emojiTB") as HTMLElement;
	emojiTB.onmousedown = (e) => {
		e.preventDefault();
		e.stopImmediatePropagation();
		thisUser.TBEmojiMenu(emojiTB.getBoundingClientRect());
	};
	emojiTB.onclick = (e) => e.stopImmediatePropagation();

	const gifTB = document.getElementById("gifTB") as HTMLElement;
	gifTB.onmousedown = (e) => {
		e.preventDefault();
		e.stopImmediatePropagation();
		thisUser.makeGifBox(gifTB.getBoundingClientRect());
	};
	gifTB.onclick = (e) => e.stopImmediatePropagation();

	const stickerTB = document.getElementById("stickerTB") as HTMLElement;
	stickerTB.onmousedown = (e) => {
		e.preventDefault();
		e.stopImmediatePropagation();
		thisUser.makeStickerBox(stickerTB.getBoundingClientRect());
	};
	stickerTB.onclick = (e) => e.stopImmediatePropagation();
})();
