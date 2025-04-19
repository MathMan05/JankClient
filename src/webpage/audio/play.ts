import { BinRead } from "../utils/binaryUtils.js";
import { Track } from "./track.js";
import { AVoice } from "./voice.js";
import { Audio } from "./audio.js";
export class Play {
	voices: [AVoice, string][];
	tracks: Track[];
	audios: Map<string, Audio>;
	constructor(
		voices: [AVoice, string][],
		tracks: Track[],
		audios: Map<string, Audio>,
	) {
		this.voices = voices;
		this.tracks = tracks;
		this.audios = audios;
	}
	static parseBin(buffer: ArrayBuffer) {
		const read = new BinRead(buffer);
		if (read.readStringNo(4) !== "jasf")
			throw new Error("this is not a jasf file");
		let voices = read.read8();
		let six = false;
		if (voices === 255) {
			voices = read.read16();
			six = true;
		}
		const voiceArr: [AVoice, string][] = [];
		for (let i = 0; i < voices; i++) {
			voiceArr.push(AVoice.getVoice(read));
		}

		const tracks = read.read16();
		const trackArr: Track[] = [];
		for (let i = 0; i < tracks; i++) {
			trackArr.push(Track.parse(read, voiceArr, six));
		}

		const audios = read.read16();
		const audioArr = new Map<string, Audio>();
		for (let i = 0; i < audios; i++) {
			const a = Audio.parse(read, trackArr);
			audioArr.set(a.name, a);
		}

		return new Play(voiceArr, trackArr, audioArr);
	}
	static async playURL(url: string) {
		const res = await fetch(url);
		const arr = await res.arrayBuffer();
		return Play.parseBin(arr);
	}
}
