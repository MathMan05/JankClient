class voice{
    constructor(wave,freq){
        this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        this.info={wave:wave,freq:freq}
        this.playing=false;
        this.myArrayBuffer=this.audioCtx.createBuffer(
            1,
            this.audioCtx.sampleRate,
            this.audioCtx.sampleRate,
        );
        this.buffer=this.myArrayBuffer.getChannelData(0);
        this.source = this.audioCtx.createBufferSource();
        this.source.buffer = this.myArrayBuffer;
        this.source.loop=true;
        this.source.start();
        this.updateWave(freq);
    }
    get wave(){
        return this.info.wave;
    }
    get freq(){
        return this.info.freq;
    }
    set wave(wave){
        this.info.wave=wave;
        this.updateWave()
    }
    set freq(freq){
        this.info.freq=freq;
        this.updateWave()
    }
    updateWave(){
        const func=this.waveFucnion();
        for (let i = 0; i < this.buffer.length; i++) {
            this.buffer[i]=func(i/this.audioCtx.sampleRate,this.freq);
        }

    }
    waveFucnion(){
        switch(this.wave){
            case "sin":
                return (t,freq)=>{
                    return Math.sin(t*Math.PI*2*freq);
                }
            case "triangle":
                return (t,freq)=>{
                    return Math.abs((4*t*freq)%4-2)-1;
                }
            case "sawtooth":
                return (t,freq)=>{
                    return ((t*freq)%1)*2-1;
                }
            case "square":
                return (t,freq)=>{
                    return (t*freq)%2<1?1:-1;
                }
            case "white":
                return (t,freq)=>{
                    return Math.random()*2-1;
                }
            case "noise":
                return (t,freq)=>{
                    return 0;
                }
        }
    }
    play(){
        if(this.playing){
            return;
        }
        this.source.connect(this.audioCtx.destination);
        this.playing=true;

    }
    stop(){
        if(this.playing){
            this.source.disconnect();
            this.playing=false;
        }
    }
}
const audio=new voice("triangle",101);
//audio.play();
