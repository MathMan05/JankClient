import{ getBulkInfo }from"./login.js";

class AVoice{
	audioCtx: AudioContext;
	info: { wave: string | Function; freq: number };
	playing: boolean;
	myArrayBuffer: AudioBuffer;
	gainNode: GainNode;
	buffer: Float32Array;
	source: AudioBufferSourceNode;
	constructor(wave: string | Function, freq: number, volume = 1){
		this.audioCtx = new window.AudioContext();
		this.info = { wave, freq };
		this.playing = false;
		this.myArrayBuffer = this.audioCtx.createBuffer(
			1,
			this.audioCtx.sampleRate,
			this.audioCtx.sampleRate
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
	get wave(): string | Function{
		return this.info.wave;
	}
	get freq(): number{
		return this.info.freq;
	}
	set wave(wave: string | Function){
		this.info.wave = wave;
		this.updateWave();
	}
	set freq(freq: number){
		this.info.freq = freq;
		this.updateWave();
	}
	updateWave(): void{
		const func = this.waveFunction();
		for(let i = 0; i < this.buffer.length; i++){
			this.buffer[i] = func(i / this.audioCtx.sampleRate, this.freq);
		}
	}
	waveFunction(): Function{
		if(typeof this.wave === "function"){
			return this.wave;
		}
		switch(this.wave){
		case"sin":
			return(t: number, freq: number)=>{
				return Math.sin(t * Math.PI * 2 * freq);
			};
		case"triangle":
			return(t: number, freq: number)=>{
				return Math.abs(((4 * t * freq) % 4) - 2) - 1;
			};
		case"sawtooth":
			return(t: number, freq: number)=>{
				return((t * freq) % 1) * 2 - 1;
			};
		case"square":
			return(t: number, freq: number)=>{
				return(t * freq) % 2 < 1 ? 1 : -1;
			};
		case"white":
			return(_t: number, _freq: number)=>{
				return Math.random() * 2 - 1;
			};
		case"noise":
			return(_t: number, _freq: number)=>{
				return 0;
			};
		}
		return new Function();
	}
	play(): void{
		if(this.playing){
			return;
		}
		this.source.connect(this.gainNode);
		this.playing = true;
	}
	stop(): void{
		if(this.playing){
			this.source.disconnect();
			this.playing = false;
		}
	}
	static noises(noise: string): void{
		switch(noise){
		case"three": {
			const voicy = new AVoice("sin", 800);
			voicy.play();
			setTimeout(_=>{
				voicy.freq = 1000;
			}, 50);
			setTimeout(_=>{
				voicy.freq = 1300;
			}, 100);
			setTimeout(_=>{
				voicy.stop();
			}, 150);
			break;
		}
		case"zip": {
			const voicy = new AVoice((t: number, freq: number)=>{
				return Math.sin((t + 2) ** Math.cos(t * 4) * Math.PI * 2 * freq);
			}, 700);
			voicy.play();
			setTimeout(_=>{
				voicy.stop();
			}, 150);
			break;
		}
		case"square": {
			const voicy = new AVoice("square", 600, 0.4);
			voicy.play();
			setTimeout(_=>{
				voicy.freq = 800;
			}, 50);
			setTimeout(_=>{
				voicy.freq = 1000;
			}, 100);
			setTimeout(_=>{
				voicy.stop();
			}, 150);
			break;
		}
		case"beep": {
			const voicy = new AVoice("sin", 800);
			voicy.play();
			setTimeout(_=>{
				voicy.stop();
			}, 50);
			setTimeout(_=>{
				voicy.play();
			}, 100);
			setTimeout(_=>{
				voicy.stop();
			}, 150);
			break;
		}
		case "join":{
			const voicy = new AVoice("triangle", 600,.1);
			voicy.play();
			setTimeout(_=>{
				voicy.freq=800;
			}, 75);
			setTimeout(_=>{
				voicy.freq=1000;
			}, 150);
			setTimeout(_=>{
				voicy.stop();
			}, 200);
			break;
		}
		case "leave":{
			const voicy = new AVoice("triangle", 850,.5);
			voicy.play();
			setTimeout(_=>{
				voicy.freq=700;
			}, 100);
			setTimeout(_=>{
				voicy.stop();
				voicy.freq=400;
			}, 180);
			setTimeout(_=>{
				voicy.play();
			}, 200);
			setTimeout(_=>{
				voicy.stop();
			}, 250);
			break;
		}
		}
	}
	static get sounds(){
		return["three", "zip", "square", "beep"];
	}
	static setNotificationSound(sound: string){
		const userinfos = getBulkInfo();
		userinfos.preferences.notisound = sound;
		localStorage.setItem("userinfos", JSON.stringify(userinfos));
	}
	static getNotificationSound(){
		const userinfos = getBulkInfo();
		return userinfos.preferences.notisound;
	}
}
export{ AVoice as AVoice };
