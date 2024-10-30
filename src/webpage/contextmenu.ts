class Contextmenu<x, y>{
	static currentmenu: HTMLElement | "";
	name: string;
	buttons: [
		string|(()=>string),
		(this: x, arg: y, e: MouseEvent) => void,
		string | null,
		(this: x, arg: y) => boolean,
		(this: x, arg: y) => boolean,
		string
	][];
	div!: HTMLDivElement;
	static setup(){
		Contextmenu.currentmenu = "";
		document.addEventListener("click", event=>{
			if(Contextmenu.currentmenu === ""){
				return;
			}
			if(!Contextmenu.currentmenu.contains(event.target as Node)){
				Contextmenu.currentmenu.remove();
				Contextmenu.currentmenu = "";
			}
		});
	}
	constructor(name: string){
		this.name = name;
		this.buttons = [];
	}
	addbutton(
		text: string|(()=>string),
		onclick: (this: x, arg: y, e: MouseEvent) => void,
		img: null | string = null,
		shown: (this: x, arg: y) => boolean = _=>true,
		enabled: (this: x, arg: y) => boolean = _=>true
	){
		this.buttons.push([text, onclick, img, shown, enabled, "button"]);
		return{};
	}
	addsubmenu(
		text: string,
		onclick: (this: x, arg: y, e: MouseEvent) => void,
		img = null,
		shown: (this: x, arg: y) => boolean = _=>true,
		enabled: (this: x, arg: y) => boolean = _=>true
	){
		this.buttons.push([text, onclick, img, shown, enabled, "submenu"]);
		return{};
	}
	private makemenu(x: number, y: number, addinfo: x, other: y){
		const div = document.createElement("div");
		div.classList.add("contextmenu", "flexttb");

		let visibleButtons = 0;
		for(const thing of this.buttons){
			if(!thing[3].bind(addinfo).call(addinfo, other))continue;
			visibleButtons++;

			const intext = document.createElement("button");
			intext.disabled = !thing[4].bind(addinfo).call(addinfo, other);
			intext.classList.add("contextbutton");
			if(thing[0] instanceof Function){
				intext.textContent = thing[0]();
			}else{
				intext.textContent = thing[0];
			}
			console.log(thing);
			if(thing[5] === "button" || thing[5] === "submenu"){
				intext.onclick = thing[1].bind(addinfo, other);
			}

			div.appendChild(intext);
		}
		if(visibleButtons == 0)return;

		if(Contextmenu.currentmenu != ""){
			Contextmenu.currentmenu.remove();
		}
		div.style.top = y + "px";
		div.style.left = x + "px";
		document.body.appendChild(div);
		Contextmenu.keepOnScreen(div);
		console.log(div);
		Contextmenu.currentmenu = div;
		return this.div;
	}
	bindContextmenu(obj: HTMLElement, addinfo: x, other: y){
		const func = (event: MouseEvent)=>{
			event.preventDefault();
			event.stopImmediatePropagation();
			this.makemenu(event.clientX, event.clientY, addinfo, other);
		};
		obj.addEventListener("contextmenu", func);
		obj.addEventListener("touchstart",(event: TouchEvent)=>{
			if(event.touches.length > 1){
				event.preventDefault();
				event.stopImmediatePropagation();
				this.makemenu(event.touches[0].clientX, event.touches[0].clientY, addinfo, other);
			}
		},{passive:true});
		return func;
	}
	static keepOnScreen(obj: HTMLElement){
		const html = document.documentElement.getBoundingClientRect();
		const docheight = html.height;
		const docwidth = html.width;
		const box = obj.getBoundingClientRect();
		console.log(box, docheight, docwidth);
		if(box.right > docwidth){
			console.log("test");
			obj.style.left = docwidth - box.width + "px";
		}
		if(box.bottom > docheight){
			obj.style.top = docheight - box.height + "px";
		}
	}
}
Contextmenu.setup();
export{ Contextmenu };
