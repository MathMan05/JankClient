import {
	memberjson,
	sdpback,
	streamCreate,
	streamServerUpdate,
	voiceserverupdate,
	voiceStatus,
	webRTCSocket,
} from "./jsontypes.js";
class VoiceFactory {
	settings: {id: string};
	handleGateway: (obj: Object) => void;
	constructor(
		usersettings: VoiceFactory["settings"],
		handleGateway: VoiceFactory["handleGateway"],
	) {
		this.settings = usersettings;
		this.handleGateway = handleGateway;
	}
	voices = new Map<string, Map<string, Voice>>();
	voiceChannels = new Map<string, Voice>();
	currentVoice?: Voice;
	guildUrlMap = new Map<
		string,
		{url?: string; token?: string; geturl: Promise<void>; gotUrl: () => void}
	>();
	makeVoice(guildid: string, channelId: string, settings: Voice["settings"]) {
		let guild = this.voices.get(guildid);
		if (!guild) {
			this.setUpGuild(guildid);
			guild = new Map();
			this.voices.set(guildid, guild);
		}
		const urlobj = this.guildUrlMap.get(guildid);
		if (!urlobj) throw new Error("url Object doesn't exist (InternalError)");
		const voice = new Voice(this.settings.id, settings, urlobj, this);
		this.voiceChannels.set(channelId, voice);
		guild.set(channelId, voice);
		return voice;
	}
	onJoin = (_voice: Voice) => {};
	onLeave = (_voice: Voice) => {};
	private imute = false;
	video = false;
	stream = false;
	get mute() {
		return this.imute;
	}
	set mute(s) {
		const changed = this.imute !== s;
		this.imute = s;
		if (this.currentVoice && changed) {
			this.currentVoice.updateMute();
			this.updateSelf();
		}
	}
	disconect() {
		if (!this.curChan) return;
		this.curChan = null;
		this.curGuild = null;
		this.handleGateway({
			op: 4,
			d: {
				guild_id: this.curGuild,
				channel_id: this.curChan,
				self_mute: this.imute,
				self_deaf: false,
				self_video: false,
				flags: 3,
			},
		});
	}
	updateSelf() {
		if (this.currentVoice && this.currentVoice.open) {
			this.handleGateway({
				op: 4,
				d: {
					guild_id: this.curGuild,
					channel_id: this.curChan,
					self_mute: this.imute,
					self_deaf: false,
					self_video: this.video,
					flags: 3,
				},
			});
		}
	}
	curGuild: string | null = null;
	curChan: string | null = null;
	joinVoice(channelId: string, guildId: string, self_mute = false) {
		const voice = this.voiceChannels.get(channelId);
		this.mute = self_mute;
		if (this.currentVoice && this.currentVoice.ws) {
			this.currentVoice.leave();
		}
		this.curChan = channelId;
		this.curGuild = guildId;
		if (!voice) throw new Error(`Voice ${channelId} does not exist`);
		voice.join();
		this.currentVoice = voice;
		this.onJoin(voice);
		return {
			d: {
				guild_id: guildId,
				channel_id: channelId,
				self_mute,
				self_deaf: false, //todo
				self_video: false,
				flags: 2, //?????
			},
			op: 4,
		};
	}
	live = new Map<string, (res: Voice) => void>();
	steamTokens = new Map<string, Promise<[string, string]>>();
	steamTokensRes = new Map<string, (res: [string, string]) => void>();
	async joinLive(userid: string) {
		const stream_key = `${this.curGuild === "@me" ? "call" : `guild:${this.curGuild}`}:${this.curChan}:${userid}`;
		this.handleGateway({
			op: 20,
			d: {
				stream_key,
			},
		});
		return new Promise<Voice>(async (res) => {
			this.live.set(stream_key, res);
			this.steamTokens.set(
				stream_key,
				new Promise<[string, string]>((res) => {
					this.steamTokensRes.set(stream_key, res);
				}),
			);
		});
	}
	islive = false;
	liveStream?: MediaStream;
	async createLive(userid: string, stream: MediaStream) {
		this.islive = true;
		this.liveStream = stream;
		const stream_key = `${this.curGuild === "@me" ? "call" : `guild:${this.curGuild}`}:${this.curChan}:${userid}`;
		this.handleGateway({
			op: 18,
			d: {
				type: this.curGuild === "@me" ? "call" : "guild",
				guild_id: this.curGuild === "@me" ? null : this.curGuild,
				channel_id: this.curChan,
				preferred_region: null,
			},
		});
		return new Promise<Voice>(async (res) => {
			this.live.set(stream_key, res);
			this.steamTokens.set(
				stream_key,
				new Promise<[string, string]>((res) => {
					this.steamTokensRes.set(stream_key, res);
				}),
			);
		});
	}
	async streamCreate(create: streamCreate) {
		const prom1 = this.steamTokens.get(create.d.stream_key);
		if (!prom1) throw new Error("oops");
		const [token, endpoint] = await prom1;
		if (create.d.stream_key.startsWith("guild")) {
			const [_, _guild, chan, user] = create.d.stream_key.split(":");
			const voice2 = this.voiceChannels.get(chan);
			if (!voice2 || !voice2.session_id) throw new Error("oops");
			let stream: undefined | MediaStream = undefined;
			console.error(user, this.settings.id);
			if (user === this.settings.id) {
				stream = this.liveStream;
			}
			const voice = new Voice(
				this.settings.id,
				{
					bitrate: 10000,
					stream: true,
					live: stream,
				},
				{
					url: endpoint,
					token,
				},
				this,
			);
			voice.join();
			voice.startWS(voice2.session_id, create.d.rtc_server_id);

			voice2.gotStream(voice, user);
		}
	}
	streamServerUpdate(update: streamServerUpdate) {
		const res = this.steamTokensRes.get(update.d.stream_key);
		if (res) res([update.d.token, update.d.endpoint]);
	}
	userMap = new Map<string, Voice>();
	voiceStateUpdate(update: voiceStatus) {
		const prev = this.userMap.get(update.user_id);
		console.log(prev, this.userMap);
		if (prev && prev !== this.voiceChannels.get(update.channel_id)) {
			prev.disconnect(update.user_id);
			this.onLeave(prev);
		}
		const voice = this.voiceChannels.get(update.channel_id);
		if (voice) {
			this.userMap.set(update.user_id, voice);
			voice.voiceupdate(update);
		}
	}
	private setUpGuild(id: string) {
		const obj: {url?: string; geturl?: Promise<void>; gotUrl?: () => void} = {};
		obj.geturl = new Promise<void>((res) => {
			obj.gotUrl = res;
		});
		this.guildUrlMap.set(id, obj as {geturl: Promise<void>; gotUrl: () => void});
	}
	voiceServerUpdate(update: voiceserverupdate) {
		const obj = this.guildUrlMap.get(update.d.guild_id);
		if (!obj) return;
		obj.url = update.d.endpoint;
		obj.token = update.d.token;
		obj.gotUrl();
	}
}

