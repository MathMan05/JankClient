import type { BinRead } from "../utils/binaryUtils.js";
import { Track } from "./track.js";

export class Audio {
	name: string;
	tracks: (Track | number)[];
	constructor(name: string, tracks: (Track | number)[]) {
		this.tracks = tracks;
		this.name = name;
	}
	static parse(read: BinRead, trackarr: Track[]): Audio {
		const name = read.readString8();
		const length = read.read16();
		const tracks: (Track | number)[] = [];
		for (let i = 0; i < length; i++) {
			const index = read.read16();
			if (index === 0) {
				tracks.push(read.readFloat32());
			} else {
				tracks.push(trackarr[index - 1]);
			}
		}
		return new Audio(name, tracks);
	}
	async play() {
		for (const thing of this.tracks) {
			if (thing instanceof Track) {
				thing.play();
			} else {
				await new Promise((res) => setTimeout(res, thing));
			}
		}
	}
}
