import{ Localuser }from"./localuser.js";
import{ Contextmenu }from"./contextmenu.js";
import{ mobile, getBulkUsers, setTheme, Specialuser }from"./login.js";
import{ MarkDown }from"./markdown.js";
import{ Message }from"./message.js";
import{File}from"./file.js";
import { I18n } from "./i18n.js";
(async ()=>{
	await I18n.done
	const users = getBulkUsers();
	if(!users.currentuser){
		window.location.href = "/login.html";
		return;
	}
	{
		const loadingText=document.getElementById("loadingText");
		const loaddesc=document.getElementById("load-desc");
		const switchaccounts=document.getElementById("switchaccounts");
		const filedroptext=document.getElementById("filedroptext");
		if(loadingText&&loaddesc&&switchaccounts&&filedroptext){
			loadingText.textContent=I18n.getTranslation("htmlPages.loadingText");
			loaddesc.textContent=I18n.getTranslation("htmlPages.loaddesc");
			switchaccounts.textContent=I18n.getTranslation("htmlPages.switchaccounts");
			filedroptext.textContent=I18n.getTranslation("uploadFilesText");
		}
	}
	I18n
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
		switchAccountDiv.textContent = I18n.getTranslation("switchAccounts");
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

	const switchAccountsElement = document.getElementById("switchaccounts") as HTMLDivElement;
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
		(document.getElementById("load-desc") as HTMLSpanElement).textContent = I18n.getTranslation("accountNotStart");
		thisUser = new Localuser(-1);
	}

	const menu = new Contextmenu<void,void>("create rightclick");
	menu.addbutton(
		I18n.getTranslation("channel.createChannel"),
		()=>{
			if(thisUser.lookingguild){
				thisUser.lookingguild.createchannels();
			}
		},
		null,
		()=>thisUser.isAdmin()
	);

	menu.addbutton(
		I18n.getTranslation("channel.createCatagory"),
		()=>{
			if(thisUser.lookingguild){
				thisUser.lookingguild.createcategory();
			}
		},
		null,
		()=>thisUser.isAdmin()
	);

	menu.bindContextmenu(document.getElementById("channels") as HTMLDivElement);

	const pasteImageElement = document.getElementById("pasteimage") as HTMLDivElement;
	let replyingTo: Message | null = null;
	window.addEventListener("popstate",(e)=>{
		if(e.state instanceof Object){
			thisUser.goToChannel(e.state[1],false);
		}
		//console.log(e.state,"state:3")
	})
	async function handleEnter(event: KeyboardEvent): Promise<void>{
		if(thisUser.keyup(event)){return}
		const channel = thisUser.channelfocus;
		if(!channel)return;
		if(markdown.rawString===""&&event.key==="ArrowUp"){
			channel.editLast();
			return;
		}
		channel.typingstart();

		if(event.key === "Enter" && !event.shiftKey){
			event.preventDefault();
			replyingTo = thisUser.channelfocus? thisUser.channelfocus.replyingto: null;
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
			while(images.length){
				images.pop();
				pasteImageElement.removeChild(imagesHtml.pop() as HTMLElement);
			}

			typebox.innerHTML = "";
		}
	}

	interface CustomHTMLDivElement extends HTMLDivElement {markdown: MarkDown;}

	const typebox = document.getElementById("typebox") as CustomHTMLDivElement;
	const markdown = new MarkDown("", thisUser);
	typebox.markdown = markdown;
	typebox.addEventListener("keyup", handleEnter);
	typebox.addEventListener("keydown", event=>{
		thisUser.keydown(event)
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
	let dragendtimeout=setTimeout(()=>{})
	document.addEventListener("dragover",(e)=>{
		clearTimeout(dragendtimeout);
		const data = e.dataTransfer;
		const bg=document.getElementById("gimmefile") as HTMLDivElement;

		if(data){
			const isfile=data.types.includes("Files")||data.types.includes("application/x-moz-file");
			if(!isfile){
				bg.hidden=true;
				return;
			}
			e.preventDefault();
			bg.hidden=false;
			//console.log(data.types,data)
		}else{
			bg.hidden=true;
		}
	});
	document.addEventListener("dragleave",(_)=>{
		dragendtimeout=setTimeout(()=>{
			const bg=document.getElementById("gimmefile") as HTMLDivElement;
			bg.hidden=true;
		},1000)
	});
	document.addEventListener("dragenter",(e)=>{
		e.preventDefault();
	})
	document.addEventListener("drop",e=>{
		const data = e.dataTransfer;
		const bg=document.getElementById("gimmefile") as HTMLDivElement;
		bg.hidden=true;
		if(data){
			const isfile=data.types.includes("Files")||data.types.includes("application/x-moz-file");
			if(isfile){
				e.preventDefault();
				console.log(data.files);
				for(const file of Array.from(data.files)){
					const fileInstance = File.initFromBlob(file);
					const html = fileInstance.upHTML(images, file);
					pasteImageElement.appendChild(html);
					images.push(file);
					imagesHtml.push(html);
				}
			}
		}
	});
	(document.getElementById("upload") as HTMLElement).onclick=()=>{
		const input=document.createElement("input");
		input.type="file";
		input.click();
		console.log("clicked")
		input.onchange=(() => {
			if(input.files){
				for(const file of Array.from(input.files)){
					const fileInstance = File.initFromBlob(file);
					const html = fileInstance.upHTML(images, file);
					pasteImageElement.appendChild(html);
					images.push(file);
					imagesHtml.push(html);
				}
			}
		})
	}

})();
