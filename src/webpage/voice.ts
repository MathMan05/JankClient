import { Channel } from "./channel.js";
import { sdpback, webRTCSocket } from "./jsontypes.js";

class Voice{
	owner:Channel;
	static url?:string;
	static gotUrl:()=>void;
	static geturl=new Promise<void>(res=>{this.gotUrl=res})
	private pstatus:string="not connected";
	public onSatusChange:(e:string)=>unknown=()=>{};
	set status(e:string){
		this.pstatus=e;
		this.onSatusChange(e);
	}
	get status(){
		return this.pstatus;
	}
	get channel(){
		return this.owner;
	}
    get guild(){
		return this.owner.owner;
	}
	get localuser(){
		return this.owner.localuser;
	}
	get info(){
		return this.owner.info;
	}
	constructor(owner:Channel){
		this.owner=owner;
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
				case 6:
					this.time=json.d.t;
					setTimeout(this.sendAlive.bind(this), this.timeout);
					break;
				case 8:
					this.timeout=json.d.heartbeat_interval;
					setTimeout(this.sendAlive.bind(this), 1000);
					break;
				case 12:
					this.users.set(json.d.audio_ssrc,json.d.user_id);
					break


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
		let cline:string|undefined;
		console.log(sdp);
		for(const line of sdp.split("\n")){
			if(line.startsWith("c=")){
				cline=line;
				break;
			}
		}
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
			let mode="inactive";
			for(const thing of this.senders){
				if(thing.mid===bundles[i]){
					mode="sendonly";
				}
			}
			if(grouping.media==="audio"){
			build+=
`
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
build+=
`
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
		console.log(build);
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
					for(const thing of (await sender.sender.getStats())){
						if(thing[1].ssrc){
							this.ssrcMap.set(sender,thing[1].ssrc);
							this.makeOp12(sender)
						}
					}
				}
				console.log(this.ssrcMap);
			});
		}
	}
	async makeOp12(sender:RTCRtpTransceiver){
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
	senders:Set<RTCRtpTransceiver>=new Set();
	ssrcMap:Map<RTCRtpTransceiver,string>=new Map();
	async continueWebRTC(data:sdpback){
		if(this.pc&&this.offer){
			const pc=this.pc;
			this.negotationneeded();
			this.status="Starting Audio streams";
			const audioStream = await navigator.mediaDevices.getUserMedia({video: false, audio: true} );
			for (const track of audioStream.getTracks()){
				//Add track
				const sender = pc.addTransceiver(track,{
					direction:"sendonly",
					streams:[audioStream],
					sendEncodings:[{active:true,maxBitrate:this.channel.bitrate}]
				});
				this.channel
				this.senders.add(sender);
				console.log(sender)
			}
			this.counter=data.d.sdp;
			pc.ontrack = ({ streams: [stream] }) => {
				console.log("got audio stream", stream);
				const audio = new Audio();
				audio.srcObject = stream;
				audio.play()
			};

		}else{
			this.status="Connection failed";
		}
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
	async join(){
		console.warn("Joining");
		this.status="waiting for main WS";
		const json = await this.localuser.joinVoice(this);
		if(!json) {
			this.status="bad responce from WS";
			return;
		};
		if(!Voice.url){
			this.status="waiting for Voice URL";
			await Voice.geturl;
		}
		if(this.localuser.currentVoice!==this){this.status="closed";return}
		const ws=new WebSocket("ws://"+Voice.url as string);
		this.ws=ws;
		this.status="waiting for WS to open";
		ws.addEventListener("message",(m)=>{
			this.packet(m);
		})
		await new Promise<void>(res=>{
			ws.addEventListener("open",()=>{
				res()
			})
		});
		this.status="waiting for WS to authorize";
		ws.send(JSON.stringify({
			"op": 0,
			"d": {
				server_id: this.guild.id,
				user_id: json.d.user_id,
				session_id: json.d.session_id,
				token: json.d.token,
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
		/*
			const pc=new RTCPeerConnection();
			this.pc=pc;
			//pc.setRemoteDescription({sdp:json.d.token,type:""})
		*/
	}
}
export {Voice};
