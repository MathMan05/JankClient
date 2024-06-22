class voice{
    constructor(wave,freq,volume=1){
        this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        this.info={wave:wave,freq:freq}
        this.playing=false;
        this.myArrayBuffer=this.audioCtx.createBuffer(
            1,
            this.audioCtx.sampleRate,
            this.audioCtx.sampleRate,
        );
        this.gainNode = this.audioCtx.createGain();
        this.gainNode.gain.value=volume;
        this.gainNode.connect(this.audioCtx.destination);
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
        if(typeof this.wave === 'function'){
            return this.wave;
        }
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
        this.source.connect(this.gainNode);
        this.playing=true;

    }
    stop(){
        if(this.playing){
            this.source.disconnect();
            this.playing=false;
        }
    }
    static noises(noise){
        switch(noise){
            case "three":{
                    const voicy=new voice("sin",800);
                    voicy.play();
                    setTimeout(_=>{voicy.freq=1000},50);
                    setTimeout(_=>{voicy.freq=1300},100);
                    setTimeout(_=>{voicy.stop()},150);
                    break;
                }
            case "zip":{
                    const voicy=new voice((t,freq)=>{
                    return Math.sin(((t+2)**(Math.cos(t*4)))*Math.PI*2*freq);
                    },700);
                    voicy.play();
                    setTimeout(_=>{voicy.stop()},150);
                    break;
                }
            case "square":{
                    const voicy=new voice("square",600,.4);
                    voicy.play()
                    setTimeout(_=>{voicy.freq=800},50);
                    setTimeout(_=>{voicy.freq=1000},100);
                    setTimeout(_=>{voicy.stop()},150);
                    break;
                }
            case "beep":{
                const voicy=new voice("sin",800);
                voicy.play();
                setTimeout(_=>{voicy.stop()},50);
                setTimeout(_=>{voicy.play();},100);
                setTimeout(_=>{voicy.stop()},150);
                break;
            }
        }
    }
    static get sounds(){
        return ["three","zip","square","beep"];
    }
    static setNotificationSound(sound){
        let userinfos=getBulkInfo();
        userinfos.preferances.notisound=sound;
        localStorage.setItem("userinfos",JSON.stringify(userinfos));
    }
    static getNotificationSound(){
        let userinfos=getBulkInfo();
        return userinfos.preferances.notisound;
    }
}
