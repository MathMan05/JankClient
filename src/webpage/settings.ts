import type {Emoji} from "./emoji.js";
import {I18n} from "./i18n.js";
import type {Localuser} from "./localuser.js";

interface OptionsElement<x> {
	//
	generateHTML(): HTMLElement;
	submit: () => void;
	readonly watchForChange: (func: (arg1: x) => void) => void;
	value: x;
}
//future me stuff
export class Buttons implements OptionsElement<unknown> {
	readonly name: string;
	readonly buttons: [string, Options | string][];
	readonly buttonMap = new Map<Options | string, HTMLElement>();
	buttonList!: HTMLDivElement;
	warndiv!: HTMLElement;
	value: unknown;
	top = false;
	constructor(name: string, {top = false} = {}) {
		this.top = top;
		this.buttons = [];
		this.name = name;
	}
	add(name: string, thing?: Options | undefined) {
		if (!thing) {
			thing = new Options(name, this);
		}
		const button = [name, thing] as [string, string | Options];
		this.buttons.push(button);
		const htmlarea = this.htmlarea.deref();
		const buttonTable = this.buttonTable.deref();
		if (buttonTable && htmlarea) buttonTable.append(this.makeButtonHTML(button, htmlarea));
		return thing;
	}
	htmlarea = new WeakRef(document.createElement("div"));
	buttonTable = new WeakRef(document.createElement("div"));
	generateHTML() {
		const buttonList = document.createElement("div");
		buttonList.classList.add("Buttons");
		buttonList.classList.add(this.top ? "flexttb" : "flexltr");
		this.buttonList = buttonList;
		const htmlarea = document.createElement("div");
		htmlarea.classList.add("flexgrow", "settingsHTMLArea");
		const buttonTable = this.generateButtons(htmlarea);
		if (this.buttons[0]) {
			this.generateHTMLArea(this.buttons[0][1], htmlarea);
			htmlarea.classList.add("mobileHidden");
		}
		buttonList.append(buttonTable);
		buttonList.append(htmlarea);
		this.htmlarea = new WeakRef(htmlarea);
		this.buttonTable = new WeakRef(buttonTable);
		return buttonList;
	}
	makeButtonHTML(buttond: [string, string | Options], optionsArea: HTMLElement) {
		const button = document.createElement("button");
		this.buttonMap.set(buttond[1], button);
		button.classList.add("SettingsButton");
		button.textContent = buttond[0];
		button.onclick = (_) => {
			this.generateHTMLArea(buttond[1], optionsArea);
			optionsArea.classList.remove("mobileHidden");
			if (this.warndiv) {
				this.warndiv.remove();
			}
		};
		return button;
	}
	generateButtons(optionsArea: HTMLElement) {
		const buttonTable = document.createElement("div");
		buttonTable.classList.add("settingbuttons");
		if (this.top) {
			buttonTable.classList.add("flexltr");
		}
		for (const thing of this.buttons) {
			buttonTable.append(this.makeButtonHTML(thing, optionsArea));
		}
		return buttonTable;
	}
	handleString(str: string): HTMLElement {
		const div = document.createElement("span");
		div.textContent = str;
		return div;
	}
	last?: Options | string;
	generateHTMLArea(buttonInfo: Options | string, htmlarea: HTMLElement) {
		if (this.last) {
			const elm = this.buttonMap.get(this.last);
			if (elm) {
				elm.classList.remove("activeSetting");
			}
		}
		this.last = buttonInfo;
		const elm = this.buttonMap.get(buttonInfo);
		if (elm) {
			elm.classList.add("activeSetting");
		}
		let html: HTMLElement;
		if (buttonInfo instanceof Options) {
			buttonInfo.subOptions = undefined;
			html = buttonInfo.generateHTML();
		} else {
			html = this.handleString(buttonInfo);
		}
		htmlarea.innerHTML = "";
		htmlarea.append(html);
		return html;
	}
	changed(html: HTMLElement) {
		this.warndiv = html;
		this.buttonList.append(html);
	}
	watchForChange() {}
	save() {}
	submit() {}
}

class TextInput implements OptionsElement<string> {
	readonly label: string;
	readonly owner: Options;
	readonly onSubmit: (str: string) => void;
	value: string;
	input!: WeakRef<HTMLInputElement>;
	password: boolean;
	constructor(
		label: string,
		onSubmit: (str: string) => void,
		owner: Options,
		{initText = "", password = false} = {},
	) {
		this.label = label;
		this.value = initText;
		this.owner = owner;
		this.onSubmit = onSubmit;
		this.password = password;
	}
	generateHTML(): HTMLDivElement {
		const div = document.createElement("div");
		const span = document.createElement("span");
		span.textContent = this.label;
		div.append(span);
		const input = document.createElement("input");
		input.value = this.value;
		input.type = this.password ? "password" : "text";
		input.oninput = this.onChange.bind(this);
		this.input = new WeakRef(input);
		div.append(input);
		return div;
	}
	private onChange() {
		this.owner.changed();
		const input = this.input.deref();
		if (input) {
			const value = input.value as string;
			this.onchange(value);
			this.value = value;
		}
	}
	onchange: (str: string) => void = (_) => {};
	watchForChange(func: (str: string) => void) {
		this.onchange = func;
	}
	submit() {
		this.onSubmit(this.value);
	}
}
const mdProm = import("./markdown.js");
class SettingsMDText implements OptionsElement<void> {
	readonly onSubmit!: (str: string) => void;
	value!: undefined;
	text: string;
	elm!: WeakRef<HTMLSpanElement>;
	constructor(text: string) {
		this.text = text;
	}
	generateHTML(): HTMLSpanElement {
		const span = document.createElement("span");
		this.elm = new WeakRef(span);
		this.setText(this.text);
		return span;
	}
	setText(text: string) {
		this.text = text;
		if (this.elm) {
			const span = this.elm.deref();
			if (span) {
				span.innerHTML = "";
				mdProm.then((e) => {
					span.append(new e.MarkDown(text, undefined).makeHTML());
				});
			}
		}
	}
	watchForChange() {}
	submit() {}
}

