import {mobile} from "./utils/utils.js";
type iconJson =
	| {
			src: string;
	  }
	| {
			css: string;
	  }
	| {
			html: HTMLElement;
	  };

interface menuPart<x, y> {
	makeContextHTML(obj1: x, obj2: y, menu: HTMLDivElement): void;
}

class ContextButton<x, y> implements menuPart<x, y> {
	private text: string | (() => string);
	private onClick: (this: x, arg: y, e: MouseEvent) => void;
	private icon?: iconJson;
	private visable?: (this: x, arg: y) => boolean;
	private enabled?: (this: x, arg: y) => boolean;
	//TODO there *will* be more colors
	private color?: "red" | "blue";
	constructor(
		text: ContextButton<x, y>["text"],
		onClick: ContextButton<x, y>["onClick"],
		addProps: {
			icon?: iconJson;
			visable?: (this: x, arg: y) => boolean;
			enabled?: (this: x, arg: y) => boolean;
			color?: "red" | "blue";
		} = {},
	) {
		this.text = text;
		this.onClick = onClick;
		this.icon = addProps.icon;
		this.visable = addProps.visable;
		this.enabled = addProps.enabled;
		this.color = addProps.color;
	}
	isVisable(obj1: x, obj2: y): boolean {
		if (!this.visable) return true;
		return this.visable.call(obj1, obj2);
	}
	makeContextHTML(obj1: x, obj2: y, menu: HTMLDivElement) {
		if (!this.isVisable(obj1, obj2)) {
			return;
		}

		const intext = document.createElement("button");
		intext.classList.add("contextbutton");
		intext.append(this.textContent);

		intext.disabled = !!this.enabled && !this.enabled.call(obj1, obj2);

		if (this.icon) {
			if ("src" in this.icon) {
				const icon = document.createElement("img");
				icon.classList.add("svgicon");
				icon.src = this.icon.src;
				intext.append(icon);
			} else if ("css" in this.icon) {
				const icon = document.createElement("span");
				icon.classList.add(this.icon.css, "svgicon");
				switch (this.color) {
					case "red":
						icon.style.background = "var(--red)";
						break;
					case "blue":
						icon.style.background = "var(--blue)";
						break;
				}
				intext.append(icon);
			} else {
				intext.append(this.icon.html);
			}
		}

		switch (this.color) {
			case "red":
				intext.style.color = "var(--red)";
				break;
			case "blue":
				intext.style.color = "var(--blue)";
				break;
		}

		intext.onclick = (e) => {
			e.preventDefault();
			e.stopImmediatePropagation();
			menu.remove();
			this.onClick.call(obj1, obj2, e);
		};

		menu.append(intext);
	}
	get textContent() {
		if (this.text instanceof Function) {
			return this.text();
		}
		return this.text;
	}
}
class Seperator<x, y> implements menuPart<x, y> {
	private visable?: (obj1: x, obj2: y) => boolean;
	constructor(visable?: (obj1: x, obj2: y) => boolean) {
		this.visable = visable;
	}
	makeContextHTML(obj1: x, obj2: y, menu: HTMLDivElement): void {
		if (!this.visable || this.visable(obj1, obj2)) {
			if (menu.children[menu.children.length - 1].tagName === "HR") {
				return;
			}
			menu.append(document.createElement("hr"));
		}
	}
}
class Contextmenu<x, y> {
	static currentmenu: HTMLElement | "";
	name: string;
	buttons: menuPart<x, y>[];
	div!: HTMLDivElement;
	static setup() {
		Contextmenu.currentmenu = "";
		document.addEventListener("click", (event) => {
			if (Contextmenu.currentmenu === "") {
				return;
			}
			if (!Contextmenu.currentmenu.contains(event.target as Node)) {
				Contextmenu.currentmenu.remove();
				Contextmenu.currentmenu = "";
			}
		});
	}
	constructor(name: string) {
		this.name = name;
		this.buttons = [];
	}

