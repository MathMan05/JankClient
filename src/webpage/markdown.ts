import{ Channel }from"./channel.js";
import{ Emoji }from"./emoji.js";
import{ Guild }from"./guild.js";
import { I18n } from "./i18n.js";
import{ Localuser }from"./localuser.js";
import{ Member }from"./member.js";
import { Dialog } from "./settings.js";

class MarkDown{
	txt: string[];
	keep: boolean;
	stdsize: boolean;
	owner: Localuser | Channel|void;
	info: Localuser["info"]|void=undefined;
	constructor(
		text: string | string[],
		owner: MarkDown["owner"],
		{ keep = false, stdsize = false } = {}
	){
		if(typeof text === typeof ""){
			this.txt = (text as string).split("");
		}else{
			this.txt = text as string[];
		}
		if(this.txt === undefined){
			this.txt = [];
		}
		if(owner){
			this.info = owner.info;
		}
		this.keep = keep;
		this.owner = owner;
		this.stdsize = stdsize;
	}
	get localuser(){
		if(this.owner instanceof Localuser){
			return this.owner;
		}else if(this.owner){
			return this.owner.localuser;
		}
		return null;
	}
	get rawString(){
		return this.txt.join("");
	}
	get textContent(){
		return this.makeHTML().textContent;
	}
	makeHTML({ keep = this.keep, stdsize = this.stdsize } = {}){
		return this.markdown(this.txt, { keep, stdsize });
	}
	markdown(text: string | string[], { keep = false, stdsize = false } = {}){
		let txt: string[];
		if(typeof text === typeof ""){
			txt = (text as string).split("");
		}else{
			txt = text as string[];
		}
		if(txt === undefined){
			txt = [];
		}
		const span = document.createElement("span");
		let current = document.createElement("span");
		function appendcurrent(){
			if(current.innerHTML !== ""){
				span.append(current);
				current = document.createElement("span");
			}
		}
		for(let i = 0; i < txt.length; i++){
			if(txt[i] === "\n" || i === 0){
				const first = i === 0;
				if(first){
					i--;
				}
				let element: HTMLElement = document.createElement("span");
				let keepys = "";

				if(txt[i + 1] === "#"){
					if(txt[i + 2] === "#"){
						if(txt[i + 3] === "#" && txt[i + 4] === " "){
							element = document.createElement("h3");
							keepys = "### ";
							i += 5;
						}else if(txt[i + 3] === " "){
							element = document.createElement("h2");
							element.classList.add("h2md");
							keepys = "## ";
							i += 4;
						}
					}else if(txt[i + 2] === " "){
						element = document.createElement("h1");
						keepys = "# ";
						i += 3;
					}
				}else if(txt[i + 1] === ">" && txt[i + 2] === " "){
					element = document.createElement("div");
					const line = document.createElement("div");
					line.classList.add("quoteline");
					element.append(line);
					element.classList.add("quote");
					keepys = "> ";
					i += 3;
				}
				if(keepys){
					appendcurrent();
					if(!first && !stdsize){
						span.appendChild(document.createElement("br"));
					}
					const build: string[] = [];
					for(; txt[i] !== "\n" && txt[i] !== undefined; i++){
						build.push(txt[i]);
					}
					try{
						if(stdsize){
							element = document.createElement("span");
						}
						if(keep){
							element.append(keepys);
							//span.appendChild(document.createElement("br"));
						}
						element.appendChild(this.markdown(build, { keep, stdsize }));
						span.append(element);
					}finally{
						i -= 1;
						continue;
					}
				}
				if(first){
					i++;
				}
			}
			if(txt[i] === "\\"){
				const chatset=new Set("\\`{}[]()<>*_#+-.!|".split(""));
				if(chatset.has(txt[i+1])){
					if(keep){
						current.textContent += txt[i];
					}
					current.textContent += txt[i+1];
					i++;
					continue;
				}
			}
			if(txt[i] === "\n"){
				if(!stdsize){
					appendcurrent();
					span.append(document.createElement("br"));
				}
				continue;
			}
			if(txt[i] === "`"){
				let count = 1;
				if(txt[i + 1] === "`"){
					count++;
					if(txt[i + 2] === "`"){
						count++;
					}
				}
				let build = "";
				if(keep){
					build += "`".repeat(count);
				}
				let find = 0;
				let j = i + count;
				let init = true;
				for(;txt[j] !== undefined &&(txt[j] !== "\n" || count === 3) &&find !== count;j++){
					if(txt[j] === "`"){
						find++;
					}else{
						if(find !== 0){
							build += "`".repeat(find);
							find = 0;
						}
						if(init && count === 3){
							if(txt[j] === " " || txt[j] === "\n"){
								init = false;
							}
							if(keep){
								build += txt[j];
							}
							continue;
						}
						build += txt[j];
					}
				}
				if(stdsize){
					build = build.replaceAll("\n", "");
				}
				if(find === count){
					appendcurrent();
					i = j;
					if(keep){
						build += "`".repeat(find);
					}
					if(count !== 3 && !stdsize){
						const samp = document.createElement("samp");
						samp.textContent = build;
						span.appendChild(samp);
					}else{
						const pre = document.createElement("pre");
						if(build.at(-1) === "\n"){
							build = build.substring(0, build.length - 1);
						}
						if(txt[i] === "\n"){
							i++;
						}
						pre.textContent = build;
						span.appendChild(pre);
					}
					i--;
					continue;
				}
			}

			if(txt[i] === "*"){
				let count = 1;
				if(txt[i + 1] === "*"){
					count++;
					if(txt[i + 2] === "*"){
						count++;
					}
				}
				let build: string[] = [];
				let find = 0;
				let j = i + count;
				for(; txt[j] !== undefined && find !== count; j++){
					if(txt[j] === "*"){
						find++;
					}else{
						build.push(txt[j]);
						if(find !== 0){
							build = build.concat(new Array(find).fill("*"));
							find = 0;
						}
					}
				}
				if(find === count && (count != 1 || txt[i + 1] !== " ")){
					appendcurrent();
					i = j;

					const stars = "*".repeat(count);
					if(count === 1){
						const i = document.createElement("i");
						if(keep){
							i.append(stars);
						}
						i.appendChild(this.markdown(build, { keep, stdsize }));
						if(keep){
							i.append(stars);
						}
						span.appendChild(i);
					}else if(count === 2){
						const b = document.createElement("b");
						if(keep){
							b.append(stars);
						}
						b.appendChild(this.markdown(build, { keep, stdsize }));
						if(keep){
							b.append(stars);
						}
						span.appendChild(b);
					}else{
						const b = document.createElement("b");
						const i = document.createElement("i");
						if(keep){
							b.append(stars);
						}
						b.appendChild(this.markdown(build, { keep, stdsize }));
						if(keep){
							b.append(stars);
						}
						i.appendChild(b);
						span.appendChild(i);
					}
					i--;
					continue;
				}
			}

			if(txt[i] === "_"){
				let count = 1;
				if(txt[i + 1] === "_"){
					count++;
					if(txt[i + 2] === "_"){
						count++;
					}
				}
				let build: string[] = [];
				let find = 0;
				let j = i + count;
				for(; txt[j] !== undefined && find !== count; j++){
					if(txt[j] === "_"){
						find++;
					}else{
						build.push(txt[j]);
						if(find !== 0){
							build = build.concat(new Array(find).fill("_"));
							find = 0;
						}
					}
				}
				if(
					find === count &&
(count != 1 ||
txt[j + 1] === " " ||
txt[j + 1] === "\n" ||
txt[j + 1] === undefined)
				){
					appendcurrent();
					i = j;
					const underscores = "_".repeat(count);
					if(count === 1){
						const i = document.createElement("i");
						if(keep){
							i.append(underscores);
						}
						i.appendChild(this.markdown(build, { keep, stdsize }));
						if(keep){
							i.append(underscores);
						}
						span.appendChild(i);
					}else if(count === 2){
						const u = document.createElement("u");
						if(keep){
							u.append(underscores);
						}
						u.appendChild(this.markdown(build, { keep, stdsize }));
						if(keep){
							u.append(underscores);
						}
						span.appendChild(u);
					}else{
						const u = document.createElement("u");
						const i = document.createElement("i");
						if(keep){
							i.append(underscores);
						}
						i.appendChild(this.markdown(build, { keep, stdsize }));
						if(keep){
							i.append(underscores);
						}
						u.appendChild(i);
						span.appendChild(u);
					}
					i--;
					continue;
				}
			}

			if(txt[i] === "~" && txt[i + 1] === "~"){
				const count = 2;
				let build: string[] = [];
				let find = 0;
				let j = i + 2;
				for(; txt[j] !== undefined && find !== count; j++){
					if(txt[j] === "~"){
						find++;
					}else{
						build.push(txt[j]);
						if(find !== 0){
							build = build.concat(new Array(find).fill("~"));
							find = 0;
						}
					}
				}
				if(find === count){
					appendcurrent();
					i = j - 1;
					const tildes = "~~";
					if(count === 2){
						const s = document.createElement("s");
						if(keep){
							s.append(tildes);
						}
						s.appendChild(this.markdown(build, { keep, stdsize }));
						if(keep){
							s.append(tildes);
						}
						span.appendChild(s);
					}
					continue;
				}
			}
			if(txt[i] === "|" && txt[i + 1] === "|"){
				const count = 2;
				let build: string[] = [];
				let find = 0;
				let j = i + 2;
				for(; txt[j] !== undefined && find !== count; j++){
					if(txt[j] === "|"){
						find++;
					}else{
						build.push(txt[j]);
						if(find !== 0){
							build = build.concat(new Array(find).fill("~"));
							find = 0;
						}
					}
				}
				if(find === count){
					appendcurrent();
					i = j - 1;
					const pipes = "||";
					if(count === 2){
						const j = document.createElement("j");
						if(keep){
							j.append(pipes);
						}
						j.appendChild(this.markdown(build, { keep, stdsize }));
						j.classList.add("spoiler");
						j.onclick = MarkDown.unspoil;
						if(keep){
							j.append(pipes);
						}
						span.appendChild(j);
					}
					continue;
				}
			}
			if(
				!keep &&
				txt[i] === "h" &&
				txt[i + 1] === "t" &&
				txt[i + 2] === "t" &&
				txt[i + 3] === "p"
			){
				let build = "http";
				let j = i + 4;
				const endchars = new Set(["\\", "<", ">", "|", "]", " ","\n"]);
				for(; txt[j] !== undefined; j++){
					const char = txt[j];
					if(endchars.has(char)){
						break;
					}
					build += char;
				}
				if(URL.canParse(build)){
					appendcurrent();
					const a = document.createElement("a");
					//a.href=build;
					MarkDown.safeLink(a, build);
					a.textContent = build;
					a.target = "_blank";
					i = j - 1;
					span.appendChild(a);
					continue;
				}
			}
			if((txt[i] === "<" && (txt[i + 1] === "@" || txt[i + 1] === "#"))&&this.localuser){
				let id = "";
				let j = i + 2;
				const numbers = new Set(["0","1","2","3","4","5","6","7","8","9",]);
				for(; txt[j] !== undefined; j++){
					const char = txt[j];
					if(!numbers.has(char)){
						break;
					}
					id += char;
				}

				if(txt[j] === ">"){
					appendcurrent();
					const mention = document.createElement("span");
					mention.classList.add("mentionMD");
					mention.contentEditable = "false";
					const char = txt[i + 1];
					i = j;
					switch(char){
					case"@":
						const user = this.localuser.userMap.get(id);
						if(user){
							mention.textContent = `@${user.name}`;
							let guild: null | Guild = null;
							if(this.owner instanceof Channel){
								guild = this.owner.guild;
							}
							if(!keep){
								user.bind(mention, guild);
							}
							if(guild){
								Member.resolveMember(user, guild).then(member=>{
									if(member){
										mention.textContent = `@${member.name}`;
									}
								});
							}
						}else{
							mention.textContent = "@unknown";
						}
						break;
					case"#":
						const channel = this.localuser.channelids.get(id);
						if(channel){
							mention.textContent = `#${channel.name}`;
							if(!keep){
								mention.onclick = _=>{
									if(!this.localuser) return;
									this.localuser.goToChannel(id);
								};
							}
						}else{
							mention.textContent = "#unknown";
						}
						break;
					}
					span.appendChild(mention);
					mention.setAttribute("real", `<${char}${id}>`);
					continue;
				}
			}
			if(txt[i] === "<" && txt[i + 1] === "t" && txt[i + 2] === ":"){
				let found = false;
				const build = ["<", "t", ":"];
				let j = i + 3;
				for(; txt[j] !== void 0; j++){
					build.push(txt[j]);

					if(txt[j] === ">"){
						found = true;
						break;
					}
				}

				if(found){
					appendcurrent();
					i = j;
					const parts = build
						.join("")
						.match(/^<t:([0-9]{1,16})(:([tTdDfFR]))?>$/) as RegExpMatchArray;
					const dateInput = new Date(Number.parseInt(parts[1]) * 1000);
					let time = "";
					if(Number.isNaN(dateInput.getTime())) time = build.join("");
					else{
						if(parts[3] === "d")
							time = dateInput.toLocaleString(void 0, {
								day: "2-digit",
								month: "2-digit",
								year: "numeric",
							});
						else if(parts[3] === "D")
							time = dateInput.toLocaleString(void 0, {
								day: "numeric",
								month: "long",
								year: "numeric",
							});
						else if(!parts[3] || parts[3] === "f")
							time =
							dateInput.toLocaleString(void 0, {
								day: "numeric",
								month: "long",
								year: "numeric",
							}) +
							" " +
							dateInput.toLocaleString(void 0, {
								hour: "2-digit",
								minute: "2-digit",
							});
						else if(parts[3] === "F")
							time =
							dateInput.toLocaleString(void 0, {
								day: "numeric",
								month: "long",
								year: "numeric",
								weekday: "long",
							}) +
							" " +
							dateInput.toLocaleString(void 0, {
								hour: "2-digit",
								minute: "2-digit",
							});
						else if(parts[3] === "t")
							time = dateInput.toLocaleString(void 0, {
								hour: "2-digit",
								minute: "2-digit",
							});
						else if(parts[3] === "T")
							time = dateInput.toLocaleString(void 0, {
								hour: "2-digit",
								minute: "2-digit",
								second: "2-digit",
							});
						else if(parts[3] === "R")
							time =Math.round((Date.now() - Number.parseInt(parts[1]) * 1000) / 1000 / 60) + " minutes ago";
					}

					const timeElem = document.createElement("span");
					timeElem.classList.add("markdown-timestamp");
					timeElem.textContent = time;
					span.appendChild(timeElem);
					continue;
				}
			}

			if(txt[i] === "<" && (txt[i + 1] === ":" || (txt[i + 1] === "a" && txt[i + 2] === ":")&&this.owner)){
				let found = false;
				const build = txt[i + 1] === "a" ? ["<", "a", ":"] : ["<", ":"];
				let j = i + build.length;
				for(; txt[j] !== void 0; j++){
					build.push(txt[j]);

					if(txt[j] === ">"){
						found = true;
						break;
					}
				}

				if(found){
					const buildjoin = build.join("");
					const parts = buildjoin.match(/^<(a)?:\w+:(\d{10,30})>$/);
					if(parts && parts[2]){
						appendcurrent();
						i = j;
						const isEmojiOnly = txt.join("").trim() === buildjoin.trim();
						const owner = this.owner instanceof Channel ? this.owner.guild : this.owner;
						if(!owner) continue;
						const emoji = new Emoji(
							{ name: buildjoin, id: parts[2], animated: Boolean(parts[1]) },
							owner
						);
						span.appendChild(emoji.getHTML(isEmojiOnly));

						continue;
					}
				}
			}

			if(txt[i] == "[" && !keep){
				let partsFound = 0;
				let j = i + 1;
				const build = ["["];
				for(; txt[j] !== void 0; j++){
					build.push(txt[j]);

					if(partsFound === 0 && txt[j] === "]"){
						if(
							txt[j + 1] === "(" &&
	txt[j + 2] === "h" &&
	txt[j + 3] === "t" &&
	txt[j + 4] === "t" &&
	txt[j + 5] === "p" &&
	(txt[j + 6] === "s" || txt[j + 6] === ":")
						){
							partsFound++;
						}else{
							break;
						}
					}else if(partsFound === 1 && txt[j] === ")"){
						partsFound++;
						break;
					}
				}

				if(partsFound === 2){
					appendcurrent();

					const parts = build
						.join("")
						.match(/^\[(.+)\]\((https?:.+?)( ('|").+('|"))?\)$/);
					if(parts){
						const linkElem = document.createElement("a");
						if(URL.canParse(parts[2])){
							i = j;
							MarkDown.safeLink(linkElem, parts[2]);
							linkElem.textContent = parts[1];
							linkElem.target = "_blank";
							linkElem.rel = "noopener noreferrer";
							linkElem.title =
	(parts[3]
		? parts[3].substring(2, parts[3].length - 1) + "\n\n"
		: "") + parts[2];
							span.appendChild(linkElem);

							continue;
						}
					}
				}
			}

			current.textContent += txt[i];
		}
		appendcurrent();
		return span;
	}
	static unspoil(e: any): void{
		e.target.classList.remove("spoiler");
		e.target.classList.add("unspoiled");
	}
	onUpdate:(upto:string,pre:boolean)=>unknown=()=>{};
	box=new WeakRef(document.createElement("div"));
	giveBox(box: HTMLDivElement,onUpdate:(upto:string,pre:boolean)=>unknown=()=>{}){
		this.box=new WeakRef(box);
		this.onUpdate=onUpdate;
		box.onkeydown = _=>{
			//console.log(_);
		};
		let prevcontent = "";
		box.onkeyup = _=>{
			const content = MarkDown.gatherBoxText(box);
			if(content !== prevcontent){
				prevcontent = content;
				this.txt = content.split("");
				this.boxupdate();
				MarkDown.gatherBoxText(box);
			}

		};
		box.onpaste = _=>{
			if(!_.clipboardData)return;
			console.log(_.clipboardData.types);
			const data = _.clipboardData.getData("text");

			document.execCommand("insertHTML", false, data);
			_.preventDefault();
			if(!box.onkeyup)return;
			box.onkeyup(new KeyboardEvent("_"));
		};
	}
	boxupdate(offset=0){
		const box=this.box.deref();
		if(!box) return;
		const restore = saveCaretPosition(box,offset);
		box.innerHTML = "";
		box.append(this.makeHTML({ keep: true }));
		if(restore){
			restore();
			const test=saveCaretPosition(box);
			if(test) test();
		}
		this.onUpdate(text,formatted);
	}
	static gatherBoxText(element: HTMLElement): string{
		if(element.tagName.toLowerCase() === "img"){
			return(element as HTMLImageElement).alt;
		}
		if(element.tagName.toLowerCase() === "br"){
			return"\n";
		}
		if(element.hasAttribute("real")){
			return element.getAttribute("real") as string;
		}
		if(element.tagName.toLowerCase() === "pre"||element.tagName.toLowerCase() === "samp"){
			formatted=true;
		}else{
			formatted=false;
		}
		let build = "";
		for(const thing of Array.from(element.childNodes)){
			if(thing instanceof Text){
				const text = thing.textContent;
				build += text;

				continue;
			}
			const text = this.gatherBoxText(thing as HTMLElement);
			if(text){
				build += text;
			}
		}
		return build;
	}
	static readonly trustedDomains = new Set([location.host]);
	static safeLink(elm: HTMLElement, url: string){
		if(URL.canParse(url)){
			const Url = new URL(url);
			if(elm instanceof HTMLAnchorElement && this.trustedDomains.has(Url.host)){
				elm.href = url;
				elm.target = "_blank";
				return;
			}
			elm.onmouseup = _=>{
				if(_.button === 2)return;
				console.log(":3");
				function open(){
					const proxy = window.open(url, "_blank");
					if(proxy && _.button === 1){
						proxy.focus();
					}else if(proxy){
						window.focus();
					}
				}
				if(this.trustedDomains.has(Url.host)){
					open();
				}else{
					const full=new Dialog("");
					full.options.addTitle(I18n.getTranslation("leaving"));
					full.options.addText(I18n.getTranslation("goingToURL",Url.host));
					const options=full.options.addOptions("",{ltr:true});
					options.addButtonInput("",I18n.getTranslation("nevermind"),()=>full.hide());
					options.addButtonInput("",I18n.getTranslation("goThere"),()=>{
						open();
						full.hide();
					});
					options.addButtonInput("",I18n.getTranslation("goThereTrust"),()=>{
						open();
						full.hide();
						this.trustedDomains.add(Url.host);
					});
					full.show();
				}
			};
		}else{
			throw new Error(url + " is not a valid URL");
		}
	}
	/*
	static replace(base: HTMLElement, newelm: HTMLElement) {
	const basechildren = base.children;
	const newchildren = newelm.children;
	for (const thing of Array.from(newchildren)) {
	base.append(thing);
	}
	}
	*/
}

//solution from https://stackoverflow.com/questions/4576694/saving-and-restoring-caret-position-for-contenteditable-div
let text = "";
let formatted=false;
function saveCaretPosition(context: HTMLElement,offset=0){
	const selection = window.getSelection() as Selection;
	if(!selection)return;
	try{
		const range = selection.getRangeAt(0);

		let base=selection.anchorNode as Node;
		range.setStart(base, 0);
		let baseString:string;
		if(!(base instanceof Text)){
			let i=0;
			const index=selection.focusOffset;
			//@ts-ignore
			for(const thing of base.childNodes){
				if(i===index){
					base=thing;
					break;
				}
				i++;
			}
			if(base instanceof HTMLElement){
				baseString=MarkDown.gatherBoxText(base)
			}else{
				baseString=base.textContent as string;
			}
		}else{
			baseString=selection.toString();
		}


		range.setStart(context, 0);

		let build="";
		//I think this is working now :3
		function crawlForText(context:Node){
			//@ts-ignore
			const children=[...context.childNodes];
			if(children.length===1&&children[0] instanceof Text){
				if(selection.containsNode(context,false)){
					build+=MarkDown.gatherBoxText(context as HTMLElement);
				}else if(selection.containsNode(context,true)){
					if(context.contains(base)||context===base||base.contains(context)){
						build+=baseString;
					}else{
						build+=context.textContent;
					}
				}else{
					console.error(context);
				}
				return;
			}
			for(const node of children as Node[]){

				if(selection.containsNode(node,false)){
					if(node instanceof HTMLElement){
						build+=MarkDown.gatherBoxText(node);
					}else{
						build+=node.textContent;
					}
				}else if(selection.containsNode(node,true)){
					if(node instanceof HTMLElement){
						crawlForText(node);
					}else{
						console.error(node,"This shouldn't happen")
					}
				}else{
					//console.error(node,"This shouldn't happen");
				}
			}
		}
		crawlForText(context);
		if(baseString==="\n"){
			build+=baseString;
		}
		text=build;
		let len=build.length+offset;
		len=Math.min(len,MarkDown.gatherBoxText(context).length)
		return function restore(){
			if(!selection)return;
			const pos = getTextNodeAtPosition(context, len);
			selection.removeAllRanges();
			const range = new Range();
			range.setStart(pos.node, pos.position);
			selection.addRange(range);
		};
	}catch{
		return undefined;
	}
}

function getTextNodeAtPosition(root: Node, index: number):{
			node: Node,
			position: number,
		}{
	if(root instanceof Text){
		return{
			node: root,
			position: index,
		};
	}else if(root instanceof HTMLBRElement){
		return{
			node: root,
			position: 0,
		};
	}else if(root instanceof HTMLElement&&root.hasAttribute("real")){
		return{
			node: root,
			position: -1,
		};
	}
	let lastElm:Node=root;
	for(const node of root.childNodes as unknown as Node[]){
		lastElm=node;
		let len:number
		if(node instanceof HTMLElement){
			len=MarkDown.gatherBoxText(node).length;
		}else{
			len=(node.textContent as string).length
		}
		if(len<=index&&(len<index||len!==0)){
			index-=len;
		}else{
			const returny=getTextNodeAtPosition(node,index);
			if(returny.position===-1){
				console.warn("in here");
				index=0;
				continue;
			}
			return returny;
		}
	}
	if( !((lastElm instanceof HTMLElement && lastElm.hasAttribute("real")))){
		while(lastElm&&!(lastElm instanceof Text||lastElm instanceof HTMLBRElement)){
			lastElm=lastElm.childNodes[lastElm.childNodes.length-1];
		}
		if(lastElm){
			const position=(lastElm.textContent as string).length;
			return{
				node: lastElm,
				position
			};
		}
	}
	const span=document.createElement("span");
		root.appendChild(span)
		return{
			node: span,
			position: 0,
		};

}
export{ MarkDown , saveCaretPosition, getTextNodeAtPosition};