class SettingsText implements OptionsElement<void> {
	readonly onSubmit!: (str: string) => void;
	value!: undefined;
	readonly text: string;
	elm!: WeakRef<HTMLSpanElement>;
	constructor(text: string) {
		this.text = text;
	}
	generateHTML(): HTMLSpanElement {
		const span = document.createElement("span");
		span.innerText = this.text;
		this.elm = new WeakRef(span);
		return span;
	}
	setText(text: string) {
		if (this.elm) {
			const span = this.elm.deref();
			if (span) {
				span.innerText = text;
			}
		}
	}
	watchForChange() {}
	submit() {}
}
class SettingsTitle implements OptionsElement<void> {
	readonly onSubmit!: (str: string) => void;
	value!: undefined;
	readonly text: string;
	constructor(text: string) {
		this.text = text;
	}
	generateHTML(): HTMLSpanElement {
		const span = document.createElement("h2");
		span.innerText = this.text;
		return span;
	}
	watchForChange() {}
	submit() {}
}
class CheckboxInput implements OptionsElement<boolean> {
	readonly label: string;
	readonly owner: Options;
	readonly onSubmit: (str: boolean) => void;
	value: boolean;
	input!: WeakRef<HTMLInputElement>;
	constructor(
		label: string,
		onSubmit: (str: boolean) => void,
		owner: Options,
		{initState = false} = {},
	) {
		this.label = label;
		this.value = initState;
		this.owner = owner;
		this.onSubmit = onSubmit;
	}
	generateHTML(): HTMLDivElement {
		const div = document.createElement("div");
		const span = document.createElement("span");
		span.textContent = this.label;
		div.append(span);
		const input = document.createElement("input");
		input.type = "checkbox";
		input.checked = this.value;
		input.oninput = this.onChange.bind(this);
		this.input = new WeakRef(input);
		div.append(input);
		return div;
	}
	private onChange() {
		this.owner.changed();
		const input = this.input.deref();
		if (input) {
			const value = input.checked as boolean;
			this.value = value;
			this.onchange(value);
		}
	}
	setState(state: boolean) {
		if (this.input) {
			const checkbox = this.input.deref();
			if (checkbox) {
				checkbox.checked = state;
				this.value = state;
			}
		}
	}
	onchange: (str: boolean) => void = (_) => {};
	watchForChange(func: (str: boolean) => void) {
		this.onchange = func;
	}
	submit() {
		this.onSubmit(this.value);
	}
}

class ButtonInput implements OptionsElement<void> {
	readonly label: string;
	readonly owner: Options;
	readonly onClick: () => void;
	textContent: string;
	value!: undefined;
	constructor(label: string, textContent: string, onClick: () => void, owner: Options, {} = {}) {
		this.label = label;
		this.owner = owner;
		this.onClick = onClick;
		this.textContent = textContent;
	}
	generateHTML(): HTMLDivElement {
		const div = document.createElement("div");
		if (this.label) {
			const span = document.createElement("span");
			span.classList.add("inlinelabel");
			span.textContent = this.label;
			div.append(span);
		}
		const button = document.createElement("button");
		button.textContent = this.textContent;
		button.onclick = this.onClickEvent.bind(this);
		div.append(button);
		return div;
	}
	private onClickEvent() {
		this.onClick();
	}
	watchForChange() {}
	submit() {}
}

class ColorInput implements OptionsElement<string> {
	readonly label: string;
	readonly owner: Options;
	readonly onSubmit: (str: string) => void;
	colorContent: string;
	input!: WeakRef<HTMLInputElement>;
	value!: string;
	constructor(
		label: string,
		onSubmit: (str: string) => void,
		owner: Options,
		{initColor = ""} = {},
	) {
		this.label = label;
		this.colorContent = initColor;
		this.owner = owner;
		this.onSubmit = onSubmit;
	}
	generateHTML(): HTMLDivElement {
		const div = document.createElement("div");
		const span = document.createElement("span");
		span.textContent = this.label;
		div.append(span);
		const input = document.createElement("input");
		input.value = this.colorContent;
		input.type = "color";
		input.oninput = this.onChange.bind(this);
		this.input = new WeakRef(input);
		div.append(input);
		return div;
	}
	private onChange() {
		this.owner.changed();
		const input = this.input.deref();
		if (input) {
			const value = input.value as string;
			this.value = value;
			this.onchange(value);
			this.colorContent = value;
		}
	}
	onchange: (str: string) => void = (_) => {};
	watchForChange(func: (str: string) => void) {
		this.onchange = func;
	}
	submit() {
		this.onSubmit(this.colorContent);
	}
}

