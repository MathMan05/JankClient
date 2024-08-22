//future me stuff
class Buttons {
    name;
    buttons;
    buttonList;
    warndiv;
    value;
    constructor(name) {
        this.buttons = [];
        this.name = name;
    }
    add(name, thing = undefined) {
        if (!thing) {
            thing = new Options(name, this);
        }
        this.buttons.push([name, thing]);
        return thing;
    }
    generateHTML() {
        const buttonList = document.createElement("div");
        buttonList.classList.add("Buttons");
        buttonList.classList.add("flexltr");
        this.buttonList = buttonList;
        const htmlarea = document.createElement("div");
        htmlarea.classList.add("flexgrow");
        const buttonTable = document.createElement("div");
        buttonTable.classList.add("flexttb", "settingbuttons");
        for (const thing of this.buttons) {
            const button = document.createElement("button");
            button.classList.add("SettingsButton");
            button.textContent = thing[0];
            button.onclick = _ => {
                this.generateHTMLArea(thing[1], htmlarea);
                if (this.warndiv) {
                    this.warndiv.remove();
                }
            };
            buttonTable.append(button);
        }
        this.generateHTMLArea(this.buttons[0][1], htmlarea);
        buttonList.append(buttonTable);
        buttonList.append(htmlarea);
        return buttonList;
    }
    handleString(str) {
        const div = document.createElement("span");
        div.textContent = str;
        return div;
    }
    generateHTMLArea(buttonInfo, htmlarea) {
        let html;
        if (buttonInfo instanceof Options) {
            html = buttonInfo.generateHTML();
        }
        else {
            html = this.handleString(buttonInfo);
        }
        htmlarea.innerHTML = "";
        htmlarea.append(html);
    }
    changed(html) {
        this.warndiv = html;
        this.buttonList.append(html);
    }
    watchForChange() { }
    save() { }
    submit() {
    }
}
class TextInput {
    label;
    owner;
    onSubmit;
    value;
    input;
    constructor(label, onSubmit, owner, { initText = "" } = {}) {
        this.label = label;
        this.value = initText;
        this.owner = owner;
        this.onSubmit = onSubmit;
    }
    generateHTML() {
        const div = document.createElement("div");
        const span = document.createElement("span");
        span.textContent = this.label;
        div.append(span);
        const input = document.createElement("input");
        input.value = this.value;
        input.type = "text";
        input.oninput = this.onChange.bind(this);
        this.input = new WeakRef(input);
        div.append(input);
        return div;
    }
    onChange(ev) {
        this.owner.changed();
        const input = this.input.deref();
        if (input) {
            const value = input.value;
            this.onchange(value);
            this.value = value;
        }
    }
    onchange = _ => { };
    watchForChange(func) {
        this.onchange = func;
    }
    submit() {
        this.onSubmit(this.value);
    }
}
class CheckboxInput {
    label;
    owner;
    onSubmit;
    value;
    input;
    constructor(label, onSubmit, owner, { initState = false } = {}) {
        this.label = label;
        this.value = initState;
        this.owner = owner;
        this.onSubmit = onSubmit;
    }
    generateHTML() {
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
    onChange(ev) {
        this.owner.changed();
        const input = this.input.deref();
        if (input) {
            const value = input.checked;
            this.onchange(value);
            this.value = value;
        }
    }
    onchange = _ => { };
    watchForChange(func) {
        this.onchange = func;
    }
    submit() {
        this.onSubmit(this.value);
    }
}
class ButtonInput {
    label;
    owner;
    onClick;
    textContent;
    value;
    constructor(label, textContent, onClick, owner, {} = {}) {
        this.label = label;
        this.owner = owner;
        this.onClick = onClick;
        this.textContent = textContent;
    }
    generateHTML() {
        const div = document.createElement("div");
        const span = document.createElement("span");
        span.textContent = this.label;
        div.append(span);
        const button = document.createElement("button");
        button.textContent = this.textContent;
        button.onclick = this.onClickEvent.bind(this);
        div.append(button);
        return div;
    }
    onClickEvent(ev) {
        this.onClick();
    }
    watchForChange() { }
    submit() { }
}
class ColorInput {
    label;
    owner;
    onSubmit;
    colorContent;
    input;
    value;
    constructor(label, onSubmit, owner, { initColor = "" } = {}) {
        this.label = label;
        this.colorContent = initColor;
        this.owner = owner;
        this.onSubmit = onSubmit;
    }
    generateHTML() {
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
    onChange(ev) {
        this.owner.changed();
        const input = this.input.deref();
        if (input) {
            const value = input.value;
            this.value = value;
            this.onchange(value);
            this.colorContent = value;
        }
    }
    onchange = _ => { };
    watchForChange(func) {
        this.onchange = func;
    }
    submit() {
        this.onSubmit(this.colorContent);
    }
}
class SelectInput {
    label;
    owner;
    onSubmit;
    options;
    index;
    select;
    get value() {
        return this.index;
    }
    constructor(label, onSubmit, options, owner, { defaultIndex = 0 } = {}) {
        this.label = label;
        this.index = defaultIndex;
        this.owner = owner;
        this.onSubmit = onSubmit;
        this.options = options;
    }
    generateHTML() {
        const div = document.createElement("div");
        const span = document.createElement("span");
        span.textContent = this.label;
        div.append(span);
        const select = document.createElement("select");
        select.onchange = this.onChange.bind(this);
        for (const thing of this.options) {
            const option = document.createElement("option");
            option.textContent = thing;
            select.appendChild(option);
        }
        this.select = new WeakRef(select);
        select.selectedIndex = this.index;
        div.append(select);
        return div;
    }
    onChange(ev) {
        this.owner.changed();
        const select = this.select.deref();
        if (select) {
            const value = select.selectedIndex;
            this.onchange(value);
            this.index = value;
        }
    }
    onchange = _ => { };
    watchForChange(func) {
        this.onchange = func;
    }
    submit() {
        this.onSubmit(this.index);
    }
}
class MDInput {
    label;
    owner;
    onSubmit;
    value;
    input;
    constructor(label, onSubmit, owner, { initText = "" } = {}) {
        this.label = label;
        this.value = initText;
        this.owner = owner;
        this.onSubmit = onSubmit;
    }
    generateHTML() {
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
    onChange(ev) {
        this.owner.changed();
        const input = this.input.deref();
        if (input) {
            const value = input.value;
            this.onchange(value);
            this.value = value;
        }
    }
    onchange = _ => { };
    watchForChange(func) {
        this.onchange = func;
    }
    submit() {
        this.onSubmit(this.value);
    }
}
class FileInput {
    label;
    owner;
    onSubmit;
    input;
    value;
    clear;
    constructor(label, onSubmit, owner, { clear = false } = {}) {
        this.label = label;
        this.owner = owner;
        this.onSubmit = onSubmit;
        this.clear = clear;
    }
    generateHTML() {
        const div = document.createElement("div");
        const span = document.createElement("span");
        span.textContent = this.label;
        div.append(span);
        const input = document.createElement("input");
        input.type = "file";
        input.oninput = this.onChange.bind(this);
        this.input = new WeakRef(input);
        div.append(input);
        if (this.clear) {
            const button = document.createElement("button");
            button.textContent = "Clear";
            button.onclick = _ => {
                if (this.onchange) {
                    this.onchange(null);
                }
                ;
                this.value = null;
                this.owner.changed();
            };
            div.append(button);
        }
        return div;
    }
    onChange(ev) {
        this.owner.changed();
        const input = this.input.deref();
        if (this.onchange && input) {
            this.value = input.files;
            this.onchange(input.files);
        }
    }
    onchange = null;
    watchForChange(func) {
        this.onchange = func;
    }
    submit() {
        const input = this.input.deref();
        if (input) {
            this.onSubmit(input.files);
        }
    }
}
class HtmlArea {
    submit;
    html;
    value;
    constructor(html, submit) {
        this.submit = submit;
        this.html = html;
    }
    generateHTML() {
        if (this.html instanceof Function) {
            return this.html();
        }
        else {
            return this.html;
        }
    }
    watchForChange() { }
    ;
}
class Options {
    name;
    haschanged = false;
    options;
    owner;
    ltr;
    value;
    constructor(name, owner, { ltr = false } = {}) {
        this.name = name;
        this.options = [];
        this.owner = owner;
        this.ltr = ltr;
    }
    watchForChange() { }
    ;
    addOptions(name, { ltr = false } = {}) {
        const options = new Options(name, this, { ltr });
        this.options.push(options);
        return options;
    }
    addSelect(label, onSubmit, selections, { defaultIndex = 0 } = {}) {
        const select = new SelectInput(label, onSubmit, selections, this, { defaultIndex });
        this.options.push(select);
        return select;
    }
    addFileInput(label, onSubmit, { clear = false } = {}) {
        const FI = new FileInput(label, onSubmit, this, { clear });
        this.options.push(FI);
        return FI;
    }
    addTextInput(label, onSubmit, { initText = "" } = {}) {
        const textInput = new TextInput(label, onSubmit, this, { initText });
        this.options.push(textInput);
        return textInput;
    }
    addColorInput(label, onSubmit, { initColor = "" } = {}) {
        const colorInput = new ColorInput(label, onSubmit, this, { initColor });
        this.options.push(colorInput);
        return colorInput;
    }
    addMDInput(label, onSubmit, { initText = "" } = {}) {
        const mdInput = new MDInput(label, onSubmit, this, { initText });
        this.options.push(mdInput);
        return mdInput;
    }
    addHTMLArea(html, submit = () => { }) {
        const htmlarea = new HtmlArea(html, submit);
        this.options.push(htmlarea);
        return htmlarea;
    }
    addButtonInput(label, textContent, onSubmit) {
        const button = new ButtonInput(label, textContent, onSubmit, this);
        this.options.push(button);
        return button;
    }
    addCheckboxInput(label, onSubmit, { initState = false } = {}) {
        const box = new CheckboxInput(label, onSubmit, this, { initState });
        this.options.push(box);
        return box;
    }
    html = new WeakMap();
    generateHTML() {
        const div = document.createElement("div");
        div.classList.add("titlediv");
        if (this.name !== "") {
            const title = document.createElement("h2");
            title.textContent = this.name;
            div.append(title);
            title.classList.add("settingstitle");
        }
        const container = document.createElement("div");
        container.classList.add(this.ltr ? "flexltr" : "flexttb", "flexspace");
        for (const thing of this.options) {
            const div = document.createElement("div");
            if (!(thing instanceof Options)) {
                div.classList.add("optionElement");
            }
            const html = thing.generateHTML();
            div.append(html);
            this.html.set(thing, new WeakRef(div));
            container.append(div);
        }
        div.append(container);
        return div;
    }
    changed() {
        if (this.owner instanceof Options || this.owner instanceof Form) {
            this.owner.changed();
            return;
        }
        if (!this.haschanged) {
            const div = document.createElement("div");
            div.classList.add("flexltr", "savediv");
            const span = document.createElement("span");
            div.append(span);
            span.textContent = "Careful, you have unsaved changes";
            const button = document.createElement("button");
            button.textContent = "Save changes";
            div.append(button);
            this.haschanged = true;
            this.owner.changed(div);
            button.onclick = _ => {
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
        for (const thing of this.options) {
            thing.submit();
        }
    }
}
class Form {
    name;
    options;
    owner;
    ltr;
    names;
    required = new WeakSet();
    submitText;
    fetchURL;
    headers;
    method;
    value;
    constructor(name, owner, onSubmit, { ltr = false, submitText = "Submit", fetchURL = "", headers = {}, method = "POST" } = {}) {
        this.name = name;
        this.method = method;
        this.submitText = submitText;
        this.options = new Options("", this, { ltr });
        this.owner = owner;
        this.fetchURL = fetchURL;
        this.headers = headers;
        this.ltr = ltr;
        this.onSubmit = onSubmit;
    }
    addSelect(label, formName, selections, { defaultIndex = 0, required = false } = {}) {
        const select = this.options.addSelect(label, _ => { }, selections, { defaultIndex });
        this.names.set(formName, select);
        if (required) {
            this.required.add(select);
        }
        return;
    }
    addFileInput(label, formName, { required = false } = {}) {
        const FI = this.options.addFileInput(label, _ => { }, {});
        this.names.set(formName, FI);
        if (required) {
            this.required.add(FI);
        }
        return;
    }
    addTextInput(label, formName, { initText = "", required = false } = {}) {
        const textInput = this.options.addTextInput(label, _ => { }, { initText });
        this.names.set(formName, textInput);
        if (required) {
            this.required.add(textInput);
        }
        return;
    }
    addColorInput(label, formName, { initColor = "", required = false } = {}) {
        const colorInput = this.options.addColorInput(label, _ => { }, { initColor });
        this.names.set(formName, colorInput);
        if (required) {
            this.required.add(colorInput);
        }
        return;
    }
    addMDInput(label, formName, { initText = "", required = false } = {}) {
        const mdInput = this.options.addMDInput(label, _ => { }, { initText });
        this.names.set(formName, mdInput);
        if (required) {
            this.required.add(mdInput);
        }
        return;
    }
    addCheckboxInput(label, formName, { initState = false, required = false } = {}) {
        const box = this.options.addCheckboxInput(label, _ => { }, { initState });
        this.names.set(formName, box);
        if (required) {
            this.required.add(box);
        }
        return;
    }
    generateHTML() {
        const div = document.createElement("div");
        div.append(this.options.generateHTML());
        const button = document.createElement("button");
        button.onclick = _ => {
            this.submit();
        };
        button.textContent = this.submitText;
        div.append(button);
        return div;
    }
    onSubmit;
    watchForChange(func) {
        this.onSubmit = func;
    }
    ;
    changed() {
    }
    submit() {
        const build = {};
        for (const thing of this.names.keys()) {
            const input = this.names.get(thing);
            build[thing] = input.value;
        }
        if (this.fetchURL === "") {
            fetch(this.fetchURL, {
                method: this.method,
                body: JSON.stringify(build)
            }).then(_ => _.json()).then(json => {
                if (json.errors) {
                    this.errors(json.errors);
                }
            });
        }
        else {
            this.onSubmit(build);
        }
        console.warn("needs to be implemented");
    }
    errors(errors) {
        for (const error of errors) {
            const elm = this.names.get(error);
            if (elm) {
                const ref = this.options.html.get(elm);
                if (ref && ref.deref()) {
                    const html = ref.deref();
                    this.makeError(html, error._errors[0].message);
                }
            }
        }
    }
    makeError(e, message) {
        let element = e.getElementsByClassName("suberror")[0];
        if (!element) {
            const div = document.createElement("div");
            div.classList.add("suberror", "suberrora");
            e.append(div);
            element = div;
        }
        else {
            element.classList.remove("suberror");
            setTimeout(_ => { element.classList.add("suberror"); }, 100);
        }
        element.textContent = message;
    }
}
class Settings extends Buttons {
    static Buttons = Buttons;
    static Options = Options;
    html;
    constructor(name) {
        super(name);
    }
    addButton(name, { ltr = false } = {}) {
        const options = new Options(name, this, { ltr });
        this.add(name, options);
        return options;
    }
    show() {
        const background = document.createElement("div");
        background.classList.add("background");
        const title = document.createElement("h2");
        title.textContent = this.name;
        title.classList.add("settingstitle");
        background.append(title);
        background.append(this.generateHTML());
        const exit = document.createElement("span");
        exit.textContent = "✖";
        exit.classList.add("exitsettings");
        background.append(exit);
        exit.onclick = _ => { this.hide(); };
        document.body.append(background);
        this.html = background;
    }
    hide() {
        if (this.html) {
            this.html.remove();
            this.html = null;
        }
    }
}
export { Settings, Buttons, Options };
