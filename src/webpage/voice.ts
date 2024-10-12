import { memberjson, sdpback, voiceserverupdate, voiceupdate, webRTCSocket } from "./jsontypes.js";

class VoiceFactory{
	settings:{id:string};
	constructor(usersettings:VoiceFactory["settings"]){
		this.settings=usersettings;
	}
	voices=new Map<string,Map<string,Voice>>();
	voiceChannels=new Map<string,Voice>();
	currentVoice?:Voice;
	guildUrlMap=new Map<string,{url?:string,geturl:Promise<void>,gotUrl:()=>void}>();
	makeVoice(guildid:string,channelId:string,settings:Voice["settings"]){
		let guild=this.voices.get(guildid);
		if(!guild){
			this.setUpGuild(guildid);
			guild=new Map();
			this.voices.set(guildid,guild);
		}
		const urlobj=this.guildUrlMap.get(guildid);
		if(!urlobj) throw new Error("url Object doesn't exist (InternalError)");
		const voice=new Voice(this.settings.id,settings,urlobj);
		this.voiceChannels.set(channelId,voice);
		guild.set(channelId,voice);
		return voice;
	}
	onJoin=(_voice:Voice)=>{};
	onLeave=(_voice:Voice)=>{};
	joinVoice(channelId:string,guildId:string){
		if(this.currentVoice){
			this.currentVoice.leave();
		}
		const voice=this.voiceChannels.get(channelId);
		if(!voice) throw new Error(`Voice ${channelId} does not exist`);
		voice.join();
		this.currentVoice=voice;
		this.onJoin(voice);
		return {
			d:{
				guild_id: guildId,
				channel_id: channelId,
				self_mute: true,//todo
				self_deaf: false,//todo
				self_video: false,//What is this? I have some guesses
				flags: 2//?????
			},
			op:4
		}
	}
	userMap=new Map<string,Voice>();
	voiceStateUpdate(update:voiceupdate){

		const prev=this.userMap.get(update.d.user_id);
		console.log(prev,this.userMap);
		if(prev){
			prev.disconnect(update.d.user_id);
			this.onLeave(prev);
		}
		const voice=this.voiceChannels.get(update.d.channel_id);
		if(voice){
			this.userMap.set(update.d.user_id,voice);
			voice.voiceupdate(update);
		}
	}
	private setUpGuild(id:string){
		const obj:{url?:string,geturl?:Promise<void>,gotUrl?:()=>void}={};
		obj.geturl=new Promise<void>(res=>{obj.gotUrl=res});
		this.guildUrlMap.set(id,obj as {geturl:Promise<void>,gotUrl:()=>void});
	}
	voiceServerUpdate(update:voiceserverupdate){
		const obj=this.guildUrlMap.get(update.d.guild_id);
		if(!obj) return;
		obj.url=update.d.endpoint;
		obj.gotUrl();
	}
}