	addButton(
		text: ContextButton<x, y>["text"],
		onClick: ContextButton<x, y>["onClick"],
		addProps: {
			icon?: iconJson;
			visable?: (this: x, arg: y) => boolean;
			enabled?: (this: x, arg: y) => boolean;
			color?: "red" | "blue";
		} = {},
	) {
		this.buttons.push(new ContextButton(text, onClick, addProps));
	}
	addSeperator(visable?: (obj1: x, obj2: y) => boolean) {
		this.buttons.push(new Seperator(visable));
	}
	makemenu(x: number, y: number, addinfo: x, other: y) {
		const div = document.createElement("div");
		div.classList.add("contextmenu", "flexttb");

		for (const button of this.buttons) {
			button.makeContextHTML(addinfo, other, div);
		}
		if (div.children[div.children.length - 1].tagName === "HR") {
			div.children[div.children.length - 1].remove();
		}
		//NOTE I don't know if this'll ever actually happen in reality
		if (div.childNodes.length === 0) return;

		if (Contextmenu.currentmenu !== "") {
			Contextmenu.currentmenu.remove();
		}
		if (y > 0) {
			div.style.top = `${y}px`;
		} else {
			div.style.bottom = `${y * -1}px`;
		}
		div.style.left = `${x}px`;
		document.body.appendChild(div);
		Contextmenu.keepOnScreen(div);
		console.log(div);
		Contextmenu.currentmenu = div;
		return this.div;
	}
	bindContextmenu(
		obj: HTMLElement,
		addinfo: x,
		other: y,
		touchDrag: (x: number, y: number) => unknown = () => {},
		touchEnd: (x: number, y: number) => unknown = () => {},
		click: "right" | "left" = "right",
	) {
		const func = (event: MouseEvent) => {
			event.preventDefault();
			event.stopImmediatePropagation();
			this.makemenu(event.clientX, event.clientY, addinfo, other);
		};
		if (click === "right") {
			obj.addEventListener("contextmenu", func);
		} else {
			obj.addEventListener("click", func);
		}
		//NOTE not sure if this code is correct, seems fine at least for now
		if (mobile) {
			let hold: NodeJS.Timeout | undefined;
			let x!: number;
			let y!: number;
			obj.addEventListener(
				"touchstart",
				(event: TouchEvent) => {
					x = event.touches[0].pageX;
					y = event.touches[0].pageY;
					if (event.touches.length > 1) {
						event.preventDefault();
						event.stopImmediatePropagation();
						this.makemenu(event.touches[0].clientX, event.touches[0].clientY, addinfo, other);
					} else {
						//
						event.stopImmediatePropagation();
						hold = setTimeout(() => {
							if (lastx ** 2 + lasty ** 2 > 10 ** 2) return;
							this.makemenu(event.touches[0].clientX, event.touches[0].clientY, addinfo, other);
							console.log(obj);
						}, 500);
					}
				},
				{passive: false},
			);
			let lastx = 0;
			let lasty = 0;
			obj.addEventListener("touchend", () => {
				if (hold) {
					clearTimeout(hold);
				}
				touchEnd(lastx, lasty);
			});
			obj.addEventListener("touchmove", (event) => {
				lastx = event.touches[0].pageX - x;
				lasty = event.touches[0].pageY - y;
				touchDrag(lastx, lasty);
			});
		}
		return func;
	}
	static keepOnScreen(obj: HTMLElement) {
		const html = document.documentElement.getBoundingClientRect();
		const docheight = html.height;
		const docwidth = html.width;
		const box = obj.getBoundingClientRect();
		console.log(box, docheight, docwidth);
		if (box.right > docwidth) {
			console.log("test");
			obj.style.left = `${docwidth - box.width}px`;
		}
		if (box.bottom > docheight) {
			obj.style.top = `${docheight - box.height}px`;
		}
	}
}
Contextmenu.setup();
export {Contextmenu};
