import { Contextmenu } from "./contextmenu.js";
import { Guild } from "./guild.js";
class Emoji {
    static emojis;
    name;
    id;
    animated;
    owner;
    get guild() {
        if (this.owner instanceof Guild) {
            return this.owner;
        }
    }
    get localuser() {
        if (this.owner instanceof Guild) {
            return this.owner.localuser;
        }
        else {
            return this.owner;
        }
    }
    get info() {
        return this.owner.info;
    }
    constructor(json, owner) {
        this.name = json.name;
        this.id = json.id;
        this.animated = json.animated;
        this.owner = owner;
    }
    getHTML(bigemoji = false) {
        const emojiElem = document.createElement("img");
        emojiElem.classList.add("md-emoji");
        emojiElem.classList.add(bigemoji ? "bigemoji" : "smallemoji");
        emojiElem.crossOrigin = "anonymous";
        emojiElem.src = this.info.cdn + "/emojis/" + this.id + "." + (this.animated ? "gif" : "png") + "?size=32";
        emojiElem.alt = this.name;
        emojiElem.loading = "lazy";
        return emojiElem;
    }
    static decodeEmojiList(buffer) {
        const view = new DataView(buffer, 0);
        let i = 0;
        function read16() {
            const int = view.getUint16(i);
            i += 2;
            return int;
        }
        function read8() {
            const int = view.getUint8(i);
            i += 1;
            return int;
        }
        function readString8() {
            return readStringNo(read8());
        }
        function readString16() {
            return readStringNo(read16());
        }
        function readStringNo(length) {
            const array = new Uint8Array(length);
            for (let i = 0; i < length; i++) {
                array[i] = read8();
            }
            //console.log(array);
            return new TextDecoder("utf-8").decode(array.buffer);
        }
        const build = [];
        let cats = read16();
        for (; cats !== 0; cats--) {
            const name = readString16();
            const emojis = [];
            let emojinumber = read16();
            for (; emojinumber !== 0; emojinumber--) {
                //console.log(emojis);
                const name = readString8();
                const len = read8();
                const skin_tone_support = len > 127;
                const emoji = readStringNo(len - (Number(skin_tone_support) * 128));
                emojis.push({
                    name,
                    skin_tone_support,
                    emoji
                });
            }
            build.push({
                name,
                emojis
            });
        }
        this.emojis = build;
        console.log(build);
    }
    static grabEmoji() {
        fetch("/emoji.bin").then(e => {
            return e.arrayBuffer();
        }).then(e => {
            Emoji.decodeEmojiList(e);
        });
    }
    static async emojiPicker(x, y, localuser) {
        let res;
        const promise = new Promise(r => {
            res = r;
        });
        const menu = document.createElement("div");
        menu.classList.add("flextttb", "emojiPicker");
        menu.style.top = y + "px";
        menu.style.left = x + "px";
        const title = document.createElement("h2");
        title.textContent = Emoji.emojis[0].name;
        title.classList.add("emojiTitle");
        menu.append(title);
        const selection = document.createElement("div");
        selection.classList.add("flexltr", "dontshrink", "emojirow");
        const body = document.createElement("div");
        body.classList.add("emojiBody");
        let isFirst = true;
        localuser.guilds.filter(guild => guild.id != "@me" && guild.emojis.length > 0).forEach(guild => {
            const select = document.createElement("div");
            select.classList.add("emojiSelect");
            if (guild.properties.icon) {
                const img = document.createElement("img");
                img.classList.add("pfp", "servericon", "emoji-server");
                img.crossOrigin = "anonymous";
                img.src = localuser.info.cdn + "/icons/" + guild.properties.id + "/" + guild.properties.icon + ".png?size=48";
                img.alt = "Server: " + guild.properties.name;
                select.appendChild(img);
            }
            else {
                const div = document.createElement("span");
                div.textContent = guild.properties.name.replace(/'s /g, " ").replace(/\w+/g, word => word[0]).replace(/\s/g, "");
                select.append(div);
            }
            selection.append(select);
            const clickEvent = () => {
                title.textContent = guild.properties.name;
                body.innerHTML = "";
                for (const emojit of guild.emojis) {
                    const emojiElem = document.createElement("div");
                    emojiElem.classList.add("emojiSelect");
                    const emojiClass = new Emoji({
                        id: emojit.id,
                        name: emojit.name,
                        animated: emojit.animated
                    }, localuser);
                    emojiElem.append(emojiClass.getHTML());
                    body.append(emojiElem);
                    emojiElem.addEventListener("click", () => {
                        res(emojiClass);
                        Contextmenu.currentmenu.remove();
                    });
                }
            };
            select.addEventListener("click", clickEvent);
            if (isFirst) {
                clickEvent();
                isFirst = false;
            }
        });
        setTimeout(() => {
            if (Contextmenu.currentmenu != "") {
                Contextmenu.currentmenu.remove();
            }
            document.body.append(menu);
            Contextmenu.currentmenu = menu;
            Contextmenu.keepOnScreen(menu);
        }, 10);
        let i = 0;
        for (const thing of Emoji.emojis) {
            const select = document.createElement("div");
            select.textContent = thing.emojis[0].emoji;
            select.classList.add("emojiSelect");
            selection.append(select);
            const clickEvent = () => {
                title.textContent = thing.name;
                body.innerHTML = "";
                for (const emojit of thing.emojis) {
                    const emoji = document.createElement("div");
                    emoji.classList.add("emojiSelect");
                    emoji.textContent = emojit.emoji;
                    body.append(emoji);
                    emoji.onclick = _ => {
                        res(emojit.emoji);
                        Contextmenu.currentmenu.remove();
                    };
                }
            };
            select.onclick = clickEvent;
            if (i === 0) {
                clickEvent();
            }
            i++;
        }
        menu.append(selection);
        menu.append(body);
        return promise;
    }
}
Emoji.grabEmoji();
export { Emoji };
