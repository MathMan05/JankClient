class Contextmenu {
    static currentmenu;
    name;
    buttons;
    div;
    static setup() {
        Contextmenu.currentmenu = "";
        document.addEventListener('click', function (event) {
            if (Contextmenu.currentmenu == "") {
                return;
            }
            if (!Contextmenu.currentmenu.contains(event.target)) {
                Contextmenu.currentmenu.remove();
                Contextmenu.currentmenu = "";
            }
        });
    }
    constructor(name) {
        this.name = name;
        this.buttons = [];
    }
    addbutton(text, onclick, img = null, shown = _ => true, enabled = _ => true) {
        this.buttons.push([text, onclick, img, shown, enabled, "button"]);
        return {};
    }
    addsubmenu(text, onclick, img = null, shown = _ => true, enabled = _ => true) {
        this.buttons.push([text, onclick, img, shown, enabled, "submenu"]);
        return {};
    }
    makemenu(x, y, addinfo, obj) {
        const div = document.createElement("table");
        div.classList.add("contextmenu");
        for (const thing of this.buttons) {
            if (!thing[3](addinfo)) {
                continue;
            }
            const textb = document.createElement("tr");
            const intext = document.createElement("button");
            intext.disabled = !thing[4]();
            textb["button"] = intext;
            intext.classList.add("contextbutton");
            intext.textContent = thing[0];
            textb.appendChild(intext);
            console.log(thing);
            if (thing[5] === "button") {
                intext.onclick = thing[1].bind(addinfo, obj);
            }
            else if (thing[5] === "submenu") {
                intext.onclick = thing[1].bind(addinfo);
            }
            div.appendChild(textb);
        }
        if (Contextmenu.currentmenu != "") {
            Contextmenu.currentmenu.remove();
        }
        div.style.top = y + 'px';
        div.style.left = x + 'px';
        document.body.appendChild(div);
        Contextmenu.keepOnScreen(div);
        console.log(div);
        Contextmenu.currentmenu = div;
        return this.div;
    }
    bind(obj, addinfo = undefined) {
        const func = (event) => {
            event.preventDefault();
            event.stopImmediatePropagation();
            this.makemenu(event.clientX, event.clientY, addinfo, obj);
        };
        obj.addEventListener("contextmenu", func);
        return func;
    }
    static keepOnScreen(obj) {
        const html = document.documentElement.getBoundingClientRect();
        const docheight = html.height;
        const docwidth = html.width;
        const box = obj.getBoundingClientRect();
        console.log(box, docheight, docwidth);
        if (box.right > docwidth) {
            console.log("test");
            obj.style.left = docwidth - box.width + 'px';
        }
        if (box.bottom > docheight) {
            obj.style.top = docheight - box.height + 'px';
        }
    }
}
Contextmenu.setup();
export { Contextmenu as Contextmenu };
