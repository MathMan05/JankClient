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
    add(name, thing) {
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
            buttonInfo.subOptions = undefined;
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
    password;
    constructor(label, onSubmit, owner, { initText = "", password = false } = {}) {
        this.label = label;
        this.value = initText;
        this.owner = owner;
        this.onSubmit = onSubmit;
        this.password = password;
    }
    generateHTML() {
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
class SettingsText {
    onSubmit;
    value;
    text;
    constructor(text) {
        this.text = text;
    }
    generateHTML() {
        const span = document.createElement("span");
        span.innerText = this.text;
        return span;
    }
    watchForChange() { }
    submit() { }
}
class SettingsTitle {
    onSubmit;
    value;
    text;
    constructor(text) {
        this.text = text;
    }
    generateHTML() {
        const span = document.createElement("h2");
        span.innerText = this.text;
        return span;
    }
    watchForChange() { }
    submit() { }
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
}
class Options {
    name;
    haschanged = false;
    options;
    owner;
    ltr;
    value;
    html = new WeakMap();
    container = new WeakRef(document.createElement("div"));
    constructor(name, owner, { ltr = false } = {}) {
        this.name = name;
        this.options = [];
        this.owner = owner;
        this.ltr = ltr;
    }
    removeAll() {
        while (this.options.length) {
            this.options.pop();
        }
        const container = this.container.deref();
        if (container) {
            container.innerHTML = "";
        }
    }
    watchForChange() { }
    addOptions(name, { ltr = false } = {}) {
        const options = new Options(name, this, { ltr });
        this.options.push(options);
        this.generate(options);
        return options;
    }
    subOptions;
    addSubOptions(name, { ltr = false } = {}) {
        const options = new Options(name, this, { ltr });
        this.subOptions = options;
        const container = this.container.deref();
        if (container) {
            this.generateContainter();
        }
        else {
            throw new Error("Tried to make a subOptions when the options weren't rendered");
        }
        return options;
    }
    addSubForm(name, onSubmit, { ltr = false, submitText = "Submit", fetchURL = "", headers = {}, method = "POST", traditionalSubmit = false } = {}) {
        const options = new Form(name, this, onSubmit, { ltr, submitText, fetchURL, headers, method, traditionalSubmit });
        this.subOptions = options;
        const container = this.container.deref();
        if (container) {
            this.generateContainter();
        }
        else {
            throw new Error("Tried to make a subForm when the options weren't rendered");
        }
        return options;
    }
    returnFromSub() {
        this.subOptions = undefined;
        this.generateContainter();
    }
    addSelect(label, onSubmit, selections, { defaultIndex = 0 } = {}) {
        const select = new SelectInput(label, onSubmit, selections, this, { defaultIndex });
        this.options.push(select);
        this.generate(select);
        return select;
    }
    addFileInput(label, onSubmit, { clear = false } = {}) {
        const FI = new FileInput(label, onSubmit, this, { clear });
        this.options.push(FI);
        this.generate(FI);
        return FI;
    }
    addTextInput(label, onSubmit, { initText = "", password = false } = {}) {
        const textInput = new TextInput(label, onSubmit, this, { initText, password });
        this.options.push(textInput);
        this.generate(textInput);
        return textInput;
    }
    addColorInput(label, onSubmit, { initColor = "" } = {}) {
        const colorInput = new ColorInput(label, onSubmit, this, { initColor });
        this.options.push(colorInput);
        this.generate(colorInput);
        return colorInput;
    }
    addMDInput(label, onSubmit, { initText = "" } = {}) {
        const mdInput = new MDInput(label, onSubmit, this, { initText });
        this.options.push(mdInput);
        this.generate(mdInput);
        return mdInput;
    }
    addHTMLArea(html, submit = () => { }) {
        const htmlarea = new HtmlArea(html, submit);
        this.options.push(htmlarea);
        this.generate(htmlarea);
        return htmlarea;
    }
    addButtonInput(label, textContent, onSubmit) {
        const button = new ButtonInput(label, textContent, onSubmit, this);
        this.options.push(button);
        this.generate(button);
        return button;
    }
    addCheckboxInput(label, onSubmit, { initState = false } = {}) {
        const box = new CheckboxInput(label, onSubmit, this, { initState });
        this.options.push(box);
        this.generate(box);
        return box;
    }
    addText(str) {
        const text = new SettingsText(str);
        this.options.push(text);
        this.generate(text);
        return text;
    }
    addTitle(str) {
        const text = new SettingsTitle(str);
        this.options.push(text);
        this.generate(text);
        return text;
    }
    generate(elm) {
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
    title = new WeakRef(document.createElement("h2"));
    generateHTML() {
        const div = document.createElement("div");
        div.classList.add("titlediv");
        const title = document.createElement("h2");
        title.textContent = this.name;
        div.append(title);
        if (this.name !== "")
            title.classList.add("settingstitle");
        this.title = new WeakRef(title);
        const container = document.createElement("div");
        this.container = new WeakRef(container);
        container.classList.add(this.ltr ? "flexltr" : "flexttb", "flexspace");
        this.generateContainter();
        div.append(container);
        return div;
    }
    generateContainter() {
        const container = this.container.deref();
        if (container) {
            const title = this.title.deref();
            if (title)
                title.innerHTML = "";
            container.innerHTML = "";
            if (this.subOptions) {
                container.append(this.subOptions.generateHTML()); //more code needed, though this is enough for now
                if (title) {
                    const name = document.createElement("span");
                    name.innerText = this.name;
                    name.classList.add("clickable");
                    name.onclick = () => {
                        this.returnFromSub();
                    };
                    title.append(name, " > ", this.subOptions.name);
                }
            }
            else {
                for (const thing of this.options) {
                    this.generate(thing);
                }
                if (title) {
                    title.innerText = this.name;
                }
            }
            if (title && title.innerText !== "") {
                title.classList.add("settingstitle");
            }
            else if (title) {
                title.classList.remove("settingstitle");
            }
        }
        else {
            console.warn("tried to generate container, but it did not exist");
        }
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
class FormError extends Error {
    elem;
    message;
    constructor(elem, message) {
        super(message);
        this.message = message;
        this.elem = elem;
    }
}
export { FormError };
class Form {
    name;
    options;
    owner;
    ltr;
    names = new Map();
    required = new WeakSet();
    submitText;
    fetchURL;
    headers = {};
    method;
    value;
    traditionalSubmit;
    values = {};
    constructor(name, owner, onSubmit, { ltr = false, submitText = "Submit", fetchURL = "", headers = {}, method = "POST", traditionalSubmit = false } = {}) {
        this.traditionalSubmit = traditionalSubmit;
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
    setValue(key, value) {
        this.values[key] = value;
    }
    addSelect(label, formName, selections, { defaultIndex = 0, required = false } = {}) {
        const select = this.options.addSelect(label, _ => { }, selections, { defaultIndex });
        this.names.set(formName, select);
        if (required) {
            this.required.add(select);
        }
        return select;
    }
    fileOptions = new Map();
    addFileInput(label, formName, { required, files } = { required: false, files: "multi" }) {
        const FI = this.options.addFileInput(label, _ => { }, {});
        this.fileOptions.set(FI, { files });
        this.names.set(formName, FI);
        if (required) {
            this.required.add(FI);
        }
        return FI;
    }
    addTextInput(label, formName, { initText = "", required = false, password = false } = {}) {
        const textInput = this.options.addTextInput(label, _ => { }, { initText, password });
        this.names.set(formName, textInput);
        if (required) {
            this.required.add(textInput);
        }
        return textInput;
    }
    addColorInput(label, formName, { initColor = "", required = false } = {}) {
        const colorInput = this.options.addColorInput(label, _ => { }, { initColor });
        this.names.set(formName, colorInput);
        if (required) {
            this.required.add(colorInput);
        }
        return colorInput;
    }
    addMDInput(label, formName, { initText = "", required = false } = {}) {
        const mdInput = this.options.addMDInput(label, _ => { }, { initText });
        this.names.set(formName, mdInput);
        if (required) {
            this.required.add(mdInput);
        }
        return mdInput;
    }
    addCheckboxInput(label, formName, { initState = false, required = false } = {}) {
        const box = this.options.addCheckboxInput(label, _ => { }, { initState });
        this.names.set(formName, box);
        if (required) {
            this.required.add(box);
        }
        return box;
    }
    addText(str) {
        this.options.addText(str);
    }
    addTitle(str) {
        this.options.addTitle(str);
    }
    generateHTML() {
        const div = document.createElement("div");
        div.append(this.options.generateHTML());
        div.classList.add("FormSettings");
        if (!this.traditionalSubmit) {
            const button = document.createElement("button");
            button.onclick = _ => {
                this.submit();
            };
            button.textContent = this.submitText;
            div.append(button);
        }
        return div;
    }
    onSubmit;
    watchForChange(func) {
        this.onSubmit = func;
    }
    changed() {
        if (this.traditionalSubmit) {
            this.owner.changed();
        }
    }
    async submit() {
        const build = {};
        for (const key of Object.keys(this.values)) {
            const thing = this.values[key];
            if (thing instanceof Function) {
                try {
                    build[key] = thing();
                }
                catch (e) {
                    if (e instanceof FormError) {
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
            else {
                build[key] = thing;
            }
        }
        const promises = [];
        for (const thing of this.names.keys()) {
            if (thing === "")
                continue;
            const input = this.names.get(thing);
            if (input instanceof SelectInput) {
                build[thing] = input.options[input.value];
                continue;
            }
            else if (input instanceof FileInput) {
                const options = this.fileOptions.get(input);
                if (!options) {
                    throw new Error("FileInput without its options is in this form, this should never happen.");
                }
                if (options.files === "one") {
                    if (input.value) {
                        const reader = new FileReader();
                        reader.readAsDataURL(input.value[0]);
                        const promise = new Promise((res) => {
                            reader.onload = () => {
                                build[thing] = reader.result;
                                res();
                            };
                        });
                        promises.push(promise);
                    }
                }
                else {
                    console.error(options.files + " is not currently implemented");
                }
            }
            build[thing] = input.value;
        }
        await Promise.allSettled(promises);
        if (this.fetchURL !== "") {
            fetch(this.fetchURL, {
                method: this.method,
                body: JSON.stringify(build),
                headers: this.headers
            }).then(_ => _.json()).then(json => {
                if (json.errors && this.errors(json.errors))
                    return;
                this.onSubmit(json);
            });
        }
        else {
            this.onSubmit(build);
        }
        console.warn("needs to be implemented");
    }
    errors(errors) {
        if (!(errors instanceof Object)) {
            return;
        }
        for (const error of Object.keys(errors)) {
            const elm = this.names.get(error);
            if (elm) {
                const ref = this.options.html.get(elm);
                if (ref && ref.deref()) {
                    const html = ref.deref();
                    this.makeError(html, errors[error]._errors[0].message);
                    return true;
                }
            }
        }
        return false;
    }
    error(formElm, errorMessage) {
        const elm = this.names.get(formElm);
        if (elm) {
            const htmlref = this.options.html.get(elm);
            if (htmlref) {
                const html = htmlref.deref();
                if (html) {
                    this.makeError(html, errorMessage);
                }
            }
        }
        else {
            console.warn(formElm + " is not a valid form property");
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
            setTimeout(_ => {
                element.classList.add("suberror");
            }, 100);
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
        exit.onclick = _ => {
            this.hide();
        };
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
