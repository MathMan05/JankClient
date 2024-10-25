import{ Localuser }from"./localuser.js";
import{ Contextmenu }from"./contextmenu.js";
import{ mobile, getBulkUsers, setTheme, Specialuser }from"./login.js";
import{ MarkDown }from"./markdown.js";
import{ Message }from"./message.js";
import{ File }from"./file.js";

(async ()=>{
	async function waitForLoad(): Promise<void>{
		return new Promise(resolve=>{
			document.addEventListener("DOMContentLoaded", _=>resolve());
		});
	}

	await waitForLoad();

	const users = getBulkUsers();
	if(!users.currentuser){
		window.location.href = "/login.html";
		return;
	}

	function showAccountSwitcher(): void{
		const table = document.createElement("div");
		table.classList.add("flexttb","accountSwitcher");

		for(const user of Object.values(users.users)){
			const specialUser = user as Specialuser;
			const userInfo = document.createElement("div");
			userInfo.classList.add("flexltr", "switchtable");

			const pfp = document.createElement("img");
			pfp.src = specialUser.pfpsrc;
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

			userInfo.addEventListener("click", ()=>{
				thisUser.unload();
				thisUser.swapped = true;
				const loading = document.getElementById("loading") as HTMLDivElement;
				loading.classList.remove("doneloading");
				loading.classList.add("loading");

				thisUser = new Localuser(specialUser);
				users.currentuser = specialUser.uid;
				localStorage.setItem("userinfos", JSON.stringify(users));

				thisUser.initwebsocket().then(()=>{
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
		switchAccountDiv.textContent = "Switch accounts ⇌";
		switchAccountDiv.addEventListener("click", ()=>{
			window.location.href = "/login.html";
		});
		table.append(switchAccountDiv);

		if(Contextmenu.currentmenu){
			Contextmenu.currentmenu.remove();
		}
		Contextmenu.currentmenu = table;
		document.body.append(table);
	}

	const userInfoElement = document.getElementById("userinfo") as HTMLDivElement;
	userInfoElement.addEventListener("click", event=>{
		event.stopImmediatePropagation();
		showAccountSwitcher();
	});

	const switchAccountsElement = document.getElementById(
		"switchaccounts"
	) as HTMLDivElement;
	switchAccountsElement.addEventListener("click", event=>{
		event.stopImmediatePropagation();
		showAccountSwitcher();
	});

	let thisUser: Localuser;
	try{
		console.log(users.users, users.currentuser);
		thisUser = new Localuser(users.users[users.currentuser]);
		thisUser.initwebsocket().then(()=>{
			thisUser.loaduser();
			thisUser.init();
			const loading = document.getElementById("loading") as HTMLDivElement;
			loading.classList.add("doneloading");
			loading.classList.remove("loading");
			console.log("done loading");
		});
	}catch(e){
		console.error(e);
		(document.getElementById("load-desc") as HTMLSpanElement).textContent =
	"Account unable to start";
		thisUser = new Localuser(-1);
	}

	const menu = new Contextmenu("create rightclick");
	menu.addbutton(
		"Create channel",
		()=>{
			if(thisUser.lookingguild){
				thisUser.lookingguild.createchannels();
			}
		},
		null,
		()=>thisUser.isAdmin()
	);

	menu.addbutton(
		"Create category",
		()=>{
			if(thisUser.lookingguild){
				thisUser.lookingguild.createcategory();
			}
		},
		null,
		()=>thisUser.isAdmin()
	);

	menu.bindContextmenu(
	document.getElementById("channels") as HTMLDivElement,
	0,
	0
	);

	const pasteImageElement = document.getElementById(
		"pasteimage"
	) as HTMLDivElement;
	let replyingTo: Message | null = null;

	async function handleEnter(event: KeyboardEvent): Promise<void>{
		const channel = thisUser.channelfocus;
		if(!channel)return;

		channel.typingstart();

		if(event.key === "Enter" && !event.shiftKey){
			event.preventDefault();

			if(channel.editing){
				channel.editing.edit(markdown.rawString);
				channel.editing = null;
			}else{
				replyingTo = thisUser.channelfocus
					? thisUser.channelfocus.replyingto
					: null;
				if(replyingTo?.div){
					replyingTo.div.classList.remove("replying");
				}
				if(thisUser.channelfocus){
					thisUser.channelfocus.replyingto = null;
				}
				channel.sendMessage(markdown.rawString, {
					attachments: images,
					// @ts-ignore This is valid according to the API
					embeds: [], // Add an empty array for the embeds property
					replyingto: replyingTo,
				});
				if(thisUser.channelfocus){
					thisUser.channelfocus.makereplybox();
				}
			}

			while(images.length){
				images.pop();
				pasteImageElement.removeChild(imagesHtml.pop() as HTMLElement);
			}

			typebox.innerHTML = "";
		}
	}

		interface CustomHTMLDivElement extends HTMLDivElement {
		markdown: MarkDown;
		}

		const typebox = document.getElementById("typebox") as CustomHTMLDivElement;
		const markdown = new MarkDown("", thisUser);
		typebox.markdown = markdown;
		typebox.addEventListener("keyup", handleEnter);
		typebox.addEventListener("keydown", event=>{
			if(event.key === "Enter" && !event.shiftKey) event.preventDefault();
		});
		markdown.giveBox(typebox);

		const images: Blob[] = [];
		const imagesHtml: HTMLElement[] = [];

		document.addEventListener("paste", async (e: ClipboardEvent)=>{
			if(!e.clipboardData)return;

			for(const file of Array.from(e.clipboardData.files)){
				const fileInstance = File.initFromBlob(file);
				e.preventDefault();
				const html = fileInstance.upHTML(images, file);
				pasteImageElement.appendChild(html);
				images.push(file);
				imagesHtml.push(html);
			}
		});

		setTheme();

		function userSettings(): void{
			thisUser.showusersettings();
		}

		(document.getElementById("settings") as HTMLImageElement).onclick =
		userSettings;

		if(mobile){
			const channelWrapper = document.getElementById("channelw") as HTMLDivElement;
			channelWrapper.onclick = ()=>{
				const toggle = document.getElementById("maintoggle") as HTMLInputElement;
				toggle.checked = true;
			};
			const memberListToggle = document.getElementById("memberlisttoggle") as HTMLInputElement;
			memberListToggle.checked = false;
		}
})();
