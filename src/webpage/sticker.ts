import {Guild} from "./guild.js";
import {stickerJson} from "./jsontypes.js";
import {SnowFlake} from "./snowflake.js";
import {createImg} from "./utils/utils.js";

class Sticker extends SnowFlake {
	name: string;
	type: number;
	format_type: number;
	owner: Guild;
	description: string;
	tags: string;
	get guild() {
		return this.owner;
	}
	get localuser() {
		return this.owner.localuser;
	}
	constructor(json: stickerJson, owner: Guild) {
		super(json.id);
		this.name = json.name;
		this.type = json.type;
		this.format_type = json.format_type;
		this.owner = owner;
		this.tags = json.tags;
		this.description = json.description || "";
	}
	getHTML(): HTMLElement {
		const img = createImg(
			this.owner.info.cdn + "/stickers/" + this.id + ".webp?size=160&quality=lossless",
		);
		img.classList.add("sticker");
		return img;
	}
}
export {Sticker};