class Voice{
	private pstatus:string="not connected";
	public onSatusChange:(e:string)=>unknown=()=>{};
	set status(e:string){
		this.pstatus=e;
		this.onSatusChange(e);
	}
	get status(){
		return this.pstatus;
	}
	readonly userid:string;
	settings:{bitrate:number};
	urlobj:{url?:string,geturl:Promise<void>,gotUrl:()=>void};
	constructor(userid:string,settings:Voice["settings"],urlobj:Voice["urlobj"]){
		this.userid=userid;
		this.settings=settings;
		this.urlobj=urlobj;
	}
	pc?:RTCPeerConnection;
	ws?:WebSocket;
	timeout:number=30000;
	interval:NodeJS.Timeout=0 as unknown as NodeJS.Timeout;
	time:number=0;
	seq:number=0;
	sendAlive(){
		if(this.ws){
			this.ws.send(JSON.stringify({ op: 3,d:10}));
		}
	}
	readonly users= new Map<number,string>();
	readonly speakingMap= new Map<string,number>();
	onSpeakingChange=(_userid:string,_speaking:number)=>{};
	disconnect(userid:string){
		console.warn(userid);
		if(userid===this.userid){
			this.leave();
		}
		const ssrc=this.speakingMap.get(userid);

		if(ssrc){
			this.users.delete(ssrc);
			for(const thing of this.ssrcMap){
				if(thing[1]===ssrc){
					this.ssrcMap.delete(thing[0]);
				}
			}
		}
		this.speakingMap.delete(userid);
		this.userids.delete(userid);
		console.log(this.userids,userid);
		//there's more for sure, but this is "good enough" for now
		this.onMemberChange(userid,false);
	}
	packet(message:MessageEvent){
		const data=message.data
		if(typeof data === "string"){
			const json:webRTCSocket = JSON.parse(data);
			switch(json.op){
				case 2:
					this.startWebRTC();
					break;
				case 4:
					this.continueWebRTC(json);
					break;
				case 5:
					this.speakingMap.set(json.d.user_id,json.d.speaking);
					this.onSpeakingChange(json.d.user_id,json.d.speaking);
					break;
				case 6:
					this.time=json.d.t;
					setTimeout(this.sendAlive.bind(this), this.timeout);
					break;
				case 8:
					this.timeout=json.d.heartbeat_interval;
					setTimeout(this.sendAlive.bind(this), 1000);
					break;
				case 12:
					this.figureRecivers();
					if(!this.users.has(json.d.audio_ssrc)){
						console.log("redo 12!");
						this.makeOp12();
					}
					this.users.set(json.d.audio_ssrc,json.d.user_id);
					break;
			}
		}
	}
	offer?:string;
	cleanServerSDP(sdp:string):string{
		const pc=this.pc;
		if(!pc) throw new Error("pc isn't defined")
		const ld=pc.localDescription;
		if(!ld) throw new Error("localDescription isn't defined");
		const parsed = Voice.parsesdp(ld.sdp);
		const group=parsed.atr.get("group");
		if(!group) throw new Error("group isn't in sdp");
		const [_,...bundles]=(group.entries().next().value as [string, string])[0].split(" ");
		bundles[bundles.length-1]=bundles[bundles.length-1].replace("\r","");
		console.log(bundles);

		if(!this.offer) throw new Error("Offer is missing :P");
		let cline=sdp.split("\n").find(line=>line.startsWith("c="));
		if(!cline) throw new Error("c line wasn't found");
		const parsed1=Voice.parsesdp(sdp).medias[0];
		//const parsed2=Voice.parsesdp(this.offer);
		const rtcport=(parsed1.atr.get("rtcp") as Set<string>).values().next().value as string;
		const ICE_UFRAG=(parsed1.atr.get("ice-ufrag") as Set<string>).values().next().value as string;
		const ICE_PWD=(parsed1.atr.get("ice-pwd") as Set<string>).values().next().value as string;
		const FINGERPRINT=(parsed1.atr.get("fingerprint") as Set<string>).values().next().value as string;
		const candidate=(parsed1.atr.get("candidate") as Set<string>).values().next().value as string;
		let build=`v=0\r
o=- 1420070400000 0 IN IP4 127.0.0.1\r
s=-\r
t=0 0\r
a=msid-semantic: WMS *\r
a=group:BUNDLE ${bundles.join(" ")}\r`
		let i=0;
		for(const grouping of parsed.medias){
			let mode="recvonly";
			for(const _ of this.senders){
				if(i<2){
					mode="sendrecv";
				}
			}
			if(grouping.media==="audio"){
				build+=`
m=audio ${parsed1.port} UDP/TLS/RTP/SAVPF 111\r
${cline}\r
a=rtpmap:111 opus/48000/2\r
a=fmtp:111 minptime=10;useinbandfec=1;usedtx=1\r
a=rtcp:${rtcport}\r
a=rtcp-fb:111 transport-cc\r
a=extmap:1 urn:ietf:params:rtp-hdrext:ssrc-audio-level\r
a=extmap:3 http://www.ietf.org/id/draft-holmer-rmcat-transport-wide-cc-extensions-01/r/n
a=setup:passive\r
a=mid:${bundles[i]}\r
a=maxptime:60\r
a=${mode}\r
a=ice-ufrag:${ICE_UFRAG}\r
a=ice-pwd:${ICE_PWD}\r
a=fingerprint:${FINGERPRINT}\r
a=candidate:${candidate}\r
a=rtcp-mux\r`
			}else{
				build+=`
m=video ${rtcport} UDP/TLS/RTP/SAVPF 102 103\r
${cline}\r
a=rtpmap:102 H264/90000\r
a=rtpmap:103 rtx/90000\r
a=fmtp:102 x-google-max-bitrate=2500;level-asymmetry-allowed=1;packetization-mode=1;profile-level-id=42e01f\r
a=fmtp:103 apt=102\r
a=rtcp:${rtcport}\r
a=rtcp-fb:102 ccm fir\r
a=rtcp-fb:102 nack\r
a=rtcp-fb:102 nack pli\r
a=rtcp-fb:102 goog-remb\r
a=rtcp-fb:102 transport-cc\r
a=extmap:2 http://www.webrtc.org/experiments/rtp-hdrext/abs-send-time/r/n
a=extmap:3 http://www.ietf.org/id/draft-holmer-rmcat-transport-wide-cc-extensions-01/r/n
a=extmap:14 urn:ietf:params:rtp-hdrext:toffset\r
a=extmap:13 urn:3gpp:video-orientation\r
a=extmap:5 http://www.webrtc.org/experiments/rtp-hdrext/playout-delay/r/na=setup:passive/r/n
a=mid:${bundles[i]}\r
a=${mode}\r
a=ice-ufrag:${ICE_UFRAG}\r
a=ice-pwd:${ICE_PWD}\r
a=fingerprint:${FINGERPRINT}\r
a=candidate:${candidate}\r
a=rtcp-mux\r`;
			}
		i++
		}
		build+="\n";
		return build;
	}
	counter?:string;
	negotationneeded(){
		if(this.pc&&this.offer){
			const pc=this.pc;
			pc.addEventListener("negotiationneeded", async ()=>{
				this.offer=(await pc.createOffer({
					offerToReceiveAudio: true,
					offerToReceiveVideo: true
				})).sdp;
				await pc.setLocalDescription({sdp:this.offer});

				if(!this.counter) throw new Error("counter isn't defined");
				const counter=this.counter;
				const remote:{sdp:string,type:RTCSdpType}={sdp:this.cleanServerSDP(counter),type:"answer"};
				console.log(remote);
				await pc.setRemoteDescription(remote);
				const senders=this.senders.difference(this.ssrcMap);
				for(const sender of senders){
					for(const thing of (await sender.getStats() as Map<string, any>)){
						if(thing[1].ssrc){
							this.ssrcMap.set(sender,thing[1].ssrc);
							this.makeOp12(sender);
						}
					}
				}
				console.log(this.ssrcMap);
			});
		}
	}
	async makeOp12(sender:RTCRtpSender|undefined|[RTCRtpSender,number]=(this.ssrcMap.entries().next().value)){
		if(!sender) throw new Error("sender doesn't exist");
		if(sender instanceof Array){
			sender=sender[0];
		}
		if(this.ws){
			this.ws.send(JSON.stringify({
				op: 12,
				d: {
					audio_ssrc: this.ssrcMap.get(sender),
					video_ssrc: 0,
					rtx_ssrc: 0,
					streams: [
						{
							type: "video",
							rid: "100",
							ssrc: 0,//TODO
							active: false,
							quality: 100,
							rtx_ssrc: 0,//TODO
							max_bitrate: 2500000,//TODO
							max_framerate: 0,//TODO
							max_resolution: {
								type: "fixed",
								width: 0,//TODO
								height: 0//TODO
							}
						}
					]
				}
			}));
			this.status="Sending audio streams";
		}
	}
	senders:Set<RTCRtpSender>=new Set();
	recivers=new Set<RTCRtpReceiver>();
	ssrcMap:Map<RTCRtpSender,number>=new Map();
	speaking=false;
	async setupMic(audioStream:MediaStream){
		const audioContext = new AudioContext();
		const analyser = audioContext.createAnalyser();
		const microphone = audioContext.createMediaStreamSource(audioStream);

		analyser.smoothingTimeConstant = 0;
		analyser.fftSize = 32;

		microphone.connect(analyser);
		const array=new Float32Array(1);
		const interval=setInterval(()=>{
			if(!this.ws){
				clearInterval(interval);
			}
			analyser.getFloatFrequencyData(array);
			const value=array[0]+65;
			if(value<0){
				if(this.speaking){
					this.speaking=false;
					this.sendSpeaking();
					console.log("not speaking")
				}
			}else if(!this.speaking){
				console.log("speaking");
				this.speaking=true;
				this.sendSpeaking();
			}
		},500);
	}
	async sendSpeaking(){
		if(!this.ws) return;
		const pair=this.ssrcMap.entries().next().value;
		if(!pair) return
		this.ws.send(JSON.stringify({
			op:5,
			d:{
				speaking:+this.speaking,
				delay:5,//not sure
				ssrc:pair[1]
			}
		}))
	}
	async continueWebRTC(data:sdpback){
		if(this.pc&&this.offer){
			const pc=this.pc;
			this.negotationneeded();
			this.status="Starting Audio streams";
			const audioStream = await navigator.mediaDevices.getUserMedia({video: false, audio: true} );
			for (const track of audioStream.getAudioTracks()){
				//Add track

				this.setupMic(audioStream);
				const sender = pc.addTrack(track);
				this.senders.add(sender);
				console.log(sender)
			}
			for(let i=0;i<10;i++){
				pc.addTransceiver("audio",{
					direction:"recvonly",
					streams:[],
					sendEncodings:[{active:true,maxBitrate:this.settings.bitrate}]
				});
			}
			for(let i=0;i<10;i++){
				pc.addTransceiver("video",{
					direction:"recvonly",
					streams:[],
					sendEncodings:[{active:true,maxBitrate:this.settings.bitrate}]
				});
			}
			this.counter=data.d.sdp;
			pc.ontrack = async (e) => {
				this.status="Done";
				if(e.track.kind==="video"){
					return;
				}

				const media=e.streams[0];
				console.log("got audio:",e);
				for(const track of media.getTracks()){
					console.log(track);
				}

				const context= new AudioContext();
				await context.resume();
				const ss=context.createMediaStreamSource(media);
				console.log(media);
				ss.connect(context.destination);
				new Audio().srcObject = media;//weird I know, but it's for chromium/webkit bug
				this.recivers.add(e.receiver)
			};

		}else{
			this.status="Connection failed";
		}
	}
	reciverMap=new Map<number,RTCRtpReceiver>()
	async figureRecivers(){
		await new Promise(res=>setTimeout(res,500));
		for(const reciver of this.recivers){
			const stats=await reciver.getStats() as Map<string,any>;
			for(const thing of (stats)){
				if(thing[1].ssrc){
					this.reciverMap.set(thing[1].ssrc,reciver)
				}
			}
		}
		console.log(this.reciverMap);
	}
	async startWebRTC(){
		this.status="Making offer";
		const pc = new RTCPeerConnection();
		this.pc=pc;
		const offer = await pc.createOffer({
			offerToReceiveAudio: true,
			offerToReceiveVideo: true
		});
		this.status="Starting RTC connection";
		const sdp=offer.sdp;
		this.offer=sdp;

		if(!sdp){
			this.status="No SDP";
			this.ws?.close();
			return;
		}
		const parsed=Voice.parsesdp(sdp);
		const video=new Map<string,[number,number]>();
		const audio=new Map<string,number>();
		let cur:[number,number]|undefined;
		let i=0;
		for(const thing of parsed.medias){
			try{
				if(thing.media==="video"){
					const rtpmap=thing.atr.get("rtpmap");
					if(!rtpmap) continue;
					for(const codecpair of rtpmap){

						const [port, codec]=codecpair.split(" ");
						if(cur&&codec.split("/")[0]==="rtx"){
							cur[1]=Number(port);
							cur=undefined;
							continue
						}
						if(video.has(codec.split("/")[0])) continue;
						cur=[Number(port),-1];
						video.set(codec.split("/")[0],cur);
					}
				}else if(thing.media==="audio"){
					const rtpmap=thing.atr.get("rtpmap");
					if(!rtpmap) continue;
					for(const codecpair of rtpmap){
						const [port, codec]=codecpair.split(" ");
						if(audio.has(codec.split("/")[0])) { continue};
						audio.set(codec.split("/")[0],Number(port));
					}
				}
			}finally{
				i++;
			}
		}

		const codecs:{
			name: string,
			type: "video"|"audio",
			priority: number,
			payload_type: number,
			rtx_payload_type: number|null
		}[]=[];
		const include=new Set<string>();
		const audioAlloweds=new Map([["opus",{priority:1000,}]]);
		for(const thing of audio){
			if(audioAlloweds.has(thing[0])){
				include.add(thing[0]);
				codecs.push({
					name:thing[0],
					type:"audio",
					priority:audioAlloweds.get(thing[0])?.priority as number,
					payload_type:thing[1],
					rtx_payload_type:null
				});
			}
		}
		const videoAlloweds=new Map([["H264",{priority:1000}],["VP8",{priority:2000}],["VP9",{priority:3000}]]);
		for(const thing of video){
			if(videoAlloweds.has(thing[0])){
				include.add(thing[0]);
				codecs.push({
					name:thing[0],
					type:"video",
					priority:videoAlloweds.get(thing[0])?.priority as number,
					payload_type:thing[1][0],
					rtx_payload_type:thing[1][1]
				});
			}
		}
		let sendsdp="a=extmap-allow-mixed";
		let first=true;
		for(const media of parsed.medias){

			for(const thing of first?["ice-ufrag","ice-pwd","ice-options","fingerprint","extmap","rtpmap"]:["extmap","rtpmap"]){
				const thing2=media.atr.get(thing);
				if(!thing2) continue;
				for(const thing3 of thing2){
					if(thing === "rtpmap"){
						const name=thing3.split(" ")[1].split("/")[0];
						if(include.has(name)){
							include.delete(name);
						}else{
							continue;
						}
					}
					sendsdp+=`\na=${thing}:${thing3}`;
				}
			}
			first=false;
		}
		if(this.ws){
			this.ws.send(JSON.stringify({
				d:{
					codecs,
					protocol:"webrtc",
					data:sendsdp,
					sdp:sendsdp
				},
				op:1
			}));
		}
	}
	static parsesdp(sdp:string){
		let currentA=new Map<string,Set<string>>();
		const out:{version?:number,medias:{media:string,port:number,proto:string,ports:number[],atr:Map<string,Set<string>>}[],atr:Map<string,Set<string>>}={medias:[],atr:currentA};
		for(const line of sdp.split("\n")){
			const [code,setinfo]=line.split("=");
			switch(code){
				case "v":
					out.version=Number(setinfo);
					break;
				case "o":
				case "s":
				case "t":
					break;
				case "m":
					currentA=new Map();
					const [media,port,proto,...ports]=setinfo.split(" ");
					const portnums=ports.map(Number);
					out.medias.push({media,port:Number(port),proto,ports:portnums,atr:currentA});
					break;
				case "a":
					const [key, ...value] = setinfo.split(":");
					if(!currentA.has(key)){
						currentA.set(key,new Set());
					}
					currentA.get(key)?.add(value.join(":"));
					break;
			}
		}
		return out;
	}
	open=false;
	async join(){
		console.warn("Joining");
		this.open=true
		this.status="waiting for main WS";
	}
	onMemberChange=(_member:memberjson|string,_joined:boolean)=>{};
	userids=new Map<string,{}>();
	async voiceupdate(update:voiceupdate){
		console.log("Update!");
		this.userids.set(update.d.member.id,{deaf:update.d.deaf,muted:update.d.mute});
		this.onMemberChange(update.d.member,true);
		if(update.d.member.id===this.userid&&this.open){
			if(!update) {
				this.status="bad responce from WS";
				return;
			};
			if(!this.urlobj.url){
				this.status="waiting for Voice URL";
				await this.urlobj.geturl;
				if(!this.open){this.leave();return}
			}

			const ws=new WebSocket("ws://"+this.urlobj.url as string);
			this.ws=ws;
			ws.onclose=()=>{
				this.leave();
			}
			this.status="waiting for WS to open";
			ws.addEventListener("message",(m)=>{
				this.packet(m);
			})
			await new Promise<void>(res=>{
				ws.addEventListener("open",()=>{
					res()
				})
			});
			if(!this.ws){
				this.leave();
				return;
			}
			this.status="waiting for WS to authorize";
			ws.send(JSON.stringify({
				"op": 0,
				"d": {
					server_id: update.d.guild_id,
					user_id: update.d.user_id,
					session_id: update.d.session_id,
					token: update.d.token,
					video: false,
					"streams": [
						{
							type: "video",
							rid: "100",
							quality: 100
						}
					]
				}
			}));
		}
	}
	async leave(){
		this.open=false;
		this.status="Left voice chat";
		if(this.ws){
			this.ws.close();
			this.ws=undefined;
		}
		if(this.pc){
			this.pc.close();
			this.pc=undefined;
		}
	}
}
export {Voice,VoiceFactory};
