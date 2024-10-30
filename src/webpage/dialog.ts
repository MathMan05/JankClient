type dialogjson =
| ["hdiv", ...dialogjson[]]
| ["vdiv", ...dialogjson[]]
| ["img", string, [number, number] | undefined | ["fit"]]
| ["checkbox", string, boolean, (this: HTMLInputElement, e: Event) => unknown]
| ["button", string, string, (this: HTMLButtonElement, e: Event) => unknown]
| ["mdbox", string, string, (this: HTMLTextAreaElement, e: Event) => unknown]
| ["textbox", string, string, (this: HTMLInputElement, e: Event) => unknown]
| ["fileupload", string, (this: HTMLInputElement, e: Event) => unknown]
| ["text", string]
| ["title", string]
| ["radio", string, string[], (this: unknown, e: string) => unknown, number]
| ["html", HTMLElement]
| ["select", string, string[], (this: HTMLSelectElement, e: Event) => unknown, number]
| ["tabs", [string, dialogjson][]];
class Dialog{
	layout: dialogjson;
	onclose: Function;
	onopen: Function;
	html: HTMLDivElement;
	background!: HTMLDivElement;
	constructor(
		layout: dialogjson,
		onclose = (_: any)=>{},
		onopen = (_: any)=>{}
	){
		this.layout = layout;
		this.onclose = onclose;
		this.onopen = onopen;
		const div = document.createElement("div");
		div.appendChild(this.tohtml(layout));
		this.html = div;
		this.html.classList.add("centeritem");
		if(!(layout[0] === "img")){
			this.html.classList.add("nonimagecenter");
		}
	}
	tohtml(array: dialogjson): HTMLElement{
		switch(array[0]){
		case"img":
			const img = document.createElement("img");
			img.src = array[1];
			if(array[2] != undefined){
				if(array[2].length === 2){
					img.width = array[2][0];
					img.height = array[2][1];
				}else if(array[2][0] === "fit"){
					img.classList.add("imgfit");
				}
			}
			return img;
		case"hdiv":
			const hdiv = document.createElement("div");
			hdiv.classList.add("flexltr");

			for(const thing of array){
				if(thing === "hdiv"){
					continue;
				}
				hdiv.appendChild(this.tohtml(thing));
			}
			return hdiv;
		case"vdiv":
			const vdiv = document.createElement("div");
			vdiv.classList.add("flexttb");
			for(const thing of array){
				if(thing === "vdiv"){
					continue;
				}
				vdiv.appendChild(this.tohtml(thing));
			}
			return vdiv;
		case"checkbox": {
			const div = document.createElement("div");
			const checkbox = document.createElement("input");
			div.appendChild(checkbox);
			const label = document.createElement("span");
			checkbox.checked = array[2];
			label.textContent = array[1];
			div.appendChild(label);
			checkbox.addEventListener("change", array[3]);
			checkbox.type = "checkbox";
			return div;
		}
		case"button": {
			const div = document.createElement("div");
			const input = document.createElement("button");

			const label = document.createElement("span");
			input.textContent = array[2];
			label.textContent = array[1];
			div.appendChild(label);
			div.appendChild(input);
			input.addEventListener("click", array[3]);
			return div;
		}
		case"mdbox": {
			const div = document.createElement("div");
			const input = document.createElement("textarea");
			input.value = array[2];
			const label = document.createElement("span");
			label.textContent = array[1];
			input.addEventListener("input", array[3]);
			div.appendChild(label);
			div.appendChild(document.createElement("br"));
			div.appendChild(input);
			return div;
		}
		case"textbox": {
			const div = document.createElement("div");
			const input = document.createElement("input");
			input.value = array[2];
			input.type = "text";
			const label = document.createElement("span");
			label.textContent = array[1];
			console.log(array[3]);
			input.addEventListener("input", array[3]);
			div.appendChild(label);
			div.appendChild(input);
			return div;
		}
		case"fileupload": {
			const div = document.createElement("div");
			const input = document.createElement("input");
			input.type = "file";
			const label = document.createElement("span");
			label.textContent = array[1];
			div.appendChild(label);
			div.appendChild(input);
			input.addEventListener("change", array[2]);
			console.log(array);
			return div;
		}
		case"text": {
			const span = document.createElement("span");
			span.textContent = array[1];
			return span;
		}
		case"title": {
			const span = document.createElement("span");
			span.classList.add("title");
			span.textContent = array[1];
			return span;
		}
		case"radio": {
			const div = document.createElement("div");
			const fieldset = document.createElement("fieldset");
			fieldset.addEventListener("change", ()=>{
				let i = -1;
				for(const thing of Array.from(fieldset.children)){
					i++;
					if(i === 0){
						continue;
					}
					const checkbox = thing.children[0].children[0] as HTMLInputElement;
					if(checkbox.checked){
						array[3](checkbox.value);
					}
				}
			});
			const legend = document.createElement("legend");
			legend.textContent = array[1];
			fieldset.appendChild(legend);
			let i = 0;
			for(const thing of array[2]){
				const div = document.createElement("div");
				const input = document.createElement("input");
				input.classList.add("radio");
				input.type = "radio";
				input.name = array[1];
				input.value = thing;
				if(i === array[4]){
					input.checked = true;
				}
				const label = document.createElement("label");

				label.appendChild(input);
				const span = document.createElement("span");
				span.textContent = thing;
				label.appendChild(span);
				div.appendChild(label);
				fieldset.appendChild(div);
				i++;
			}
			div.appendChild(fieldset);
			return div;
		}
		case"html":
			return array[1];

		case"select": {
			const div = document.createElement("div");
			const label = document.createElement("label");
			const selectSpan = document.createElement("span");
			selectSpan.classList.add("selectspan");
			const select = document.createElement("select");
			const selectArrow = document.createElement("span");
			selectArrow.classList.add("svgicon","svg-category","selectarrow");

			label.textContent = array[1];
			selectSpan.append(select);
			selectSpan.append(selectArrow);
			div.append(label);
			div.appendChild(selectSpan);
			for(const thing of array[2]){
				const option = document.createElement("option");
				option.textContent = thing;
				select.appendChild(option);
			}
			select.selectedIndex = array[4];
			select.addEventListener("change", array[3]);
			return div;
		}
		case"tabs": {
			const table = document.createElement("div");
			table.classList.add("flexttb");
			const tabs = document.createElement("div");
			tabs.classList.add("flexltr");
			tabs.classList.add("tabbed-head");
			table.appendChild(tabs);
			const content = document.createElement("div");
			content.classList.add("tabbed-content");
			table.appendChild(content);

			let shown: HTMLElement | undefined;
			for(const thing of array[1]){
				const button = document.createElement("button");
				button.textContent = thing[0];
				tabs.appendChild(button);

				const html = this.tohtml(thing[1]);
				content.append(html);
				if(!shown){
					shown = html;
				}else{
					html.style.display = "none";
				}
				button.addEventListener("click", _=>{
					if(shown){
						shown.style.display = "none";
					}
					html.style.display = "";
					shown = html;
				});
			}
			return table;
		}
		default:
			console.error(
				"can't find element:" + array[0],
				"  full element:",
				array
			);
			return document.createElement("span");
		}
	}
	show(){
		this.onopen();
		console.log("fullscreen");
		this.background = document.createElement("div");
		this.background.classList.add("background");
		document.body.appendChild(this.background);
		document.body.appendChild(this.html);
		this.background.onclick = _=>{
			this.hide();
		};
	}
	hide(){
		document.body.removeChild(this.background);
		document.body.removeChild(this.html);
	}
}
export{ Dialog };
