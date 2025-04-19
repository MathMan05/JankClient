import type { BinRead } from "../utils/binaryUtils.js";

class AVoice {
	audioCtx: AudioContext;
	info: { wave: string | Function; freq: number };
	playing: boolean;
	myArrayBuffer: AudioBuffer;
	gainNode: GainNode;
	buffer: Float32Array;
	source: AudioBufferSourceNode;
	length = 1;
	constructor(
		wave: string | Function,
		freq: number,
		volume = 1,
		length = 1000,
	) {
		this.length = length;
		this.audioCtx = new window.AudioContext();
		this.info = { wave, freq };
		this.playing = false;
		this.myArrayBuffer = this.audioCtx.createBuffer(
			1,
			(this.audioCtx.sampleRate * length) / 1000,
			this.audioCtx.sampleRate,
		);
		this.gainNode = this.audioCtx.createGain();
		this.gainNode.gain.value = volume;
		this.gainNode.connect(this.audioCtx.destination);
		this.buffer = this.myArrayBuffer.getChannelData(0);
		this.source = this.audioCtx.createBufferSource();
		this.source.buffer = this.myArrayBuffer;
		this.source.loop = true;
		this.source.start();
		this.updateWave();
	}
	clone(volume: number, freq: number, length = this.length) {
		return new AVoice(this.wave, freq, volume, length);
	}
	get wave(): string | Function {
		return this.info.wave;
	}
	get freq(): number {
		return this.info.freq;
	}
	set wave(wave: string | Function) {
		this.info.wave = wave;
		this.updateWave();
	}
	set freq(freq: number) {
		this.info.freq = freq;
		this.updateWave();
	}
	updateWave(): void {
		const func = this.waveFunction();
		for (let i = 0; i < this.buffer.length; i++) {
			this.buffer[i] = func(i / this.audioCtx.sampleRate, this.freq);
		}
	}
	waveFunction(): Function {
		if (typeof this.wave === "function") {
			return this.wave;
		}
		switch (this.wave) {
			case "sin":
				return (t: number, freq: number) => {
					return Math.sin(t * Math.PI * 2 * freq);
				};
			case "triangle":
				return (t: number, freq: number) => {
					return Math.abs(((4 * t * freq) % 4) - 2) - 1;
				};
			case "sawtooth":
				return (t: number, freq: number) => {
					return ((t * freq) % 1) * 2 - 1;
				};
			case "square":
				return (t: number, freq: number) => {
					return (t * freq) % 2 < 1 ? 1 : -1;
				};
			case "white":
				return (_t: number, _freq: number) => {
					return Math.random() * 2 - 1;
				};
		}
		return new Function();
	}
	play(): void {
		if (this.playing) {
			return;
		}
		this.source.connect(this.gainNode);
		this.playing = true;
	}
	playL() {
		this.play();
		setTimeout(() => {
			this.stop();
		}, this.length);
	}
	stop(): void {
		if (this.playing) {
			this.source.disconnect();
			this.playing = false;
		}
	}
	static noises(noise: string): void {
		switch (noise) {
			case "three": {
				const voicy = new AVoice("sin", 800);
				voicy.play();
				setTimeout((_) => {
					voicy.freq = 1000;
				}, 50);
				setTimeout((_) => {
					voicy.freq = 1300;
				}, 100);
				setTimeout((_) => {
					voicy.stop();
				}, 150);
				break;
			}
			case "zip": {
				const voicy = new AVoice((t: number, freq: number) => {
					return Math.sin((t + 2) ** Math.cos(t * 4) * Math.PI * 2 * freq);
				}, 700);
				voicy.play();
				setTimeout((_) => {
					voicy.stop();
				}, 150);
				break;
			}
			case "square": {
				const voicy = new AVoice("square", 600, 0.4);
				voicy.play();
				setTimeout((_) => {
					voicy.freq = 800;
				}, 50);
				setTimeout((_) => {
					voicy.freq = 1000;
				}, 100);
				setTimeout((_) => {
					voicy.stop();
				}, 150);
				break;
			}
			case "beep": {
				const voicy = new AVoice("sin", 800);
				voicy.play();
				setTimeout((_) => {
					voicy.stop();
				}, 50);
				setTimeout((_) => {
					voicy.play();
				}, 100);
				setTimeout((_) => {
					voicy.stop();
				}, 150);
				break;
			}
			case "join": {
				const voicy = new AVoice("triangle", 600, 0.1);
				voicy.play();
				setTimeout((_) => {
					voicy.freq = 800;
				}, 75);
				setTimeout((_) => {
					voicy.freq = 1000;
				}, 150);
				setTimeout((_) => {
					voicy.stop();
				}, 200);
				break;
			}
			case "leave": {
				const voicy = new AVoice("triangle", 850, 0.5);
				voicy.play();
				setTimeout((_) => {
					voicy.freq = 700;
				}, 100);
				setTimeout((_) => {
					voicy.stop();
					voicy.freq = 400;
				}, 180);
				setTimeout((_) => {
					voicy.play();
				}, 200);
				setTimeout((_) => {
					voicy.stop();
				}, 250);
				break;
			}
		}
	}
	static get sounds() {
		return ["three", "zip", "square", "beep"];
	}
	static getVoice(read: BinRead): [AVoice, string] {
		const name = read.readString8();
		let length = read.readFloat32();
		let special: Function | string;
		if (length !== 0) {
			special = AVoice.parseExpression(read);
		} else {
			special = name;
			length = 1;
		}
		return [new AVoice(special, 0, 0, length), name];
	}
	static parseExpression(read: BinRead): Function {
		return new Function("t", "f", `return ${AVoice.PEHelper(read)};`);
	}
	static PEHelper(read: BinRead): string {
		const state = read.read8();
		switch (state) {
			case 0:
				return `${read.readFloat32()}`;
			case 1:
				return "t";
			case 2:
				return "f";
			case 3:
				return "Math.PI";
			case 4:
				return `Math.sin(${AVoice.PEHelper(read)})`;
			case 5:
				return `(${AVoice.PEHelper(read)}*${AVoice.PEHelper(read)})`;
			case 6:
				return `(${AVoice.PEHelper(read)}+${AVoice.PEHelper(read)})`;
			case 7:
				return `(${AVoice.PEHelper(read)}/${AVoice.PEHelper(read)})`;
			case 8:
				return `(${AVoice.PEHelper(read)}-${AVoice.PEHelper(read)})`;
			case 9:
				return `(${AVoice.PEHelper(read)}**${AVoice.PEHelper(read)})`;
			case 10:
				return `(${AVoice.PEHelper(read)}%${AVoice.PEHelper(read)})`;
			case 11:
				return `Math.abs(${AVoice.PEHelper(read)})`;
			case 12:
				return `Math.round(${AVoice.PEHelper(read)})`;
			case 13:
				return `Math.cos(${AVoice.PEHelper(read)})`;
			default:
				throw new Error("unexpected case found!");
		}
	}
}

export { AVoice };
