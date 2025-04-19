import {Contextmenu} from "./contextmenu.js";
import {MarkDown} from "./markdown.js";

class Hover {
	str: string | MarkDown | (() => Promise<MarkDown | string> | MarkDown | string);
	constructor(txt: string | MarkDown | (() => Promise<MarkDown | string> | MarkDown | string)) {
		this.str = txt;
	}
	addEvent(elm: HTMLElement) {
		let timeOut = setTimeout(() => {}, 0);
		let elm2 = document.createElement("div");
		elm.addEventListener("mouseover", () => {
			timeOut = setTimeout(async () => {
				elm2 = await this.makeHover(elm);
				elm2.addEventListener("mouseover", () => {
					elm2.remove();
				});
			}, 300);
		});
		elm.addEventListener("mouseout", () => {
			clearTimeout(timeOut);
			elm2.remove();
		});
		new MutationObserver((e) => {
			if (e[0].removedNodes) {
				clearTimeout(timeOut);
				elm2.remove();
			}
		}).observe(elm, {childList: true});
	}
	async makeHover(elm: HTMLElement) {
		if (!document.contains(elm))
			return document.createDocumentFragment() as unknown as HTMLDivElement;
		const div = document.createElement("div");
		if (this.str instanceof MarkDown) {
			div.append(this.str.makeHTML());
		} else if (this.str instanceof Function) {
			const hover = await this.str();
			if (hover instanceof MarkDown) {
				div.append(hover.makeHTML());
			} else {
				div.innerText = hover;
			}
		} else {
			div.innerText = this.str;
		}
		const box = elm.getBoundingClientRect();
		div.style.top = `${box.bottom + 4}px`;
		div.style.left = `${Math.floor(box.left + box.width / 2)}px`;
		div.classList.add("hoverthing");
		document.body.append(div);
		Contextmenu.keepOnScreen(div);
		console.log(div, elm);
		return div;
	}
}
export {Hover};