class Voice {
	private pstatus: string = "not connected";
	public onSatusChange: (e: string) => unknown = () => {};
	set status(e: string) {
		console.log("state changed: " + e);
		this.pstatus = e;
		this.onSatusChange(e);
	}
	get status() {
		return this.pstatus;
	}
	readonly userid: string;
	settings: {bitrate: number; stream?: boolean; live?: MediaStream};
	urlobj: {url?: string; token?: string; geturl?: Promise<void>; gotUrl?: () => void};
	owner: VoiceFactory;
	constructor(
		userid: string,
		settings: Voice["settings"],
		urlobj: Voice["urlobj"],
		owner: VoiceFactory,
	) {
		this.userid = userid;
		this.settings = settings;
		this.urlobj = urlobj;
		this.owner = owner;
	}
	pc?: RTCPeerConnection;
	ws?: WebSocket;
	timeout: number = 30000;
	interval: NodeJS.Timeout = 0 as unknown as NodeJS.Timeout;
	time: number = 0;
	seq: number = 0;
	sendAlive() {
		if (this.ws) {
			this.ws.send(JSON.stringify({op: 3, d: 10}));
		}
	}
	users = new Map<number, string>();
	vidusers = new Map<number, string>();
	readonly speakingMap = new Map<string, number>();
	onSpeakingChange = (_userid: string, _speaking: number) => {};
	disconnect(userid: string) {
		console.warn(userid);
		if (userid === this.userid) {
			this.leave();
		}
		const ssrc = this.speakingMap.get(userid);

		if (ssrc) {
			this.users.set(ssrc, "");
			for (const thing of this.ssrcMap) {
				if (thing[1] === ssrc) {
					this.ssrcMap.delete(thing[0]);
				}
			}
		}
		this.speakingMap.delete(userid);
		this.userids.delete(userid);
		console.log(this.userids, userid);
		//there's more for sure, but this is "good enough" for now
		this.onMemberChange(userid, false);
	}

