export { MarkDown };
class MarkDown {
    txt;
    keep;
    stdsize;
    owner;
    info;
    constructor(text, owner, { keep = false, stdsize = false } = {}) {
        if ((typeof text) === (typeof "")) {
            this.txt = text.split("");
        }
        else {
            this.txt = text;
        }
        if (this.txt === undefined) {
            this.txt = [];
        }
        this.info = owner.info;
        this.keep = keep;
        this.owner = owner;
        this.stdsize = stdsize;
    }
    get rawString() {
        return this.txt.join("");
    }
    get textContent() {
        return this.makeHTML().textContent;
    }
    makeHTML({ keep = this.keep, stdsize = this.stdsize } = {}) {
        return this.markdown(this.txt, { keep: keep, stdsize: stdsize });
    }
    markdown(text, { keep = false, stdsize = false } = {}) {
        let txt;
        if ((typeof text) === (typeof "")) {
            txt = text.split("");
        }
        else {
            txt = text;
        }
        if (txt === undefined) {
            txt = [];
        }
        const span = document.createElement("span");
        let current = document.createElement("span");
        function appendcurrent() {
            if (current.innerHTML !== "") {
                span.append(current);
                current = document.createElement("span");
            }
        }
        for (let i = 0; i < txt.length; i++) {
            if (txt[i] === "\n" || i === 0) {
                const first = i === 0;
                if (first) {
                    i--;
                }
                let element = null;
                let keepys = "";
                if (txt[i + 1] === "#") {
                    console.log("test");
                    if (txt[i + 2] === "#") {
                        if (txt[i + 3] === "#" && txt[i + 4] === " ") {
                            element = document.createElement("h3");
                            keepys = "### ";
                            i += 5;
                        }
                        else if (txt[i + 3] === " ") {
                            element = document.createElement("h2");
                            element.classList.add("h2md");
                            keepys = "## ";
                            i += 4;
                        }
                    }
                    else if (txt[i + 2] === " ") {
                        element = document.createElement("h1");
                        keepys = "# ";
                        i += 3;
                    }
                }
                else if (txt[i + 1] === ">" && txt[i + 2] === " ") {
                    element = document.createElement("div");
                    const line = document.createElement("div");
                    line.classList.add("quoteline");
                    element.append(line);
                    element.classList.add("quote");
                    keepys = "> ";
                    i += 3;
                }
                if (keepys) {
                    appendcurrent();
                    if (!first && !stdsize) {
                        span.appendChild(document.createElement("br"));
                    }
                    const build = [];
                    for (; txt[i] !== "\n" && txt[i] !== undefined; i++) {
                        build.push(txt[i]);
                    }
                    if (stdsize) {
                        element = document.createElement("span");
                    }
                    if (keep) {
                        element.append(keepys);
                    }
                    element.appendChild(this.markdown(build, { keep: keep, stdsize: stdsize }));
                    span.append(element);
                    i -= 1;
                    console.log(txt[i]);
                    continue;
                }
                if (first) {
                    i++;
                }
            }
            if (txt[i] === "\n") {
                if (!stdsize) {
                    appendcurrent();
                    span.append(document.createElement("br"));
                }
                continue;
            }
            if (txt[i] === "`") {
                let count = 1;
                if (txt[i + 1] === "`") {
                    count++;
                    if (txt[i + 2] === "`") {
                        count++;
                    }
                }
                let build = "";
                if (keep) {
                    build += "`".repeat(count);
                }
                let find = 0;
                let j = i + count;
                let init = true;
                for (; txt[j] !== undefined && (txt[j] !== "\n" || count === 3) && find !== count; j++) {
                    if (txt[j] === "`") {
                        find++;
                    }
                    else {
                        if (find !== 0) {
                            build += "`".repeat(find);
                            find = 0;
                        }
                        if (init && count === 3) {
                            if (txt[j] === " " || txt[j] === "\n") {
                                init = false;
                            }
                            if (keep) {
                                build += txt[j];
                            }
                            continue;
                        }
                        build += txt[j];
                    }
                }
                if (stdsize) {
                    console.log(build);
                    build = build.replaceAll("\n", "");
                    console.log(build, JSON.stringify(build));
                }
                if (find === count) {
                    appendcurrent();
                    i = j;
                    if (keep) {
                        build += "`".repeat(find);
                    }
                    if (count !== 3 && !stdsize) {
                        const samp = document.createElement("samp");
                        samp.textContent = build;
                        span.appendChild(samp);
                    }
                    else {
                        const pre = document.createElement("pre");
                        if (build[build.length - 1] === "\n") {
                            build = build.substring(0, build.length - 1);
                        }
                        if (txt[i] === "\n") {
                            i++;
                        }
                        pre.textContent = build;
                        span.appendChild(pre);
                    }
                    i--;
                    continue;
                }
            }
            if (txt[i] === "*") {
                let count = 1;
                if (txt[i + 1] === "*") {
                    count++;
                    if (txt[i + 2] === "*") {
                        count++;
                    }
                }
                let build = [];
                let find = 0;
                let j = i + count;
                for (; txt[j] !== undefined && find !== count; j++) {
                    if (txt[j] === "*") {
                        find++;
                    }
                    else {
                        build.push(txt[j]);
                        if (find !== 0) {
                            build = build.concat(new Array(find).fill("*"));
                            find = 0;
                        }
                    }
                }
                if (find === count && (count != 1 || txt[i + 1] !== " ")) {
                    appendcurrent();
                    i = j;
                    const stars = "*".repeat(count);
                    if (count === 1) {
                        const i = document.createElement("i");
                        if (keep) {
                            i.append(stars);
                        }
                        i.appendChild(this.markdown(build, { keep: keep, stdsize: stdsize }));
                        if (keep) {
                            i.append(stars);
                        }
                        span.appendChild(i);
                    }
                    else if (count === 2) {
                        const b = document.createElement("b");
                        if (keep) {
                            b.append(stars);
                        }
                        b.appendChild(this.markdown(build, { keep: keep, stdsize: stdsize }));
                        if (keep) {
                            b.append(stars);
                        }
                        span.appendChild(b);
                    }
                    else {
                        const b = document.createElement("b");
                        const i = document.createElement("i");
                        if (keep) {
                            b.append(stars);
                        }
                        b.appendChild(this.markdown(build, { keep: keep, stdsize: stdsize }));
                        if (keep) {
                            b.append(stars);
                        }
                        i.appendChild(b);
                        span.appendChild(i);
                    }
                    i--;
                    continue;
                }
            }
            if (txt[i] === "_") {
                let count = 1;
                if (txt[i + 1] === "_") {
                    count++;
                    if (txt[i + 2] === "_") {
                        count++;
                    }
                }
                let build = [];
                let find = 0;
                let j = i + count;
                for (; txt[j] !== undefined && find !== count; j++) {
                    if (txt[j] === "_") {
                        find++;
                    }
                    else {
                        build.push(txt[j]);
                        if (find !== 0) {
                            build = build.concat(new Array(find).fill("_"));
                            find = 0;
                        }
                    }
                }
                if (find === count && (count != 1 || (txt[j + 1] === " " || txt[j + 1] === "\n" || txt[j + 1] === undefined))) {
                    appendcurrent();
                    i = j;
                    const underscores = "_".repeat(count);
                    if (count === 1) {
                        const i = document.createElement("i");
                        if (keep) {
                            i.append(underscores);
                        }
                        i.appendChild(this.markdown(build, { keep: keep, stdsize: stdsize }));
                        if (keep) {
                            i.append(underscores);
                        }
                        span.appendChild(i);
                    }
                    else if (count === 2) {
                        const u = document.createElement("u");
                        if (keep) {
                            u.append(underscores);
                        }
                        u.appendChild(this.markdown(build, { keep: keep, stdsize: stdsize }));
                        if (keep) {
                            u.append(underscores);
                        }
                        span.appendChild(u);
                    }
                    else {
                        const u = document.createElement("u");
                        const i = document.createElement("i");
                        if (keep) {
                            i.append(underscores);
                        }
                        i.appendChild(this.markdown(build, { keep: keep, stdsize: stdsize }));
                        if (keep) {
                            i.append(underscores);
                        }
                        u.appendChild(i);
                        span.appendChild(u);
                    }
                    i--;
                    continue;
                }
            }
            if (txt[i] === "~" && txt[i + 1] === "~") {
                let count = 2;
                let build = [];
                let find = 0;
                let j = i + 2;
                for (; txt[j] !== undefined && find !== count; j++) {
                    if (txt[j] === "~") {
                        find++;
                    }
                    else {
                        build.push(txt[j]);
                        if (find !== 0) {
                            build = build.concat(new Array(find).fill("~"));
                            find = 0;
                        }
                    }
                }
                if (find === count) {
                    appendcurrent();
                    i = j - 1;
                    const tildes = "~~";
                    if (count === 2) {
                        const s = document.createElement("s");
                        if (keep) {
                            s.append(tildes);
                        }
                        s.appendChild(this.markdown(build, { keep: keep, stdsize: stdsize }));
                        if (keep) {
                            s.append(tildes);
                        }
                        span.appendChild(s);
                    }
                    continue;
                }
            }
            if (txt[i] === "|" && txt[i + 1] === "|") {
                let count = 2;
                let build = [];
                let find = 0;
                let j = i + 2;
                for (; txt[j] !== undefined && find !== count; j++) {
                    if (txt[j] === "|") {
                        find++;
                    }
                    else {
                        build.push(txt[j]);
                        if (find !== 0) {
                            build = build.concat(new Array(find).fill("~"));
                            find = 0;
                        }
                    }
                }
                if (find === count) {
                    appendcurrent();
                    i = j - 1;
                    const pipes = "||";
                    if (count === 2) {
                        const j = document.createElement("j");
                        if (keep) {
                            j.append(pipes);
                        }
                        j.appendChild(this.markdown(build, { keep: keep, stdsize: stdsize }));
                        j.classList.add("spoiler");
                        j.onclick = MarkDown.unspoil;
                        if (keep) {
                            j.append(pipes);
                        }
                        span.appendChild(j);
                    }
                    continue;
                }
            }
            if (txt[i] === "<" && txt[i + 1] === "t" && txt[i + 2] === ":") {
                let found = false;
                const build = ["<", "t", ":"];
                let j = i + 3;
                for (; txt[j] !== void 0; j++) {
                    build.push(txt[j]);
                    if (txt[j] === ">") {
                        found = true;
                        break;
                    }
                }
                if (found) {
                    appendcurrent();
                    i = j;
                    const parts = build.join("").match(/^<t:([0-9]{1,16})(:([tTdDfFR]))?>$/);
                    const dateInput = new Date(Number.parseInt(parts[1]) * 1000);
                    let time = "";
                    if (Number.isNaN(dateInput.getTime()))
                        time = build.join("");
                    else {
                        if (parts[3] === "d")
                            time = dateInput.toLocaleString(void 0, { day: "2-digit", month: "2-digit", year: "numeric" });
                        else if (parts[3] === "D")
                            time = dateInput.toLocaleString(void 0, { day: "numeric", month: "long", year: "numeric" });
                        else if (!parts[3] || parts[3] === "f")
                            time = dateInput.toLocaleString(void 0, { day: "numeric", month: "long", year: "numeric" }) + " " +
                                dateInput.toLocaleString(void 0, { hour: "2-digit", minute: "2-digit" });
                        else if (parts[3] === "F")
                            time = dateInput.toLocaleString(void 0, { day: "numeric", month: "long", year: "numeric", weekday: "long" }) + " " +
                                dateInput.toLocaleString(void 0, { hour: "2-digit", minute: "2-digit" });
                        else if (parts[3] === "t")
                            time = dateInput.toLocaleString(void 0, { hour: "2-digit", minute: "2-digit" });
                        else if (parts[3] === "T")
                            time = dateInput.toLocaleString(void 0, { hour: "2-digit", minute: "2-digit", second: "2-digit" });
                        else if (parts[3] === "R")
                            time = Math.round((Date.now() - (Number.parseInt(parts[1]) * 1000)) / 1000 / 60) + " minutes ago";
                    }
                    const timeElem = document.createElement("span");
                    timeElem.classList.add("markdown-timestamp");
                    timeElem.textContent = time;
                    span.appendChild(timeElem);
                    continue;
                }
            }
            if (txt[i] === "<" && (txt[i + 1] === ":" || (txt[i + 1] === "a" && txt[i + 2] === ":"))) {
                let found = false;
                const build = txt[i + 1] === "a" ? ["<", "a", ":"] : ["<", ":"];
                let j = i + build.length;
                for (; txt[j] !== void 0; j++) {
                    build.push(txt[j]);
                    if (txt[j] === ">") {
                        found = true;
                        break;
                    }
                }
                if (found) {
                    const buildjoin = build.join("");
                    const parts = buildjoin.match(/^<(a)?:\w+:(\d{10,30})>$/);
                    if (parts && parts[2]) {
                        appendcurrent();
                        i = j;
                        const isEmojiOnly = txt.join("").trim() === buildjoin.trim();
                        const emojiElem = document.createElement("img");
                        emojiElem.classList.add("md-emoji");
                        emojiElem.classList.add(isEmojiOnly ? "bigemoji" : "smallemoji");
                        emojiElem.crossOrigin = "anonymous";
                        emojiElem.src = this.info.cdn.toString() + "emojis/" + parts[2] + "." + (parts[1] ? "gif" : "png") + "?size=32";
                        emojiElem.alt = buildjoin;
                        emojiElem.loading = "lazy";
                        span.appendChild(emojiElem);
                        continue;
                    }
                }
            }
            current.textContent += txt[i];
        }
        appendcurrent();
        return span;
    }
    static unspoil(e) {
        e.target.classList.remove("spoiler");
        e.target.classList.add("unspoiled");
    }
    giveBox(box) {
        box.onkeydown = _ => {
            //console.log(_);
        };
        let prevcontent = "";
        box.onkeyup = _ => {
            const content = MarkDown.gatherBoxText(box);
            if (content !== prevcontent) {
                prevcontent = content;
                this.txt = content.split("");
                this.boxupdate(box);
            }
        };
        box.onpaste = _ => {
            console.log(_.clipboardData.types);
            const data = _.clipboardData.getData("text");
            document.execCommand('insertHTML', false, data);
            _.preventDefault();
            box.onkeyup(new KeyboardEvent("_"));
        };
    }
    boxupdate(box) {
        var restore = saveCaretPosition(box);
        box.innerHTML = "";
        box.append(this.makeHTML({ keep: true }));
        restore();
    }
    static gatherBoxText(element) {
        if (element.tagName.toLowerCase() === "img") {
            return element.alt;
        }
        if (element.tagName.toLowerCase() === "br") {
            return "\n";
        }
        let build = "";
        for (const thing of element.childNodes) {
            if (thing instanceof Text) {
                const text = thing.textContent;
                build += text;
                continue;
            }
            const text = this.gatherBoxText(thing);
            if (text) {
                build += text;
            }
        }
        return build;
    }
}
//solution from https://stackoverflow.com/questions/4576694/saving-and-restoring-caret-position-for-contenteditable-div
function saveCaretPosition(context) {
    var selection = window.getSelection();
    var range = selection.getRangeAt(0);
    range.setStart(context, 0);
    var len = range.toString().length;
    return function restore() {
        var pos = getTextNodeAtPosition(context, len);
        selection.removeAllRanges();
        var range = new Range();
        range.setStart(pos.node, pos.position);
        selection.addRange(range);
    };
}
function getTextNodeAtPosition(root, index) {
    const NODE_TYPE = NodeFilter.SHOW_TEXT;
    var treeWalker = document.createTreeWalker(root, NODE_TYPE, function next(elem) {
        if (index > elem.textContent.length) {
            index -= elem.textContent.length;
            return NodeFilter.FILTER_REJECT;
        }
        return NodeFilter.FILTER_ACCEPT;
    });
    var c = treeWalker.nextNode();
    return {
        node: c ? c : root,
        position: index
    };
}
