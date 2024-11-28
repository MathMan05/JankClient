import{ Message }from"./message.js";
import{ filejson }from"./jsontypes.js";
import { ImagesDisplay } from "./disimg.js";

class File{
	owner: Message | null;
	id: string;
	filename: string;
	content_type: string;
	width: number | undefined;
	height: number | undefined;
	proxy_url: string | undefined;
	url: string;
	size: number;
	constructor(fileJSON: filejson, owner: Message | null){
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
	getHTML(temp: boolean = false): HTMLElement{
		const src = this.proxy_url || this.url;
		if(this.width && this.height){
			let scale = 1;
			const max = 96 * 3;
			scale = Math.max(scale, this.width / max);
			scale = Math.max(scale, this.height / max);
			this.width /= scale;
			this.height /= scale;
		}
		if(this.content_type.startsWith("image/")){
			const div = document.createElement("div");
			const img = document.createElement("img");
			img.classList.add("messageimg");
			div.classList.add("messageimgdiv");
			img.onclick = function(){
				const full = new ImagesDisplay([img.src]);
				full.show();
			};
			img.src = src;
			div.append(img);
			if(this.width){
				div.style.width = this.width + "px";
				div.style.height = this.height + "px";
			}
			return div;
		}else if(this.content_type.startsWith("video/")){
			const video = document.createElement("video");
			const source = document.createElement("source");
			source.src = src;
			video.append(source);
			source.type = this.content_type;
			video.controls = !temp;
			if(this.width && this.height){
				video.width = this.width;
				video.height = this.height;
			}
			return video;
		}else if(this.content_type.startsWith("audio/")){
			const audio = document.createElement("audio");
			const source = document.createElement("source");
			source.src = src;
			audio.append(source);
			source.type = this.content_type;
			audio.controls = !temp;
			return audio;
		}else{
			return this.createunknown();
		}
	}
	upHTML(files: Blob[], file: globalThis.File): HTMLElement{
		const div = document.createElement("div");
		const contained = this.getHTML(true);
		div.classList.add("containedFile");
		div.append(contained);
		const controls = document.createElement("div");
		const garbage = document.createElement("button");
		const icon = document.createElement("span");
		icon.classList.add("svgicon","svg-delete");
		garbage.append(icon);
		garbage.onclick = _=>{
			div.remove();
			files.splice(files.indexOf(file), 1);
		};
		controls.classList.add("controls");
		div.append(controls);
		controls.append(garbage);
		return div;
	}
	static initFromBlob(file: globalThis.File){
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
			null
		);
	}
	createunknown(): HTMLElement{
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
		if(src){
			const a = document.createElement("a");
			a.href = src;
			a.textContent = this.filename;
			nametd.append(a);
		}else{
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
	static filesizehuman(fsize: number){
		const i = fsize == 0 ? 0 : Math.floor(Math.log(fsize) / Math.log(1024));
		return(
			Number((fsize / Math.pow(1024, i)).toFixed(2)) * 1 + " " + ["Bytes", "Kilobytes", "Megabytes", "Gigabytes", "Terabytes"][i] // I don't think this changes across languages, correct me if I'm wrong
		);
	}
}
export{ File };
