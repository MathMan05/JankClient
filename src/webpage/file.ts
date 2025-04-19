import type {Message} from "./message.js";
import type {filejson} from "./jsontypes.js";
import {ImagesDisplay} from "./disimg.js";
import {makePlayBox, MediaPlayer} from "./media.js";
import {I18n} from "./i18n.js";
import {createImg} from "./utils/utils.js";
class File {
	owner: Message | null;
	id: string;
	filename: string;
	content_type: string;
	width: number | undefined;
	height: number | undefined;
	proxy_url: string | undefined;
	url: string;
	size: number;
	constructor(fileJSON: filejson, owner: Message | null) {
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
	getHTML(temp = false, fullScreen = false, OSpoiler = false): HTMLElement {
		function makeSpoilerHTML(): HTMLElement {
			const spoil = document.createElement("div");
			spoil.classList.add("fSpoil");
			const stext = document.createElement("span");
			stext.textContent = I18n.spoiler();
			spoil.append(stext);
			spoil.onclick = () => spoil.remove();
			return spoil;
		}
		OSpoiler ||= this.filename.startsWith("SPOILER_");
		const src = this.proxy_url || this.url;
		this.width ||= 1000;
		this.height ||= 1000;
		if (this.width && this.height) {
			let scale = 1;
			const max = 96 * 3;
			scale = Math.max(scale, this.width / max);
			scale = Math.max(scale, this.height / max);
			this.width /= scale;
			this.height /= scale;
		}

		if (this.content_type.startsWith("image/")) {
			const div = document.createElement("div");
			const img = createImg(src);
			if (!fullScreen) {
				img.classList.add("messageimg");
				div.classList.add("messageimgdiv");
			}
			img.onclick = () => {
				if (this.owner) {
					const full = new ImagesDisplay(
						this.owner.attachments,
						this.owner.attachments.indexOf(this),
					);
					full.show();
				} else {
					const full = new ImagesDisplay([this]);
					full.show();
				}
			};
			div.append(img);
			if (this.width && !fullScreen) {
				div.style.maxWidth = `${this.width}px`;
				div.style.maxHeight = `${this.height}px`;
			}
			if (!fullScreen) {
				if (OSpoiler) {
					div.append(makeSpoilerHTML());
				}
				return div;
			}
				return img;
		}if (this.content_type.startsWith("video/")) {
			const video = document.createElement("video");
			const source = document.createElement("source");
			source.src = src;
			video.append(source);
			source.type = this.content_type;
			video.controls = !temp;
			if (this.width && this.height) {
				video.width = this.width;
				video.height = this.height;
			}
			if (OSpoiler) {
				const div = document.createElement("div");
				div.style.setProperty("position", "relative");
				div.append(video, makeSpoilerHTML());
				return div;
			}
			return video;
		}if (this.content_type.startsWith("audio/")) {
			const a = this.getAudioHTML();
			if (OSpoiler) {
				a.append(makeSpoilerHTML());
			}
			return a;
		}
			const uk = this.createunknown();
			if (OSpoiler) {
				uk.append(makeSpoilerHTML());
			}
			return uk;
	}
	private getAudioHTML() {
		const src = this.proxy_url || this.url;
		return makePlayBox(src, player);
	}
	upHTML(files: Blob[], file: globalThis.File): HTMLElement {
		const div = document.createElement("div");
		let contained = this.getHTML(true, false, file.name.startsWith("SPOILER_"));
		div.classList.add("containedFile");
		div.append(contained);
		const controls = document.createElement("div");
		controls.classList.add("controls");

		const garbage = document.createElement("button");
		const icon = document.createElement("span");
		icon.classList.add("svgicon", "svg-delete");
		garbage.append(icon);
		garbage.onclick = (_) => {
			div.remove();
			files.splice(files.indexOf(file), 1);
		};

		const spoiler = document.createElement("button");
		const sicon = document.createElement("span");
		sicon.classList.add(
			"svgicon",
			file.name.startsWith("SPOILER_") ? "svg-unspoiler" : "svg-spoiler",
		);
		spoiler.append(sicon);
		spoiler.onclick = (_) => {
			if (file.name.startsWith("SPOILER_")) {
				const name = file.name.split("SPOILER_");
				name.shift();
				file = files[files.indexOf(file)] = new globalThis.File([file], name.join("SPOILER_"), {
					type: file.type,
				});
				sicon.classList.add("svg-spoiler");
				sicon.classList.remove("svg-unspoiler");
			} else {
				file = files[files.indexOf(file)] = new globalThis.File([file], `SPOILER_${file.name}`, {
					type: file.type,
				});
				sicon.classList.add("svg-unspoiler");
				sicon.classList.remove("svg-spoiler");
			}
			contained.remove();
			contained = this.getHTML(true, false, file.name.startsWith("SPOILER_"));
			div.append(contained);
		};

		div.append(controls);
		controls.append(spoiler, garbage);
		return div;
	}
	static initFromBlob(file: globalThis.File) {
		return new File(
			{
				filename: file.name,
				size: file.size,
				id: "null",
				content_type: file.type,
				width: undefined,
				height: undefined,
				url: URL.createObjectURL(file),
				proxy_url: undefined,
			},
			null,
		);
	}
	createunknown(): HTMLElement {
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
		} else {
			nametd.textContent = this.filename;
		}

		nametd.classList.add("filename");
		nametr.append(nametd);
		const sizetr = document.createElement("tr");
		const size = document.createElement("td");
		sizetr.append(size);
		size.textContent = `Size:${File.filesizehuman(this.size)}`;
		size.classList.add("filesize");
		div.appendChild(sizetr);
		return div;
	}
	static filesizehuman(fsize: number) {
		const i = fsize === 0 ? 0 : Math.floor(Math.log(fsize) / Math.log(1024));
		return (
			`${Number((fsize / 1024 ** i).toFixed(2)) * 1} ${["Bytes", "Kilobytes", "Megabytes", "Gigabytes", "Terabytes"][i]}` // I don't think this changes across languages, correct me if I'm wrong
		);
	}
}

const player = new MediaPlayer();
export {File};