	async packet(message: MessageEvent) {
		const data = message.data;
		if (typeof data === "string") {
			const json: webRTCSocket = JSON.parse(data);
			switch (json.op) {
				case 2:
					this.startWebRTC();
					break;
				case 4:
					this.continueWebRTC(json);
					break;
				case 5:
					this.speakingMap.set(json.d.user_id, json.d.speaking);
					this.onSpeakingChange(json.d.user_id, json.d.speaking);
					break;
				case 6:
					this.time = json.d.t;
					setTimeout(this.sendAlive.bind(this), this.timeout);
					break;
				case 8:
					this.timeout = json.d.heartbeat_interval;
					setTimeout(this.sendAlive.bind(this), 1000);
					break;
				case 12:
					await this.figureRecivers();
					if (
						(!this.users.has(json.d.audio_ssrc) && json.d.audio_ssrc !== 0) ||
						(!this.vidusers.has(json.d.video_ssrc) && json.d.video_ssrc !== 0)
					) {
						console.log("redo 12!");
						this.makeOp12();
					}
					if (this.pc && json.d.audio_ssrc) {
						this.pc.addTransceiver("audio", {
							direction: "recvonly",
							sendEncodings: [{active: true}],
						});
						this.getAudioTrans(this.users.size + 1).direction = "recvonly";
						this.users.set(json.d.audio_ssrc, json.d.user_id);
					}
					if (this.pc && json.d.video_ssrc) {
						this.pc.addTransceiver("video", {
							direction: "recvonly",
							sendEncodings: [{active: true}],
						});
						this.getVideoTrans(this.vidusers.size + 1).direction = "recvonly";
						this.vidusers.set(json.d.video_ssrc, json.d.user_id);
					}

					break;
			}
		}
	}
	getVideoTrans(id: number) {
		if (!this.pc) throw new Error("no pc");
		let i = 0;
		for (const thing of this.pc.getTransceivers()) {
			if (thing.receiver.track.kind === "video") {
				if (id === i) {
					return thing;
				}
				i++;
			}
		}
		throw new Error("none by that id");
	}
	getAudioTrans(id: number) {
		if (!this.pc) throw new Error("no pc");
		let i = 0;
		for (const thing of this.pc.getTransceivers()) {
			if (thing.receiver.track.kind === "audio") {
				if (id === i) {
					return thing;
				}
				i++;
			}
		}
		throw new Error("none by that id");
	}
	hoffer?: string;
	get offer() {
		return this.hoffer;
	}
	set offer(e: string | undefined) {
		this.hoffer = e;
	}
	fingerprint?: string;
	cleanServerSDP(sdp: string): string {
		const pc = this.pc;
		if (!pc) throw new Error("pc isn't defined");
		const ld = pc.localDescription;
		if (!ld) throw new Error("localDescription isn't defined");
		const parsed = Voice.parsesdp(ld.sdp);
		const group = parsed.atr.get("group");
		if (!group) throw new Error("group isn't in sdp");
		const [_, ...bundles] = (group.entries().next().value as [string, string])[0].split(" ");
		bundles[bundles.length - 1] = bundles[bundles.length - 1].replace("\r", "");
		console.log(bundles);

		if (!this.offer) throw new Error("Offer is missing :P");
		let cline = sdp.split("\n").find((line) => line.startsWith("c="));
		if (!cline) throw new Error("c line wasn't found");
		const parsed1 = Voice.parsesdp(sdp).medias[0];
		//const parsed2=Voice.parsesdp(this.offer);
		const rtcport = (parsed1.atr.get("rtcp") as Set<string>).values().next().value as string;
		const ICE_UFRAG = (parsed1.atr.get("ice-ufrag") as Set<string>).values().next().value as string;
		const ICE_PWD = (parsed1.atr.get("ice-pwd") as Set<string>).values().next().value as string;
		const FINGERPRINT =
			this.fingerprint ||
			((parsed1.atr.get("fingerprint") as Set<string>).values().next().value as string);
		this.fingerprint = FINGERPRINT;
		const candidate = (parsed1.atr.get("candidate") as Set<string>).values().next().value as string;

		const audioUsers = [...this.users];
		const videoUsers = [...this.vidusers];
		console.warn(audioUsers);

		let build = `v=0\r
o=- 1420070400000 0 IN IP4 ${this.urlobj.url}\r
s=-\r
t=0 0\r
a=msid-semantic: WMS *\r
a=group:BUNDLE ${bundles.join(" ")}\r`;
		let ai = -1;
		let vi = -1;
		let i = 0;
		for (const grouping of parsed.medias) {
			let mode = "inactive";
			if (i < 2) {
				mode = "sendonly";
			}
			if (grouping.media === "audio") {
				build += `
m=audio ${parsed1.port} UDP/TLS/RTP/SAVPF 111\r
${cline}\r
a=rtpmap:111 opus/48000/2\r
a=fmtp:111 minptime=10;useinbandfec=1;usedtx=1\r
a=rtcp:${rtcport}\r
a=rtcp-fb:111 transport-cc\r
a=extmap:1 urn:ietf:params:rtp-hdrext:ssrc-audio-level\r
a=extmap:3 http://www.ietf.org/id/draft-holmer-rmcat-transport-wide-cc-extensions-01
a=setup:passive\r
a=mid:${bundles[i]}${audioUsers[ai] && audioUsers[ai][1] ? `\r\na=msid:${audioUsers[ai][1]}-${audioUsers[ai][0]} a${audioUsers[ai][1]}-${audioUsers[ai][0]}\r` : "\r"}
a=maxptime:60\r
a=${audioUsers[ai] && audioUsers[ai][1] ? "sendonly" : mode}\r
a=ice-ufrag:${ICE_UFRAG}\r
a=ice-pwd:${ICE_PWD}\r
a=fingerprint:${FINGERPRINT}\r
a=candidate:${candidate}${audioUsers[ai] && audioUsers[ai][1] ? `\r\na=ssrc:${audioUsers[ai][0]} cname:${audioUsers[ai][1]}-${audioUsers[ai][0]}\r` : "\r"}
a=rtcp-mux\r`;
				ai++;
			} else {
				build += `
m=video ${parsed1.port} UDP/TLS/RTP/SAVPF 103 104\r
${cline}\r
a=rtpmap:103 H264/90000\r
a=rtpmap:104 rtx/90000\r
a=fmtp:103 x-google-max-bitrate=2500;level-asymmetry-allowed=1;packetization-mode=1;profile-level-id=42e01f\r
a=fmtp:104 apt=103\r
a=rtcp:${rtcport}\r
a=rtcp-fb:103 ccm fir\r
a=rtcp-fb:103 nack\r
a=rtcp-fb:103 nack pli\r
a=rtcp-fb:103 goog-remb\r
a=rtcp-fb:103 transport-cc\r
a=extmap:2 http://www.webrtc.org/experiments/rtp-hdrext/abs-send-time
a=extmap:3 http://www.ietf.org/id/draft-holmer-rmcat-transport-wide-cc-extensions-01
a=extmap:14 urn:ietf:params:rtp-hdrext:toffset\r
a=extmap:13 urn:3gpp:video-orientation\r
a=extmap:5 http://www.webrtc.org/experiments/rtp-hdrext/playout-delay
a=setup:passive
a=mid:${bundles[i]}${videoUsers[vi] && videoUsers[vi][1] ? `\r\na=msid:${videoUsers[vi][1]}-${videoUsers[vi][0]} v${videoUsers[vi][1]}-${videoUsers[vi][0]}\r` : "\r"}
a=${videoUsers[vi] && videoUsers[vi][1] ? "sendonly" : mode}\r
a=ice-ufrag:${ICE_UFRAG}\r
a=ice-pwd:${ICE_PWD}\r
a=fingerprint:${FINGERPRINT}\r
a=candidate:${candidate}${videoUsers[vi] && videoUsers[vi][1] ? `\r\na=ssrc:${videoUsers[vi][0]} cname:${videoUsers[vi][1]}-${videoUsers[vi][0]}\r` : "\r"}
a=rtcp-mux\r`;
				vi++;
			}
			i++;
		}
		build += "\n";
		console.log(build);
		return build;
	}
	counter?: string;
	negotationneeded() {
		if (this.pc) {
			const pc = this.pc;
			const sendOffer = async () => {
				console.trace("neg need");
				await pc.setLocalDescription();

				const senders = this.senders.difference(this.ssrcMap);
				for (const sender of senders) {
					for (const thing of (await sender.getStats()) as Map<string, any>) {
						if (thing[1].ssrc) {
							this.ssrcMap.set(sender, thing[1].ssrc);
							this.makeOp12(sender);
						}
					}
				}
			};
			pc.addEventListener("negotiationneeded", async () => {
				await sendOffer();
				console.log(this.ssrcMap);
			});
			pc.addEventListener("signalingstatechange", async () => {
				while (!this.counter) await new Promise((res) => setTimeout(res, 100));
				if (this.pc && this.counter) {
					if (pc.signalingState === "have-local-offer") {
						const counter = this.counter;
						const remote: {sdp: string; type: RTCSdpType} = {
							sdp: this.cleanServerSDP(counter),
							type: "answer",
						};
						console.log(remote);
						await pc.setRemoteDescription(remote);
					}
				}
			});
			pc.addEventListener("connectionstatechange", async () => {
				if (pc.connectionState === "connecting") {
					await pc.setLocalDescription();
				}
			});
			pc.addEventListener("icegatheringstatechange", async () => {
				console.log("icegatheringstatechange", pc.iceGatheringState, this.pc, this.counter);
				if (this.pc && this.counter) {
					if (pc.iceGatheringState === "complete") {
						pc.setLocalDescription();
					}
				}
			});
		}
	}
	async makeOp12(
		sender: RTCRtpSender | undefined | [RTCRtpSender, number] = this.ssrcMap.entries().next().value,
	) {
		if (!this.ws) return;
		if (!sender) return;
		if (sender instanceof Array) {
			sender = sender[0];
		}
		let video_ssrc = 0;
		let rtx_ssrc = 0;
		let max_framerate = 20;
		let width = 1280;
		let height = 720;
		if (this.cam && this.cammera) {
			const stats = (await this.cam.sender.getStats()) as Map<string, any>;
			Array.from(stats).forEach((_) => {
				if (_[1].ssrc) {
					video_ssrc = _[1].ssrc;
				}
				if (_[1].rtxSsrc) {
					rtx_ssrc = _[1].rtxSsrc;
					console.log(_);
				}
			});
			const settings = this.cammera.getSettings();
			console.error(settings);
			//width = settings.width || 0;
			//height = settings.height || 0;
		}

		console.log(this.ssrcMap);
		this.ws.send(
			JSON.stringify({
				op: 12,
				d: {
					audio_ssrc: this.ssrcMap.get(sender),
					video_ssrc,
					rtx_ssrc,
					streams: [
						{
							type: "video",
							rid: "100",
							ssrc: video_ssrc,
							active: !!video_ssrc,
							quality: 100,
							rtx_ssrc: rtx_ssrc,
							max_bitrate: 2500000, //TODO
							max_framerate, //TODO
							max_resolution: {type: "fixed", width, height},
						},
					],
				},
			}),
		);
		this.status = "Sending audio streams";
	}
	senders: Set<RTCRtpSender> = new Set();
	recivers = new Set<RTCRtpReceiver>();
	ssrcMap: Map<RTCRtpSender, number> = new Map();
	speaking = false;
	async setupMic(audioStream: MediaStream) {
		const audioContext = new AudioContext();
		const analyser = audioContext.createAnalyser();
		const microphone = audioContext.createMediaStreamSource(audioStream);

		analyser.smoothingTimeConstant = 0;
		analyser.fftSize = 32;

		microphone.connect(analyser);
		const array = new Float32Array(1);
		const interval = setInterval(() => {
			if (!this.ws) {
				clearInterval(interval);
			}
			analyser.getFloatFrequencyData(array);
			const value = array[0] + 65;
			if (value < 0) {
				if (this.speaking) {
					this.speaking = false;
					this.sendSpeaking();
					console.log("not speaking");
				}
			} else if (!this.speaking) {
				console.log("speaking");
				this.speaking = true;
				this.sendSpeaking();
			}
		}, 500);
	}
	async sendSpeaking() {
		if (!this.ws) return;
		const pair = this.ssrcMap.entries().next().value;
		if (!pair) return;
		this.onSpeakingChange(this.userid, +this.speaking);
		this.ws.send(
			JSON.stringify({
				op: 5,
				d: {
					speaking: this.speaking,
					delay: 5, //not sure
					ssrc: pair[1],
				},
			}),
		);
	}
	async continueWebRTC(data: sdpback) {
		if (this.pc && this.offer) {
			this.counter = data.d.sdp;
		} else {
			this.status = "Connection failed";
		}
	}
	reciverMap = new Map<number, RTCRtpReceiver>();
	off?: Promise<RTCSessionDescriptionInit>;
	async makeOffer() {
		if (this.pc?.localDescription?.sdp) return {sdp: this.pc?.localDescription?.sdp};
		if (this.off) return this.off;
		return (this.off = new Promise<RTCSessionDescriptionInit>(async (res) => {
			if (!this.pc) throw new Error("stupid");
			console.error("stupid!");
			const offer = await this.pc.createOffer({
				offerToReceiveAudio: true,
				offerToReceiveVideo: true,
			});
			res(offer);
		}));
	}
	async figureRecivers() {
		await new Promise((res) => setTimeout(res, 500));
		for (const reciver of this.recivers) {
			const stats = (await reciver.getStats()) as Map<string, any>;
			for (const thing of stats) {
				if (thing[1].ssrc) {
					this.reciverMap.set(thing[1].ssrc, reciver);
				}
			}
		}
		console.log(this.reciverMap);
	}
	updateMute() {
		if (!this.micTrack) return;
		this.micTrack.enabled = !this.owner.mute;
	}
	mic?: RTCRtpSender;
	micTrack?: MediaStreamTrack;
	onVideo = (_video: HTMLVideoElement, _id: string) => {};
	videos = new Map<string, HTMLVideoElement>();
	cam?: RTCRtpTransceiver;
	cammera?: MediaStreamTrack;
	stopVideo() {
		if (!this.cam) return;
		this.owner.video = false;
		if (!this.cammera) return;
		this.cammera.stop();
		this.cammera = undefined;

		this.cam.sender.replaceTrack(null);
		this.cam.direction = "inactive";

		this.pc?.setLocalDescription();

		this.owner.updateSelf();

		this.videos.delete(this.userid);
		this.onUserChange(this.userid, {
			deaf: false,
			muted: this.owner.mute,
			video: false,
			live: this.owner.stream,
		});
	}
	liveMap = new Map<string, HTMLVideoElement>();
	private voiceMap = new Map<string, Voice>();
	getLive(id: string) {
		return this.liveMap.get(id);
	}
	joinLive(id: string) {
		return this.owner.joinLive(id);
	}
	createLive(id: string, stream: MediaStream) {
		return this.owner.createLive(id, stream);
	}
	leaveLive(id: string) {
		const v = this.voiceMap.get(id);
		if (!v) return;
		v.leave();
		this.voiceMap.delete(id);
		this.liveMap.delete(id);
		this.onLeaveStream(id);
	}
	onLeaveStream = (_user: string) => {};
	onGotStream = (_v: HTMLVideoElement, _user: string) => {};
	gotStream(voice: Voice, user: string) {
		voice.onVideo = (video) => {
			this.liveMap.set(user, video);
			this.onGotStream(video, user);
		};
		this.voiceMap.set(user, voice);
	}
	videoStarted = false;
	async startVideo(caml: MediaStream, early = false) {
		console.warn("test test test test video sent!");
		while (!this.cam) {
			await new Promise((res) => setTimeout(res, 100));
		}
		const tracks = caml.getVideoTracks();
		const [cam] = tracks;

		this.owner.video = true;

		this.cammera = cam;

		const video = document.createElement("video");
		this.onVideo(video, this.userid);
		this.videos.set(this.userid, video);
		video.srcObject = caml;
		video.autoplay = true;
		this.cam.direction = "sendonly";
		const sender = this.cam.sender;
		if (!early) {
			await sender.replaceTrack(cam);
			this.pc?.setLocalDescription();

			this.owner.updateSelf();
		}
	}
	onconnect = () => {};
	async startWebRTC() {
		this.status = "Making offer";
		const pc = new RTCPeerConnection();
		pc.ontrack = async (e) => {
			this.status = "Done";
			this.onconnect();
			const media = e.streams[0];
			if (!media) {
				console.log(e);
				return;
			}
			const userId = media.id.split("-")[0];
			if (e.track.kind === "video") {
				console.log(media, this.vidusers);
				const video = document.createElement("video");
				this.onVideo(video, userId);
				this.videos.set(userId, video);
				video.srcObject = media;

				video.autoplay = true;

				console.log("gotVideo?");
				return;
			}

			console.log("got audio:", e);
			for (const track of media.getTracks()) {
				console.log(track);
			}

			const context = new AudioContext();
			console.log(context);
			await context.resume();
			const ss = context.createMediaStreamSource(media);
			console.log(media, ss);
			new Audio().srcObject = media; //weird I know, but it's for chromium/webkit bug
			ss.connect(context.destination);
			this.recivers.add(e.receiver);
			console.log(this.recivers);
		};
		const audioStream = await navigator.mediaDevices.getUserMedia({video: false, audio: true});
		const [track] = audioStream.getAudioTracks();
		if (!this.settings.stream) {
			this.setupMic(audioStream);
			const sender = pc.addTrack(track);
			this.cam = pc.addTransceiver("video", {
				direction: "sendonly",
				sendEncodings: [
					{active: true, maxBitrate: 2500000, scaleResolutionDownBy: 1, maxFramerate: 20},
				],
			});
			this.mic = sender;
			this.micTrack = track;
			track.enabled = !this.owner.mute;
			this.senders.add(sender);
			console.log(sender);
		}
		const count = this.settings.stream ? 1 : 10;
		for (let i = 0; i < count; i++) {
			pc.addTransceiver("audio", {
				direction: "inactive",
				streams: [],
				sendEncodings: [{active: true, maxBitrate: this.settings.bitrate}],
			});
		}
		if (this.settings.live) {
			this.cam = pc.addTransceiver("video", {
				direction: "sendonly",
				sendEncodings: [
					{active: true, maxBitrate: 2500000, scaleResolutionDownBy: 1, maxFramerate: 20},
				],
			});
			this.startVideo(this.settings.live, true);
		} else {
			for (let i = 0; i < count; i++) {
				pc.addTransceiver("video", {
					direction: "inactive",
					streams: [],
					sendEncodings: [{active: true, maxBitrate: this.settings.bitrate}],
				});
			}
		}

		this.pc = pc;
		this.negotationneeded();
		await new Promise((res) => setTimeout(res, 100));
		let sdp = this.offer;
		if (!sdp) {
			const offer = await this.makeOffer();
			this.status = "Starting RTC connection";
			sdp = offer.sdp;
			this.offer = sdp;
		}

		await pc.setLocalDescription();
		if (!sdp) {
			this.status = "No SDP";
			this.ws?.close();
			return;
		}
		const parsed = Voice.parsesdp(sdp);
		const video = new Map<string, [number, number]>();
		const audio = new Map<string, number>();
		let cur: [number, number] | undefined;
		let i = 0;
		for (const thing of parsed.medias) {
			try {
				if (thing.media === "video") {
					const rtpmap = thing.atr.get("rtpmap");
					if (!rtpmap) continue;
					for (const codecpair of rtpmap) {
						const [port, codec] = codecpair.split(" ");
						if (cur && codec.split("/")[0] === "rtx") {
							cur[1] = Number(port);
							cur = undefined;
							continue;
						}
						if (video.has(codec.split("/")[0])) continue;
						cur = [Number(port), -1];
						video.set(codec.split("/")[0], cur);
					}
				} else if (thing.media === "audio") {
					const rtpmap = thing.atr.get("rtpmap");
					if (!rtpmap) continue;
					for (const codecpair of rtpmap) {
						const [port, codec] = codecpair.split(" ");
						if (audio.has(codec.split("/")[0])) {
							continue;
						}
						audio.set(codec.split("/")[0], Number(port));
					}
				}
			} finally {
				i++;
			}
		}

		const codecs: {
			name: string;
			type: "video" | "audio";
			priority: number;
			payload_type: number;
			rtx_payload_type: number | null;
		}[] = [];
		const include = new Set<string>();
		const audioAlloweds = new Map([["opus", {priority: 1000}]]);
		for (const thing of audio) {
			if (audioAlloweds.has(thing[0])) {
				include.add(thing[0]);
				codecs.push({
					name: thing[0],
					type: "audio",
					priority: audioAlloweds.get(thing[0])?.priority as number,
					payload_type: thing[1],
					rtx_payload_type: null,
				});
			}
		}
		const videoAlloweds = new Map([
			["H264", {priority: 1000}],
			["VP8", {priority: 2000}],
			["VP9", {priority: 3000}],
		]);
		for (const thing of video) {
			if (videoAlloweds.has(thing[0])) {
				include.add(thing[0]);
				codecs.push({
					name: thing[0],
					type: "video",
					priority: videoAlloweds.get(thing[0])?.priority as number,
					payload_type: thing[1][0],
					rtx_payload_type: thing[1][1],
				});
			}
		}
		let sendsdp = "a=extmap-allow-mixed";
		let first = true;
		for (const media of parsed.medias) {
			for (const thing of first
				? ["ice-ufrag", "ice-pwd", "ice-options", "fingerprint", "extmap", "rtpmap"]
				: ["extmap", "rtpmap"]) {
				const thing2 = media.atr.get(thing);
				if (!thing2) continue;
				for (const thing3 of thing2) {
					if (thing === "rtpmap") {
						const name = thing3.split(" ")[1].split("/")[0];
						if (include.has(name)) {
							include.delete(name);
						} else {
							continue;
						}
					}
					sendsdp += `\na=${thing}:${thing3}`;
				}
			}
			first = false;
		}
		if (this.ws) {
			this.ws.send(
				JSON.stringify({
					d: {
						codecs,
						protocol: "webrtc",
						data: sendsdp,
						sdp: sendsdp,
					},
					op: 1,
				}),
			);
		}
		console.warn("done with this!");
	}
	static parsesdp(sdp: string) {
		let currentA = new Map<string, Set<string>>();
		const out: {
			version?: number;
			medias: {
				media: string;
				port: number;
				proto: string;
				ports: number[];
				atr: Map<string, Set<string>>;
			}[];
			atr: Map<string, Set<string>>;
		} = {medias: [], atr: currentA};
		for (const line of sdp.split("\n")) {
			const [code, setinfo] = line.split("=");
			switch (code) {
				case "v":
					out.version = Number(setinfo);
					break;
				case "o":
				case "s":
				case "t":
					break;
				case "m":
					currentA = new Map();
					const [media, port, proto, ...ports] = setinfo.split(" ");
					const portnums = ports.map(Number);
					out.medias.push({media, port: Number(port), proto, ports: portnums, atr: currentA});
					break;
				case "a":
					const [key, ...value] = setinfo.split(":");
					if (!currentA.has(key)) {
						currentA.set(key, new Set());
					}
					currentA.get(key)?.add(value.join(":"));
					break;
			}
		}
		return out;
	}
	open = false;
	async join() {
		console.warn("Joining");
		this.open = true;
		this.status = "waiting for main WS";
	}
	onMemberChange = (_member: memberjson | string, _joined: boolean) => {};
	userids = new Map<string, {deaf: boolean; muted: boolean; video: boolean; live: boolean}>();
	onUserChange = (
		_user: string,
		_change: {deaf: boolean; muted: boolean; video: boolean; live: boolean},
	) => {};
	async voiceupdate(update: voiceStatus) {
		console.log("Update!");
		if (!this.userids.has(update.user_id)) {
			this.onMemberChange(update?.member || update.user_id, true);
		}
		const vals = {
			deaf: update.deaf,
			muted: update.mute || update.self_mute,
			video: update.self_video,
			live: update.self_stream,
		};
		this.onUserChange(update.user_id, vals);
		this.userids.set(update.user_id, vals);
		if (update.user_id === this.userid && this.videoStarted !== update.self_video) {
			this.makeOp12();
			this.videoStarted = update.self_video;
		}
		if (update.user_id === this.userid && this.open && !this.ws) {
			if (!update) {
				this.status = "bad responce from WS";
				return;
			}
			this.session_id = update.session_id;
			await this.startWS(update.session_id, update.guild_id);
		}
	}
	session_id?: string;
	async startWS(session_id: string, server_id: string) {
		if (!this.urlobj.url) {
			this.status = "waiting for Voice URL";
			await this.urlobj.geturl;
			if (!this.open) {
				this.leave();
				return;
			}
		}

		const ws = new WebSocket(("ws://" + this.urlobj.url) as string);
		this.ws = ws;
		ws.onclose = () => {
			this.leave();
		};
		this.status = "waiting for WS to open";
		ws.addEventListener("message", (m) => {
			this.packet(m);
		});
		await new Promise<void>((res) => {
			ws.addEventListener("open", () => {
				res();
			});
		});
		if (!this.ws) {
			this.leave();
			return;
		}
		this.status = "waiting for WS to authorize";
		ws.send(
			JSON.stringify({
				op: 0,
				d: {
					server_id,
					user_id: this.userid,
					session_id,
					token: this.urlobj.token,
					video: false,
					streams: [
						{
							type: "video",
							rid: "100",
							quality: 100,
						},
					],
				},
			}),
		);
	}
	onLeave = () => {};
	async leave() {
		console.warn("leave");
		this.open = false;
		this.status = "Left voice chat";
		this.onLeave();
		for (const thing of this.liveMap) {
			this.leaveLive(thing[0]);
		}
		if (!this.settings.stream) {
			this.onMemberChange(this.userid, false);
		}
		this.userids.delete(this.userid);
		if (this.ws) {
			this.ws.close();
			this.ws = undefined;
		}
		if (this.pc) {
			this.pc.close();
			this.pc = undefined;
		}
		this.micTrack?.stop();
		this.micTrack = undefined;
		this.mic = undefined;
		this.off = undefined;
		this.counter = undefined;
		this.offer = undefined;
		this.senders = new Set();
		this.recivers = new Set();
		this.ssrcMap = new Map();
		this.fingerprint = undefined;
		this.users = new Map();
		if (!this.settings.stream) this.owner.disconect();
		this.vidusers = new Map();
		this.videos = new Map();
		if (this.cammera) this.cammera.stop();
		this.cammera = undefined;
		this.cam = undefined;
		console.log(this);
	}
}
export {Voice, VoiceFactory};