class SelectInput implements OptionsElement<number> {
	readonly label: string;
	readonly owner: Options;
	readonly onSubmit: (str: number) => void;
	options: readonly string[];
	index: number;
	select!: WeakRef<HTMLSelectElement>;
	radio: boolean;
	get value() {
		return this.index;
	}
	constructor(
		label: string,
		onSubmit: (str: number) => void,
		options: readonly string[],
		owner: Options,
		{defaultIndex = 0, radio = false} = {},
	) {
		this.label = label;
		this.index = defaultIndex;
		this.owner = owner;
		this.onSubmit = onSubmit;
		this.options = options;
		this.radio = radio;
	}
	generateHTML(): HTMLDivElement {
		if (this.radio) {
			const map = new WeakMap<HTMLInputElement, number>();
			const div = document.createElement("div");
			const fieldset = document.createElement("fieldset");
			fieldset.addEventListener("change", () => {
				let i = -1;
				for (const thing of Array.from(fieldset.children)) {
					i++;
					if (i === 0) {
						continue;
					}
					const checkbox = thing.children[0].children[0] as HTMLInputElement;
					if (checkbox.checked) {
						this.onChange(map.get(checkbox));
					}
				}
			});
			const legend = document.createElement("legend");
			legend.textContent = this.label;
			fieldset.appendChild(legend);
			let i = 0;
			for (const thing of this.options) {
				const div = document.createElement("div");
				const input = document.createElement("input");
				input.classList.add("radio");
				input.type = "radio";
				input.name = this.label;
				input.value = thing;
				map.set(input, i);
				if (i === this.index) {
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
		const div = document.createElement("div");
		const span = document.createElement("span");
		span.textContent = this.label;
		div.append(span);
		const selectSpan = document.createElement("span");
		selectSpan.classList.add("selectspan");
		const select = document.createElement("select");

		select.onchange = this.onChange.bind(this, -1);
		for (const thing of this.options) {
			const option = document.createElement("option");
			option.textContent = thing;
			select.appendChild(option);
		}
		this.select = new WeakRef(select);
		select.selectedIndex = this.index;
		selectSpan.append(select);
		const selectArrow = document.createElement("span");
		selectArrow.classList.add("svgicon", "svg-category", "selectarrow");
		selectSpan.append(selectArrow);
		div.append(selectSpan);
		return div;
	}
	private onChange(index = -1) {
		this.owner.changed();
		if (index !== -1) {
			this.onchange(index);
			this.index = index;
			return;
		}
		const select = this.select.deref();
		if (select) {
			const value = select.selectedIndex;
			this.onchange(value);
			this.index = value;
		}
	}
	onchange: (str: number) => void = (_) => {};
	watchForChange(func: (str: number) => void) {
		this.onchange = func;
	}
	submit() {
		this.onSubmit(this.index);
	}
}
class MDInput implements OptionsElement<string> {
	readonly label: string;
	readonly owner: Options;
	readonly onSubmit: (str: string) => void;
	value: string;
	input!: WeakRef<HTMLTextAreaElement>;
	constructor(
		label: string,
		onSubmit: (str: string) => void,
		owner: Options,
		{initText = ""} = {},
	) {
		this.label = label;
		this.value = initText;
		this.owner = owner;
		this.onSubmit = onSubmit;
	}
	generateHTML(): HTMLDivElement {
		const div = document.createElement("div");
		const span = document.createElement("span");
		span.textContent = this.label;
		div.append(span);
		div.append(document.createElement("br"));
		const input = document.createElement("textarea");
		input.value = this.value;
		input.oninput = this.onChange.bind(this);
		this.input = new WeakRef(input);
		div.append(input);
		return div;
	}
	onChange() {
		this.owner.changed();
		const input = this.input.deref();
		if (input) {
			const value = input.value as string;
			this.onchange(value);
			this.value = value;
		}
	}
	onchange: (str: string) => void = (_) => {};
	watchForChange(func: (str: string) => void) {
		this.onchange = func;
	}
	submit() {
		this.onSubmit(this.value);
	}
}
class EmojiInput implements OptionsElement<Emoji | undefined> {
	readonly label: string;
	readonly owner: Options;
	readonly onSubmit: (str: Emoji | undefined) => void;
	input!: WeakRef<HTMLInputElement>;
	value!: Emoji | undefined;
	localuser: Localuser;
	constructor(
		label: string,
		onSubmit: (str: Emoji | undefined) => void,
		owner: Options,
		localuser: Localuser,
		{initEmoji = undefined}: {initEmoji: undefined | Emoji},
	) {
		this.label = label;
		this.owner = owner;
		this.onSubmit = onSubmit;
		this.value = initEmoji;
		this.localuser = localuser;
	}
	generateHTML(): HTMLElement {
		const div = document.createElement("div");
		div.classList.add("flexltr", "emojiForm");
		const label = document.createElement("span");
		label.textContent = this.label;

		let emoji: HTMLElement;
		if (this.value) {
			emoji = this.value.getHTML();
		} else {
			emoji = document.createElement("span");
			emoji.classList.add("emptyEmoji");
		}
		div.onclick = (e) => {
			e.preventDefault();
			e.stopImmediatePropagation();
			(async () => {
				const Emoji = (await import("./emoji.js")).Emoji;
				const emj = await Emoji.emojiPicker(e.x, e.y, this.localuser);
				if (emj) {
					this.value = emj;
					emoji.remove();
					emoji = emj.getHTML();
					div.append(emoji);
					this.onchange(emj);
					this.owner.changed();
				}
			})();
		};
		div.append(label, emoji);
		return div;
	}
	onchange = (_: Emoji | undefined) => {};
	watchForChange(func: (arg1: Emoji | undefined) => void) {
		this.onchange = func;
	}
	submit() {
		this.onSubmit(this.value);
	}
}
class FileInput implements OptionsElement<FileList | null> {
	readonly label: string;
	readonly owner: Options;
	readonly onSubmit: (str: FileList | null) => void;
	input!: WeakRef<HTMLInputElement>;
	value!: FileList | null;
	clear: boolean;
	constructor(
		label: string,
		onSubmit: (str: FileList | null) => void,
		owner: Options,
		{clear = false} = {},
	) {
		this.label = label;
		this.owner = owner;
		this.onSubmit = onSubmit;
		this.clear = clear;
	}
	generateHTML(): HTMLDivElement {
		const div = document.createElement("div");
		const span = document.createElement("span");
		span.textContent = this.label;
		div.append(span);
		const innerDiv = document.createElement("div");
		innerDiv.classList.add("flexltr", "fileinputdiv");
		const input = document.createElement("input");
		input.type = "file";
		input.oninput = this.onChange.bind(this);
		this.input = new WeakRef(input);
		innerDiv.append(input);
		if (this.clear) {
			const button = document.createElement("button");
			button.textContent = "Clear";
			button.onclick = (_) => {
				if (this.onchange) {
					this.onchange(null);
				}
				this.value = null;
				this.owner.changed();
			};
			innerDiv.append(button);
		}
		div.append(innerDiv);
		return div;
	}
	onChange() {
		this.owner.changed();
		const input = this.input.deref();
		if (input) {
			this.value = input.files;
			if (this.onchange) {
				this.onchange(input.files);
			}
		}
	}
	onchange: ((str: FileList | null) => void) | null = null;
	watchForChange(func: (str: FileList | null) => void) {
		this.onchange = func;
	}
	submit() {
		const input = this.input.deref();
		if (input) {
			this.onSubmit(input.files);
		}
	}
}

class HtmlArea implements OptionsElement<void> {
	submit: () => void;
	html: (() => HTMLElement) | HTMLElement;
	value!: undefined;
	constructor(html: (() => HTMLElement) | HTMLElement, submit: () => void) {
		this.submit = submit;
		this.html = html;
	}
	generateHTML(): HTMLElement {
		if (this.html instanceof Function) {
			return (this.html = this.html());
		}
			return this.html;
	}
	watchForChange() {}
}
/**
 * This is a simple wrapper class for Options to make it happy so it can be used outside of Settings.
 */
class Float {
	options: Options;
	/**
	 * This is a simple wrapper class for Options to make it happy so it can be used outside of Settings.
	 */
	constructor(name: string, options = {ltr: false, noSubmit: true}) {
		this.options = new Options(name, this, options);
	}
	changed = () => {};
	generateHTML() {
		return this.options.generateHTML();
	}
}
class Dialog {
	float: Float;
	get options() {
		return this.float.options;
	}
	background = new WeakRef(document.createElement("div"));
	constructor(name: string, {ltr = false, noSubmit = true} = {}) {
		this.float = new Float(name, {ltr, noSubmit});
	}
	show(hideOnClick = true) {
		const background = document.createElement("div");
		background.classList.add("background");
		const center = this.float.generateHTML();
		center.classList.add("centeritem", "nonimagecenter");
		center.classList.remove("titlediv");
		background.append(center);
		center.onclick = (e) => {
			e.stopImmediatePropagation();
		};
		document.body.append(background);
		this.background = new WeakRef(background);
		background.onclick = (_) => {
			if (hideOnClick) {
				background.remove();
			}
		};
	}
	hide() {
		const background = this.background.deref();
		if (!background) return;
		background.remove();
	}
}

export {Dialog};
class Options implements OptionsElement<void> {
	name: string;
	haschanged = false;
	readonly options: OptionsElement<any>[];
	readonly owner: Buttons | Options | Form | Float;
	readonly ltr: boolean;
	value!: undefined;
	readonly html: WeakMap<OptionsElement<any>, WeakRef<HTMLDivElement>> = new WeakMap();
	readonly noSubmit: boolean = false;
	container: WeakRef<HTMLDivElement> = new WeakRef(document.createElement("div"));
	constructor(
		name: string,
		owner: Buttons | Options | Form | Float,
		{ltr = false, noSubmit = false} = {},
	) {
		this.name = name;
		this.options = [];
		this.owner = owner;
		this.ltr = ltr;
		this.noSubmit = noSubmit;
	}
	removeAll() {
		this.returnFromSub();
		while (this.options.length) {
			this.options.pop();
		}
		const container = this.container.deref();
		if (container) {
			container.innerHTML = "";
		}
	}
	watchForChange() {}
	addOptions(name: string, {ltr = false, noSubmit = false} = {}) {
		const options = new Options(name, this, {ltr, noSubmit});
		this.options.push(options);
		this.generate(options);
		return options;
	}
	addButtons(name: string, {top = false} = {}) {
		const buttons = new Buttons(name, {top});
		this.options.push(buttons);
		this.generate(buttons);
		return buttons;
	}
	subOptions: Options | Form | undefined;
	genTop() {
		const container = this.container.deref();
		if (container) {
			if (this.isTop()) {
				this.generateContainter();
			} else if (this.owner instanceof Options) {
				this.owner.genTop();
			} else {
				(this.owner as Form).owner.genTop();
			}
		} else {
			throw new Error("Tried to make a sub menu when the options weren't rendered");
		}
	}
	addSubOptions(name: string, {ltr = false, noSubmit = false} = {}) {
		const options = new Options(name, this, {ltr, noSubmit});
		this.subOptions = options;
		this.genTop();
		return options;
	}
	addSubForm(
		name: string,
		onSubmit: (arg1: object, sent: object) => void,
		{
			ltr = false,
			submitText = "Submit",
			fetchURL = "",
			headers = {},
			method = "POST",
			traditionalSubmit = false,
		} = {},
	) {
		const options = new Form(name, this, onSubmit, {
			ltr,
			submitText,
			fetchURL,
			headers,
			method,
			traditionalSubmit,
		});
		this.subOptions = options;
		this.genTop();
		return options;
	}
	addEmojiInput(
		label: string,
		onSubmit: (str: Emoji | undefined) => void,
		localuser: Localuser,
		{initEmoji = undefined} = {} as {initEmoji?: Emoji},
	) {
		const emoji = new EmojiInput(label, onSubmit, this, localuser, {
			initEmoji: initEmoji,
		});
		this.options.push(emoji);
		this.generate(emoji);
		return emoji;
	}
	returnFromSub() {
		this.subOptions = undefined;
		this.genTop();
	}
	addSelect(
		label: string,
		onSubmit: (str: number) => void,
		selections: readonly string[],
		{defaultIndex = 0, radio = false} = {},
	) {
		const select = new SelectInput(label, onSubmit, selections, this, {
			defaultIndex,
			radio,
		});
		this.options.push(select);
		this.generate(select);
		return select;
	}
	addFileInput(label: string, onSubmit: (files: FileList | null) => void, {clear = false} = {}) {
		const FI = new FileInput(label, onSubmit, this, {clear});
		this.options.push(FI);
		this.generate(FI);
		return FI;
	}
	addTextInput(
		label: string,
		onSubmit: (str: string) => void,
		{initText = "", password = false} = {},
	) {
		const textInput = new TextInput(label, onSubmit, this, {
			initText,
			password,
		});
		this.options.push(textInput);
		this.generate(textInput);
		return textInput;
	}
	addColorInput(label: string, onSubmit: (str: string) => void, {initColor = ""} = {}) {
		const colorInput = new ColorInput(label, onSubmit, this, {initColor});
		this.options.push(colorInput);
		this.generate(colorInput);
		return colorInput;
	}
	addMDInput(label: string, onSubmit: (str: string) => void, {initText = ""} = {}) {
		const mdInput = new MDInput(label, onSubmit, this, {initText});
		this.options.push(mdInput);
		this.generate(mdInput);
		return mdInput;
	}
	addHTMLArea(html: (() => HTMLElement) | HTMLElement, submit: () => void = () => {}) {
		const htmlarea = new HtmlArea(html, submit);
		this.options.push(htmlarea);
		this.generate(htmlarea);
		return htmlarea;
	}
	addButtonInput(label: string, textContent: string, onSubmit: () => void) {
		const button = new ButtonInput(label, textContent, onSubmit, this);
		this.options.push(button);
		this.generate(button);
		return button;
	}
	addCheckboxInput(label: string, onSubmit: (str: boolean) => void, {initState = false} = {}) {
		const box = new CheckboxInput(label, onSubmit, this, {initState});
		this.options.push(box);
		this.generate(box);
		return box;
	}
	addText(str: string) {
		const text = new SettingsText(str);
		this.options.push(text);
		this.generate(text);
		return text;
	}
	addMDText(str: string) {
		const text = new SettingsMDText(str);
		this.options.push(text);
		this.generate(text);
		return text;
	}
	addHR() {
		const rule = new HorrizonalRule();
		this.options.push(rule);
		this.generate(rule);
		return rule;
	}
	addTitle(str: string) {
		const text = new SettingsTitle(str);
		this.options.push(text);
		this.generate(text);
		return text;
	}
	addForm(
		name: string,
		onSubmit: (arg1: object, sent: object) => void,
		{
			ltr = false,
			submitText = I18n.getTranslation("submit"),
			fetchURL = "",
			headers = {},
			method = "POST",
			traditionalSubmit = false,
		} = {},
	) {
		const options = new Form(name, this, onSubmit, {
			ltr,
			submitText,
			fetchURL,
			headers,
			method,
			traditionalSubmit,
		});
		this.options.push(options);
		this.generate(options);
		return options;
	}
	generate(elm: OptionsElement<any>) {
		const container = this.container.deref();
		if (container) {
			const div = document.createElement("div");
			if (!(elm instanceof Options)) {
				div.classList.add("optionElement");
			}
			const html = elm.generateHTML();
			div.append(html);
			this.html.set(elm, new WeakRef(div));
			container.append(div);
		}
	}
	title: WeakRef<HTMLElement> = new WeakRef(document.createElement("h2"));
	generateHTML(): HTMLElement {
		const div = document.createElement("div");
		div.classList.add("flexttb", "titlediv");
		if (this.owner instanceof Options) {
			div.classList.add("optionElement");
		}
		const title = document.createElement("h2");
		title.textContent = this.name;
		div.append(title);
		if (this.name !== "") title.classList.add("settingstitle");
		this.title = new WeakRef(title);
		const container = document.createElement("div");
		this.container = new WeakRef(container);
		container.classList.add(this.ltr ? "flexltr" : "flexttb", "flexspace");
		this.generateContainter();
		div.append(container);
		console.log(div);
		return div;
	}
	generateName(): (HTMLElement | string)[] {
		const build: (HTMLElement | string)[] = [];
		if (this.owner instanceof Buttons) {
			const span = document.createElement("span");
			span.classList.add("svg-intoMenu", "svgicon", "mobileback");
			build.push(span);
			span.onclick = () => {
				const container = this.container.deref();
				if (!container) return;
				if (!container.parentElement) return;
				if (!container.parentElement.parentElement) return;
				container.parentElement.parentElement.classList.add("mobileHidden");
			};
		}
		if (this.subOptions) {
			if (this.name !== "") {
				const name = document.createElement("span");
				name.innerText = this.name;
				name.classList.add("clickable");
				name.onclick = () => {
					this.returnFromSub();
				};
				build.push(name);
				build.push(" > ");
			}
			if (this.subOptions instanceof Options) {
				build.push(...this.subOptions.generateName());
			} else {
				build.push(...this.subOptions.options.generateName());
			}
		} else {
			const name = document.createElement("span");
			name.innerText = this.name;
			build.push(name);
		}
		return build;
	}
	isTop() {
		return (
			(this.owner instanceof Options && this.owner.subOptions !== this) ||
			(this.owner instanceof Form && this.owner.owner.subOptions !== this.owner) ||
			this.owner instanceof Settings ||
			this.owner instanceof Buttons ||
			this.owner instanceof Float
		);
	}
	generateContainter() {
		const container = this.container.deref();
		if (container) {
			const title = this.title.deref();
			if (title) title.innerHTML = "";
			container.innerHTML = "";
			if (this.isTop()) {
				if (title) {
					const elms = this.generateName();
					title.append(...elms);
				}
			}
			if (!this.subOptions) {
				for (const thing of this.options) {
					this.generate(thing);
				}
			} else {
				container.append(this.subOptions.generateHTML());
			}
			if (title && title.innerText !== "") {
				title.classList.add("settingstitle");
			} else if (title) {
				title.classList.remove("settingstitle");
			}
			if (this.owner instanceof Form && this.owner.button) {
				const button = this.owner.button.deref();
				if (button) {
					button.hidden = false;
				}
			}
		} else {
			console.warn("tried to generate container, but it did not exist");
		}
	}
	changed() {
		if (this.noSubmit) {
			return;
		}
		if (this.owner instanceof Options || this.owner instanceof Form) {
			this.owner.changed();
			return;
		}
		if (!this.haschanged) {
			const div = document.createElement("div");
			div.classList.add("flexltr", "savediv");
			const span = document.createElement("span");
			div.append(span);
			span.textContent = I18n.getTranslation("settings.unsaved");
			const button = document.createElement("button");
			button.textContent = I18n.getTranslation("settings.save");
			div.append(button);
			this.haschanged = true;
			this.owner.changed(div);

			button.onclick = (_) => {
				if (this.owner instanceof Buttons) {
					this.owner.save();
				}
				div.remove();
				this.submit();
			};
		}
	}
	submit() {
		this.haschanged = false;
		if (this.subOptions) {
			this.subOptions.submit();
			return;
		}

		for (const thing of this.options) {
			thing.submit();
		}
	}
}
class FormError extends Error {
	elem: OptionsElement<any>;
	message: string;
	constructor(elem: OptionsElement<any>, message: string) {
		super(message);
		this.message = message;
		this.elem = elem;
	}
}
export {FormError};
class Form implements OptionsElement<object> {
	name: string;
	readonly options: Options;
	readonly owner: Options;
	readonly ltr: boolean;
	readonly names: Map<string, OptionsElement<any>> = new Map();
	readonly required: WeakSet<OptionsElement<any>> = new WeakSet();
	readonly submitText: string;
	fetchURL: string;
	readonly headers = {};
	readonly method: string;
	value!: object;
	traditionalSubmit: boolean;
	values: {[key: string]: any} = {};
	constructor(
		name: string,
		owner: Options,
		onSubmit: (arg1: object, sent: object) => void,
		{
			ltr = false,
			submitText = I18n.getTranslation("submit"),
			fetchURL = "",
			headers = {},
			method = "POST",
			traditionalSubmit = false,
		} = {},
	) {
		this.traditionalSubmit = traditionalSubmit;
		this.name = name;
		this.method = method;
		this.submitText = submitText;
		this.options = new Options(name, this, {ltr});
		this.owner = owner;
		this.fetchURL = fetchURL;
		this.headers = headers;
		this.ltr = ltr;
		this.onSubmit = onSubmit;
	}
	setValue(key: string, value: any) {
		//the value can't really be anything, but I don't care enough to fix this
		this.values[key] = value;
	}
	addSubOptions(name: string, {ltr = false, noSubmit = false} = {}) {
		if (this.button?.deref()) {
			(this.button.deref() as HTMLElement).hidden = true;
		}
		return this.options.addSubOptions(name, {ltr, noSubmit});
	}
	addHTMLArea(html: (() => HTMLElement) | HTMLElement, onSubmit = () => {}) {
		return this.options.addHTMLArea(html, onSubmit);
	}
	addSubForm(
		name: string,
		onSubmit: (arg1: object, sent: object) => void,
		{
			ltr = false,
			submitText = I18n.getTranslation("submit"),
			fetchURL = "",
			headers = {},
			method = "POST",
			traditionalSubmit = false,
		} = {},
	) {
		if (this.button?.deref()) {
			console.warn("hidden");
			(this.button.deref() as HTMLElement).hidden = true;
		}
		return this.options.addSubForm(name, onSubmit, {
			ltr,
			submitText,
			fetchURL,
			headers,
			method,
			traditionalSubmit,
		});
	}
	generateContainter() {
		this.options.generateContainter();
		if (this.options.isTop() && this.button && this.button.deref()) {
			(this.button.deref() as HTMLElement).hidden = false;
		}
	}
	selectMap = new WeakMap<SelectInput, readonly (number | string | null | undefined)[]>();
	addSelect(
		label: string,
		formName: string,
		selections: string[],
		{defaultIndex = 0, required = false, radio = false} = {},
		correct: readonly (string | number | null | undefined)[] = selections,
	) {
		const select = this.options.addSelect(label, (_) => {}, selections, {
			defaultIndex,
			radio,
		});
		this.selectMap.set(select, correct);
		this.names.set(formName, select);
		if (required) {
			this.required.add(select);
		}
		return select;
	}
	readonly fileOptions: Map<FileInput, {files: "one" | "multi"}> = new Map();
	addFileInput(
		label: string,
		formName: string,
		{required = false, files = "one", clear = false} = {},
	) {
		const FI = this.options.addFileInput(label, (_) => {}, {clear});
		if (files !== "one" && files !== "multi") throw new Error("files should equal one or multi");
		this.fileOptions.set(FI, {files});
		this.names.set(formName, FI);
		if (required) {
			this.required.add(FI);
		}
		return FI;
	}
	addEmojiInput(
		label: string,
		formName: string,
		localuser: Localuser,
		{initEmoji = undefined, required = false} = {} as {initEmoji?: Emoji; required: boolean},
	) {
		const emoji = this.options.addEmojiInput(label, () => {}, localuser, {
			initEmoji: initEmoji,
		});
		if (required) {
			this.required.add(emoji);
		}
		this.names.set(formName, emoji);
		return emoji;
	}

	addTextInput(
		label: string,
		formName: string,
		{initText = "", required = false, password = false} = {},
	) {
		const textInput = this.options.addTextInput(label, (_) => {}, {
			initText,
			password,
		});
		this.names.set(formName, textInput);
		if (required) {
			this.required.add(textInput);
		}
		return textInput;
	}
	addColorInput(label: string, formName: string, {initColor = "", required = false} = {}) {
		const colorInput = this.options.addColorInput(label, (_) => {}, {
			initColor,
		});
		this.names.set(formName, colorInput);
		if (required) {
			this.required.add(colorInput);
		}
		return colorInput;
	}

	addMDInput(label: string, formName: string, {initText = "", required = false} = {}) {
		const mdInput = this.options.addMDInput(label, (_) => {}, {initText});
		this.names.set(formName, mdInput);
		if (required) {
			this.required.add(mdInput);
		}
		return mdInput;
	}
	/**
	 * This function does not integrate with the form, so be aware of that
	 *
	 */
	addButtonInput(label: string, textContent: string, onSubmit: () => void) {
		return this.options.addButtonInput(label, textContent, onSubmit);
	}
	/**
	 * This function does not integrate with the form, so be aware of that
	 *
	 */
	addOptions(name: string, {ltr = false, noSubmit = false} = {}) {
		return this.options.addOptions(name, {ltr, noSubmit});
	}
	addCheckboxInput(label: string, formName: string, {initState = false, required = false} = {}) {
		const box = this.options.addCheckboxInput(label, (_) => {}, {initState});
		this.names.set(formName, box);
		if (required) {
			this.required.add(box);
		}
		return box;
	}
	addText(str: string) {
		return this.options.addText(str);
	}
	addMDText(str: string) {
		return this.options.addMDText(str);
	}
	addHR() {
		return this.options.addHR();
	}
	addTitle(str: string) {
		this.options.addTitle(str);
	}
	button!: WeakRef<HTMLButtonElement>;
	generateHTML(): HTMLElement {
		const div = document.createElement("div");
		div.append(this.options.generateHTML());
		div.classList.add("FormSettings");
		if (!this.traditionalSubmit) {
			const button = document.createElement("button");
			button.onclick = (_) => {
				this.submit();
			};
			button.textContent = this.submitText;
			div.append(button);
			if (this.options.subOptions) {
				button.hidden = true;
			}
			this.button = new WeakRef(button);
		}
		return div;
	}
	onSubmit:
		| ((arg1: object, sent: object) => void)
		| ((arg1: object, sent: object) => Promise<void>);
	watchForChange(func: (arg1: object) => void) {
		this.onSubmit = func;
	}
	changed() {
		if (this.traditionalSubmit) {
			this.owner.changed();
		}
	}
	preprocessor: (obj: Object) => void = () => {};
	addPreprocessor(func: (obj: Object) => void) {
		this.preprocessor = func;
	}
	onFormError = (_: FormError) => {};
	async submit() {
		if (this.options.subOptions) {
			this.options.subOptions.submit();
			return;
		}
		console.log("start");
		const build = {};
		for (const key of Object.keys(this.values)) {
			const thing = this.values[key];
			if (thing instanceof Function) {
				try {
					(build as any)[key] = thing();
				} catch (e: any) {
					if (e instanceof FormError) {
						this.onFormError(e);
						const elm = this.options.html.get(e.elem);
						if (elm) {
							const html = elm.deref();
							if (html) {
								this.makeError(html, e.message);
							}
						}
					}
					return;
				}
			} else {
				(build as any)[thing] = thing;
			}
		}
		console.log("middle");
		const promises: Promise<void>[] = [];
		for (const thing of this.names.keys()) {
			if (thing === "") continue;
			const input = this.names.get(thing) as OptionsElement<any>;
			if (input instanceof SelectInput) {
				(build as any)[thing] = (this.selectMap.get(input) as string[])[input.value];
				continue;
			}if (input instanceof FileInput) {
				const options = this.fileOptions.get(input);
				if (!options) {
					throw new Error(
						"FileInput without its options is in this form, this should never happen.",
					);
				}
				if (options.files === "one") {
					console.log(input.value);
					if (input.value) {
						const reader = new FileReader();
						reader.readAsDataURL(input.value[0]);
						const promise = new Promise<void>((res) => {
							reader.onload = () => {
								(build as any)[thing] = reader.result;
								res();
							};
						});
						promises.push(promise);
						continue;
					}if (input.value === undefined) {
						continue;
					}
				} else {
					console.error(`${options.files} is not currently implemented`);
				}
			} else if (input instanceof EmojiInput) {
				if (!input.value) {
					(build as any)[thing] = undefined;
				} else if (input.value.id) {
					(build as any)[thing] = input.value.id;
				} else if (input.value.emoji) {
					(build as any)[thing] = input.value.emoji;
				}
				continue;
			}
			(build as any)[thing] = input.value;
		}
		console.log("middle2");
		await Promise.allSettled(promises);
		try {
			this.preprocessor(build);
		} catch (e) {
			if (e instanceof FormError) {
				this.onFormError(e);
				const elm = this.options.html.get(e.elem);
				if (elm) {
					const html = elm.deref();
					if (html) {
						this.makeError(html, e.message);
					}
				}
			}
			return;
		}
		if (this.fetchURL !== "") {
			fetch(this.fetchURL, {
				method: this.method,
				body: JSON.stringify(build),
				headers: this.headers,
			})
				.then((_) => {
					return _.text();
				})
				.then((_) => {
					if (_ === "") return {};
					return JSON.parse(_);
				})
				.then(async (json) => {
					if (json.errors) {
						if (this.errors(json)) {
							return;
						}
					}
					try {
						await this.onSubmit(json, build);
					} catch (e) {
						console.error(e);
						if (e instanceof FormError) {
							this.onFormError(e);
							const elm = this.options.html.get(e.elem);
							if (elm) {
								const html = elm.deref();
								if (html) {
									this.makeError(html, e.message);
								}
							}
						}
						return;
					}
				});
		} else {
			try {
				await this.onSubmit(build, build);
			} catch (e) {
				if (e instanceof FormError) {
					this.onFormError(e);
					const elm = this.options.html.get(e.elem);
					if (elm) {
						const html = elm.deref();
						if (html) {
							this.makeError(html, e.message);
						}
					}
				}
				return;
			}
		}
		console.warn("needs to be implemented");
	}
	errors(errors: {
		code: number;
		message: string;
		errors: {[key: string]: {_errors: {message: string; code: string}[]}};
	}) {
		if (!(errors instanceof Object)) {
			return;
		}
		for (const error of Object.keys(errors.errors)) {
			const elm = this.names.get(error);
			if (elm) {
				const ref = this.options.html.get(elm);
				if (ref?.deref()) {
					const html = ref.deref() as HTMLDivElement;
					const errorMessage = errors.errors[error]._errors[0].message;
					this.makeError(html, errorMessage);
					return true;
				}
			}
		}
		return false;
	}
	error(formElm: string, errorMessage: string) {
		const elm = this.names.get(formElm);
		if (elm) {
			const htmlref = this.options.html.get(elm);
			if (htmlref) {
				const html = htmlref.deref();
				if (html) {
					this.makeError(html, errorMessage);
				}
			}
		} else {
			console.warn(`${formElm} is not a valid form property`);
		}
	}
	makeError(e: HTMLDivElement, message: string) {
		let element = e.getElementsByClassName("suberror")[0] as HTMLElement;
		if (!element) {
			const div = document.createElement("div");
			div.classList.add("suberror", "suberrora");
			e.append(div);
			element = div;
		} else {
			element.classList.remove("suberror");
			setTimeout((_) => {
				element.classList.add("suberror");
			}, 100);
		}
		element.textContent = message;
	}
}
class HorrizonalRule implements OptionsElement<unknown> {
	generateHTML(): HTMLElement {
		return document.createElement("hr");
	}
	watchForChange(_: (arg1: undefined) => void) {
		throw new Error("don't do this");
	}
	submit = () => {};
	value = undefined;
}
class Settings extends Buttons {
	static readonly Buttons = Buttons;
	static readonly Options = Options;
	html!: HTMLElement | null;
	addButton(name: string, {ltr = false} = {}): Options {
		const options = new Options(name, this, {ltr});
		this.add(name, options);
		return options;
	}
	show() {
		const background = document.createElement("div");
		background.classList.add("flexttb", "menu", "background");

		const title = document.createElement("h2");
		title.textContent = this.name;
		title.classList.add("settingstitle");
		background.append(title);

		background.append(this.generateHTML());

		const exit = document.createElement("span");
		exit.classList.add("exitsettings", "svgicon", "svg-x");
		background.append(exit);
		exit.onclick = (_) => {
			this.hide();
		};
		background.addEventListener("keyup", (event) => {
			if (event.key === "Escape") {
				event.preventDefault();
				event.stopImmediatePropagation();
				// Cancel the default action, if needed
				this.hide();
			}
		});
		document.body.append(background);
		background.setAttribute("tabindex", "0");
		background.focus();

		this.html = background;
	}
	hide() {
		if (this.html) {
			this.html.remove();
			this.html = null;
		}
	}
}

export {Settings, type OptionsElement, Options, Form, Float};
