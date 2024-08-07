import { Fullscreen } from "./fullscreen.js";
class File {
    owner;
    id;
    filename;
    content_type;
    width;
    height;
    proxy_url;
    url;
    size;
    constructor(fileJSON, owner) {
        this.owner = owner;
        this.id = fileJSON.id;
        this.filename = fileJSON.filename;
        this.content_type = fileJSON.content_type;
        this.width = fileJSON.width;
        this.height = fileJSON.height;
        this.url = fileJSON.url;
        this.proxy_url = fileJSON.proxy_url;
        this.content_type = fileJSON.content_type;
        this.size = fileJSON.size;
    }
    getHTML(temp = false) {
        const src = this.proxy_url || this.url;
        if (this.content_type.startsWith('image/')) {
            const img = document.createElement("img");
            img.classList.add("messageimg");
            img.onclick = function () {
                const full = new Fullscreen(["img", img.src, ["fit"]]);
                full.show();
            };
            img.src = src;
            if (this.width) {
                img.height = this.height;
                img.width = this.width;
            }
            console.log(this.width, this.height);
            return img;
        }
        else if (this.content_type.startsWith('video/')) {
            const video = document.createElement("video");
            const source = document.createElement("source");
            source.src = src;
            video.append(source);
            source.type = this.content_type;
            video.controls = !temp;
            return video;
        }
        else if (this.content_type.startsWith('audio/')) {
            const audio = document.createElement("audio");
            const source = document.createElement("source");
            source.src = src;
            audio.append(source);
            source.type = this.content_type;
            audio.controls = !temp;
            return audio;
        }
        else {
            return this.createunknown();
        }
    }
    upHTML(files, file) {
        const div = document.createElement("div");
        const contained = this.getHTML(true);
        div.classList.add("containedFile");
        div.append(contained);
        const controls = document.createElement("div");
        const garbage = document.createElement("button");
        garbage.textContent = "🗑";
        garbage.onclick = _ => {
            div.remove();
            files.splice(files.indexOf(file), 1);
        };
        controls.classList.add("controls");
        div.append(controls);
        controls.append(garbage);
        return div;
    }
    static initFromBlob(file) {
        return new File({
            filename: file.name,
            size: file.size,
            id: null,
            content_type: file.type,
            width: undefined,
            height: undefined,
            url: URL.createObjectURL(file),
            proxy_url: undefined
        }, null);
    }
    createunknown() {
        console.log("🗎");
        const src = this.proxy_url || this.url;
        const div = document.createElement("table");
        div.classList.add("unknownfile");
        const nametr = document.createElement("tr");
        div.append(nametr);
        const fileicon = document.createElement("td");
        nametr.append(fileicon);
        fileicon.append("🗎");
        fileicon.classList.add("fileicon");
        fileicon.rowSpan = 2;
        const nametd = document.createElement("td");
        if (src) {
            const a = document.createElement("a");
            a.href = src;
            a.textContent = this.filename;
            nametd.append(a);
        }
        else {
            nametd.textContent = this.filename;
        }
        nametd.classList.add("filename");
        nametr.append(nametd);
        const sizetr = document.createElement("tr");
        const size = document.createElement("td");
        sizetr.append(size);
        size.textContent = "Size:" + File.filesizehuman(this.size);
        size.classList.add("filesize");
        div.appendChild(sizetr);
        return div;
    }
    static filesizehuman(fsize) {
        var i = fsize == 0 ? 0 : Math.floor(Math.log(fsize) / Math.log(1024));
        return +((fsize / Math.pow(1024, i)).toFixed(2)) * 1 + ' ' + ['Bytes', 'Kilobytes', 'Megabytes', 'Gigabytes', 'Terabytes'][i];
    }
}
export { File };
