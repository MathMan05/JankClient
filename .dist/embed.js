import { Dialog } from "./dialog.js";
import { MarkDown } from "./markdown.js";
class Embed {
    type;
    owner;
    json;
    constructor(json, owner) {
        this.type = this.getType(json);
        this.owner = owner;
        this.json = json;
    }
    getType(json) {
        return json.type || "rich";
    }
    generateHTML() {
        switch (this.type) {
            case "rich":
                return this.generateRich();
            case "image":
                return this.generateImage();
            case "link":
                return this.generateLink();
            case "video":
            case "article":
                return this.generateArticle();
            default:
                console.warn(`unsupported embed type ${this.type}, please add support dev :3`, this.json);
                return document.createElement("div"); //prevent errors by giving blank div
        }
    }
    get message() {
        return this.owner;
    }
    get channel() {
        return this.message.channel;
    }
    get guild() {
        return this.channel.guild;
    }
    get localuser() {
        return this.guild.localuser;
    }
    generateRich() {
        const div = document.createElement("div");
        if (this.json.color) {
            div.style.backgroundColor = "#" + this.json.color.toString(16);
        }
        div.classList.add("embed-color");
        const embed = document.createElement("div");
        embed.classList.add("embed");
        div.append(embed);
        if (this.json.author) {
            const authorline = document.createElement("div");
            if (this.json.author.icon_url) {
                const img = document.createElement("img");
                img.classList.add("embedimg");
                img.src = this.json.author.icon_url;
                authorline.append(img);
            }
            const a = document.createElement("a");
            a.textContent = this.json.author.name;
            if (this.json.author.url) {
                MarkDown.safeLink(a, this.json.author.url);
            }
            a.classList.add("username");
            authorline.append(a);
            embed.append(authorline);
        }
        if (this.json.title) {
            const title = document.createElement("a");
            title.append(new MarkDown(this.json.title, this.channel).makeHTML());
            if (this.json.url) {
                MarkDown.safeLink(title, this.json.url);
            }
            title.classList.add("embedtitle");
            embed.append(title);
        }
        if (this.json.description) {
            const p = document.createElement("p");
            p.append(new MarkDown(this.json.description, this.channel).makeHTML());
            embed.append(p);
        }
        embed.append(document.createElement("br"));
        if (this.json.fields) {
            for (const thing of this.json.fields) {
                const div = document.createElement("div");
                const b = document.createElement("b");
                b.textContent = thing.name;
                div.append(b);
                const p = document.createElement("p");
                p.append(new MarkDown(thing.value, this.channel).makeHTML());
                p.classList.add("embedp");
                div.append(p);
                if (thing.inline) {
                    div.classList.add("inline");
                }
                embed.append(div);
            }
        }
        if (this.json.footer || this.json.timestamp) {
            const footer = document.createElement("div");
            if (this.json?.footer?.icon_url) {
                const img = document.createElement("img");
                img.src = this.json.footer.icon_url;
                img.classList.add("embedicon");
                footer.append(img);
            }
            if (this.json?.footer?.text) {
                const span = document.createElement("span");
                span.textContent = this.json.footer.text;
                span.classList.add("spaceright");
                footer.append(span);
            }
            if (this.json?.footer && this.json?.timestamp) {
                const span = document.createElement("span");
                span.textContent = "•";
                span.classList.add("spaceright");
                footer.append(span);
            }
            if (this.json?.timestamp) {
                const span = document.createElement("span");
                span.textContent = new Date(this.json.timestamp).toLocaleString();
                footer.append(span);
            }
            embed.append(footer);
        }
        return div;
    }
    generateImage() {
        const img = document.createElement("img");
        img.classList.add("messageimg");
        img.onclick = function () {
            const full = new Dialog(["img", img.src, ["fit"]]);
            full.show();
        };
        img.src = this.json.thumbnail.proxy_url;
        if (this.json.thumbnail.width) {
            let scale = 1;
            const max = 96 * 3;
            scale = Math.max(scale, this.json.thumbnail.width / max);
            scale = Math.max(scale, this.json.thumbnail.height / max);
            this.json.thumbnail.width /= scale;
            this.json.thumbnail.height /= scale;
        }
        img.style.width = this.json.thumbnail.width + "px";
        img.style.height = this.json.thumbnail.height + "px";
        console.log(this.json, "Image fix");
        return img;
    }
    generateLink() {
        const table = document.createElement("table");
        table.classList.add("embed", "linkembed");
        const trtop = document.createElement("tr");
        table.append(trtop);
        if (this.json.url && this.json.title) {
            const td = document.createElement("td");
            const a = document.createElement("a");
            MarkDown.safeLink(a, this.json.url);
            a.textContent = this.json.title;
            td.append(a);
            trtop.append(td);
        }
        {
            const td = document.createElement("td");
            const img = document.createElement("img");
            if (this.json.thumbnail) {
                img.classList.add("embedimg");
                img.onclick = function () {
                    const full = new Dialog(["img", img.src, ["fit"]]);
                    full.show();
                };
                img.src = this.json.thumbnail.proxy_url;
                td.append(img);
            }
            trtop.append(td);
        }
        const bottomtr = document.createElement("tr");
        const td = document.createElement("td");
        if (this.json.description) {
            const span = document.createElement("span");
            span.textContent = this.json.description;
            td.append(span);
        }
        bottomtr.append(td);
        table.append(bottomtr);
        return table;
    }
    generateArticle() {
        const colordiv = document.createElement("div");
        colordiv.style.backgroundColor = "#000000";
        colordiv.classList.add("embed-color");
        const div = document.createElement("div");
        div.classList.add("embed");
        if (this.json.provider) {
            const provider = document.createElement("p");
            provider.classList.add("provider");
            provider.textContent = this.json.provider.name;
            div.append(provider);
        }
        const a = document.createElement("a");
        if (this.json.url && this.json.url) {
            MarkDown.safeLink(a, this.json.url);
            a.textContent = this.json.url;
            div.append(a);
        }
        if (this.json.description) {
            const description = document.createElement("p");
            description.textContent = this.json.description;
            div.append(description);
        }
        if (this.json.thumbnail) {
            const img = document.createElement("img");
            if (this.json.thumbnail.width && this.json.thumbnail.width) {
                let scale = 1;
                const inch = 96;
                scale = Math.max(scale, this.json.thumbnail.width / inch / 4);
                scale = Math.max(scale, this.json.thumbnail.height / inch / 3);
                this.json.thumbnail.width /= scale;
                this.json.thumbnail.height /= scale;
                img.style.width = this.json.thumbnail.width + "px";
                img.style.height = this.json.thumbnail.height + "px";
            }
            img.classList.add("bigembedimg");
            if (this.json.video) {
                img.onclick = async () => {
                    img.remove();
                    const iframe = document.createElement("iframe");
                    iframe.src = this.json.video.url + "?autoplay=1";
                    if (this.json.thumbnail.width && this.json.thumbnail.width) {
                        iframe.style.width = this.json.thumbnail.width + "px";
                        iframe.style.height = this.json.thumbnail.height + "px";
                    }
                    div.append(iframe);
                };
            }
            else {
                img.onclick = async () => {
                    const full = new Dialog(["img", img.src, ["fit"]]);
                    full.show();
                };
            }
            img.src = this.json.thumbnail.proxy_url || this.json.thumbnail.url;
            div.append(img);
        }
        colordiv.append(div);
        return colordiv;
    }
}
export { Embed };
