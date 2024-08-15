import {Guild} from "./guild.js";
import {Channel} from "./channel.js";
import {Direct} from "./direct.js";
import {Voice} from "./audio.js";
import {User} from "./user.js";
import {Dialog} from "./dialog.js";
import {getBulkInfo, setTheme, Specialuser} from "./login.js";
import { SnowFlake } from "./snowflake.js";
import { Message } from "./message.js";
import { channeljson, guildjson, memberjson, readyjson } from "./jsontypes.js";
import { Member } from "./member.js";
import { Settings } from "./settings.js";
import { MarkDown } from "./markdown.js";

const wsCodesRetry=new Set([4000,4003,4005,4007,4008,4009]);

class Localuser{
    lastSequence:number|null=null;
    token:string;
    userinfo:Specialuser;
    serverurls:Specialuser["serverurls"];
    initialized:boolean;
    info:Specialuser["serverurls"];
    headers:{"Content-type":string,Authorization:string};
    usersettings:Settings;
    userConnections:Dialog;
    devPortal:Dialog;
    ready:readyjson;
    guilds:Guild[];
    guildids:Map<string,Guild>;
    user:User;
    status:string;
    channelfocus:Channel;
    lookingguild:Guild;
    guildhtml:Map<string, HTMLDivElement>;
    ws:WebSocket;
    typing:Map<Member,number>=new Map();
    connectionSucceed=0;
    errorBackoff=0;
    mfa_enabled:boolean;
    constructor(userinfo:Specialuser|-1){
        if(userinfo===-1){
            return;
        }
        this.token=userinfo.token;
        this.userinfo=userinfo;
        this.serverurls=this.userinfo.serverurls;
        this.initialized=false;
        this.info=this.serverurls;
        this.headers={"Content-type": "application/json; charset=UTF-8",Authorization:this.userinfo.token};
    }
    gottenReady(ready:readyjson):void{
        this.usersettings=null;
        this.initialized=true;
        this.ready=ready;
        this.guilds=[];
        this.guildids=new Map();
        this.user=new User(ready.d.user,this);
        this.mfa_enabled=ready.d.user.mfa_enabled;
        this.userinfo.username=this.user.username;
        this.userinfo.pfpsrc=this.user.getpfpsrc();
        this.status=this.ready.d.user_settings.status;
        this.channelfocus=null;
        this.lookingguild=null;
        this.guildhtml=new Map();
        const members={};
        for(const thing of ready.d.merged_members){
            members[thing[0].guild_id]=thing[0];
        }

        for(const thing of ready.d.guilds){
            const temp=new Guild(thing,this,members[thing.id]);
            this.guilds.push(temp);
            this.guildids.set(temp.id,temp);
        }
        {
            const temp=new Direct(ready.d.private_channels,this);
            this.guilds.push(temp);
            this.guildids.set(temp.id,temp);
        }
        console.log(ready.d.user_guild_settings.entries);


        for(const thing of ready.d.user_guild_settings.entries){
            this.guildids.get(thing.guild_id).notisetting(thing);
        }

        for(const thing of ready.d.read_state.entries){
            const channel=this.resolveChannelFromID(thing.id);
            if(!channel){continue;}
            const guild=channel.guild;
            if(guild===undefined){
                continue
            }
            const guildid=guild.snowflake;
            this.guildids.get(guildid.id).channelids[thing.channel_id].readStateInfo(thing);
        }
    }
    outoffocus():void{
        document.getElementById("servers").innerHTML="";
        document.getElementById("channels").innerHTML="";
        if(this.channelfocus){
            this.channelfocus.infinite.delete();
        }
        this.lookingguild=null;
        this.channelfocus=null;
    }
    unload():void{
        this.initialized=false;
        this.outoffocus();
        this.guilds=[];
        this.guildids=new Map();
        if(this.ws){
            this.ws.close(4001)
        }
        SnowFlake.clear();
        User.clear();
    }
    swapped=false;
    async initwebsocket():Promise<void>{
        let returny=null
        const promise=new Promise((res)=>{returny=res});
        this.ws = new WebSocket(this.serverurls.gateway.toString()+"?encoding=json&v=9"+(DecompressionStream?"&compress=zlib-stream":""));
        this.ws.addEventListener('open', (_event) => {
        console.log('WebSocket connected');
        this.ws.send(JSON.stringify({
            "op": 2,
            "d": {
                "token":this.token,
                "capabilities": 16381,
                "properties": {
                    "browser": "Jank Client",
                    "client_build_number": 0,//might update this eventually lol
                    "release_channel": "Custom",
                    "browser_user_agent": navigator.userAgent
                },
                "compress": !!DecompressionStream,
                "presence": {
                    "status": "online",
                    "since": new Date().getTime(),
                    "activities": [],
                    "afk": false
                }
            }
        }))
        });
        let ds:DecompressionStream;
        let w:WritableStreamDefaultWriter;
        let r:ReadableStreamDefaultReader;
        let arr:Uint8Array;
        let build="";
        if(DecompressionStream){
            ds = new DecompressionStream("deflate");
            w= ds.writable.getWriter();
            r=ds.readable.getReader();
            arr=new Uint8Array();
            const textdecode=new TextDecoder();
            (async ()=>{
                while(true){
                    const read=await r.read();
                    const data=textdecode.decode(read.value);
                    build+=data;
                    try{
                        const temp=JSON.parse(build);
                        build="";
                        if(temp.op===0&&temp.t==="READY"){
                            returny();
                        }
                        await this.handleEvent(temp);
                    }catch{}
                }
            })();
        }


        let order=new Promise<void>((res)=>(res()));

        this.ws.addEventListener('message', async (event) => {
            const temp2=order;
            let res:Function;
            order=new Promise<void>((r)=>(res=r))
            await temp2;
            let temp:{op:number,t:string};
            try{
                if(event.data instanceof Blob){
                    const buff=await event.data.arrayBuffer()
                    const array=new Uint8Array(buff);

                    const temparr=new Uint8Array(array.length+arr.length);
                    temparr.set(arr, 0);
                    temparr.set(array, arr.length);
                    arr=temparr;

                    const len=array.length;
                    if(!(array[len-1]===255&&array[len-2]===255&&array[len-3]===0&&array[len-4]===0)){
                        return;
                    }
                    w.write(arr.buffer);
                    arr=new Uint8Array();
                    return;//had to move the while loop due to me being dumb
                }else{
                    temp=JSON.parse(event.data);
                }
                if(temp.op===0&&temp.t==="READY"){
                    returny();
                }
                await this.handleEvent(temp);
            }catch(e){
                console.error(e);
            }finally{
                res();
            }
        });

        this.ws.addEventListener("close", event => {
            this.ws=undefined;
            console.log("WebSocket closed with code " + event.code);

            this.unload();
            document.getElementById("loading").classList.remove("doneloading");
            document.getElementById("loading").classList.add("loading");
            this.fetchingmembers=new Map();
            this.noncemap=new Map();
            this.noncebuild=new Map();
            if (((event.code>1000 && event.code<1016) || wsCodesRetry.has(event.code))) {
                if (this.connectionSucceed!==0 && Date.now()>this.connectionSucceed+20000) this.errorBackoff=0;
                else this.errorBackoff++;
                this.connectionSucceed=0;

                document.getElementById("load-desc").innerHTML="Unable to connect to the Spacebar server, retrying in <b>" + Math.round(0.2 + (this.errorBackoff*2.8)) + "</b> seconds...";

                setTimeout(() => {
                    if(this.swapped) return;
                    document.getElementById("load-desc").textContent="Retrying...";
                    this.initwebsocket().then(() => {
                        this.loaduser();
                        this.init();
                        document.getElementById("loading").classList.add("doneloading");
                        document.getElementById("loading").classList.remove("loading");
                        console.log("done loading");
                    });
                }, 200 + (this.errorBackoff*2800));
            } else document.getElementById("load-desc").textContent="Unable to connect to the Spacebar server. Please try logging out and back in.";
        });

        await promise;
        return;
    }
    async handleEvent(temp){
        console.debug(temp);
        if (temp.s) this.lastSequence=temp.s;
        if(temp.op==0){
            switch(temp.t){
                case "MESSAGE_CREATE":
                    if(this.initialized){
                        this.messageCreate(temp);
                    }
                    break;
                case "MESSAGE_DELETE":
                    console.log(temp.d);
                    SnowFlake.getSnowFlakeFromID(temp.d.id,Message).getObject().deleteEvent();
                    break;
                case "READY":
                    this.gottenReady(temp as readyjson);
                    break;
                case "MESSAGE_UPDATE":
                    const message=SnowFlake.getSnowFlakeFromID(temp.d.id,Message).getObject();
                    message.giveData(temp.d);
                    break;
                case "TYPING_START":
                    if(this.initialized){
                        this.typingStart(temp);
                    }
                    break;
                case "USER_UPDATE":
                    if(this.initialized){
                        const users=SnowFlake.getSnowFlakeFromID(temp.d.id,User).getObject() as User;
                        console.log(users,temp.d.id)
                        if(users){
                            users.userupdate(temp.d);
                        }
                    }
                    break
                case "CHANNEL_UPDATE":
                    if(this.initialized){
                        this.updateChannel(temp.d);
                    }
                    break;
                case "CHANNEL_CREATE":
                    if(this.initialized){
                        this.createChannel(temp.d);
                    }
                    break;
                case "CHANNEL_DELETE":
                    if(this.initialized){
                        this.delChannel(temp.d);
                    }
                    break;
                case "GUILD_DELETE":
                {
                    const guildy=this.guildids.get(temp.d.id);
                    this.guildids.delete(temp.d.id);
                    this.guilds.splice(this.guilds.indexOf(guildy),1);
                    guildy.html.remove();
                    break;
                }
                case "GUILD_CREATE":
                {
                    const guildy=new Guild(temp.d,this,this.user);
                    this.guilds.push(guildy);
                    this.guildids.set(guildy.id,guildy);
                    document.getElementById("servers").insertBefore(guildy.generateGuildIcon(),document.getElementById("bottomseparator"));
                    break;
                }
                case "MESSAGE_REACTION_ADD":
                    if(SnowFlake.hasSnowFlakeFromID(temp.d.message_id,Message)){
                        temp.d.guild_id??="@me";
                        const message=SnowFlake.getSnowFlakeFromID(temp.d.message_id,Message).getObject();
                        const guild=SnowFlake.getSnowFlakeFromID(temp.d.guild_id,Guild).getObject();
                        let thing:Member|{id:string};
                        if(temp.d.member){
                            thing=await Member.new(temp.d.member,guild);
                        }else{
                            thing={id:temp.d.user_id}
                        }
                        message.giveReaction(temp.d.emoji,thing);
                    }
                    break;
                case "MESSAGE_REACTION_REMOVE":
                    if(SnowFlake.hasSnowFlakeFromID(temp.d.message_id,Message)){

                        const message=SnowFlake.getSnowFlakeFromID(temp.d.message_id,Message).getObject();
                        console.log("test");
                        message.takeReaction(temp.d.emoji,temp.d.user_id);
                    }
                    break;
                case "GUILD_MEMBERS_CHUNK":
                    this.gotChunk(temp.d);
                    break;
            }

        }else if(temp.op===10){
            console.log("heartbeat down");
            this.heartbeat_interval=temp.d.heartbeat_interval;
            this.ws.send(JSON.stringify({op:1,d:this.lastSequence}))
        }else if(temp.op===11){
            setTimeout(_=>{
                if(!this.ws) return;
                if (this.connectionSucceed===0) this.connectionSucceed=Date.now()
                this.ws.send(JSON.stringify({op:1,d:this.lastSequence}))
            },this.heartbeat_interval)
        }
    }
    heartbeat_interval:number;
    resolveChannelFromID(ID:string):Channel{
        let resolve=this.guilds.find(guild => guild.channelids[ID]);
        if(resolve){
            return resolve.channelids[ID];
        }
        return undefined;
    }
    updateChannel(json:channeljson):void{
        SnowFlake.getSnowFlakeFromID(json.guild_id,Guild).getObject().updateChannel(json);
        if(json.guild_id===this.lookingguild.id){
            this.loadGuild(json.guild_id);
        }
    }
    createChannel(json:channeljson):void{
        json.guild_id??="@me";
        SnowFlake.getSnowFlakeFromID(json.guild_id,Guild).getObject().createChannelpac(json);
        if(json.guild_id===this.lookingguild.id){
            this.loadGuild(json.guild_id);
        }
    }
    delChannel(json:channeljson):void{
        json.guild_id??="@me";
        this.guildids.get(json.guild_id).delChannel(json);

        if(json.guild_id===this.lookingguild.id){
            this.loadGuild(json.guild_id);
        }
    }
    init():void{
        const location=window.location.href.split("/");
        this.buildservers();
        if(location[3]==="channels"){
            const guild=this.loadGuild(location[4]);
            guild.loadChannel(location[5]);
            this.channelfocus=guild.channelids[location[5]];
        }

    }
    loaduser():void{
        document.getElementById("username").textContent=this.user.username;
        (document.getElementById("userpfp") as HTMLImageElement).src=this.user.getpfpsrc();
        document.getElementById("status").textContent=this.status;
    }
    isAdmin():boolean{
        return this.lookingguild.isAdmin();
    }
    loadGuild(id:string):Guild{
        let guild=this.guildids.get(id);
        if(!guild){
            guild=this.guildids.get("@me");
        }
        if(this.lookingguild){
            this.lookingguild.html.classList.remove("serveropen");
        }
        if(guild.html){
            guild.html.classList.add("serveropen")
        }
        this.lookingguild=guild;
        document.getElementById("serverName").textContent=guild.properties.name;
        //console.log(this.guildids,id)
        document.getElementById("channels").innerHTML="";
        document.getElementById("channels").appendChild(guild.getHTML());
        return guild;
    }
    buildservers():void{
        const serverlist=document.getElementById("servers");//
        const outdiv=document.createElement("div");
        const img=document.createElement("img");
        const div=document.createElement("div");
        div.classList.add("home","servericon");

        img.src="/icons/home.svg";
        img.classList.add("svgtheme","svgicon")
        img["all"]=this.guildids.get("@me");
        this.guildids.get("@me").html=outdiv;
        const unread=document.createElement("div");
        unread.classList.add("unread");
        outdiv.append(unread);
        outdiv.append(div);
        div.appendChild(img);

        outdiv.classList.add("servernoti")
        serverlist.append(outdiv);
        img.onclick=function(){
            this["all"].loadGuild();
            this["all"].loadChannel();
        }
        const sentdms=document.createElement("div");
        sentdms.classList.add("sentdms");
        serverlist.append(sentdms);
        sentdms.id="sentdms";

        const br=document.createElement("hr")
        br.classList.add("lightbr");
        serverlist.appendChild(br)
        for(const thing of this.guilds){
            if(thing instanceof Direct){
                (thing as Direct).unreaddms();
                continue;
            }
            const divy=thing.generateGuildIcon();
            serverlist.append(divy);
        }
        {
            const br=document.createElement("hr");
            br.classList.add("lightbr");
            serverlist.appendChild(br);
            br.id="bottomseparator";

            const div=document.createElement("div");
            div.textContent="+";
            div.classList.add("home","servericon")
            serverlist.appendChild(div)
            div.onclick=_=>{
                this.createGuild();
            }
            const guilddsdiv=document.createElement("div");
            const guildDiscoveryContainer=document.createElement("img");
            guildDiscoveryContainer.src="/icons/explore.svg";
            guildDiscoveryContainer.classList.add("svgtheme","svgicon");
            guilddsdiv.classList.add("home","servericon");
            guilddsdiv.appendChild(guildDiscoveryContainer);
            serverlist.appendChild(guilddsdiv);
            guildDiscoveryContainer.addEventListener("click", ()=>{
                this.guildDiscovery();
            });

        }
        this.unreads();
    }
    createGuild(){
        let inviteurl="";
        const error=document.createElement("span");

        const full=new Dialog(["tabs",[
            ["Join using invite",[
                "vdiv",
                    ["textbox",
                        "Invite Link/Code",
                        "",
                        function(){
                            inviteurl=this.value;
                        }
                    ],
                    ["html",error]
                    ,
                    ["button",
                        "",
                        "Submit",
                        _=>{
                            let parsed="";
                            if(inviteurl.includes("/")){
                                parsed=inviteurl.split("/")[inviteurl.split("/").length-1]
                            }else{
                                parsed=inviteurl;
                            }
                            fetch(this.info.api+"/invites/"+parsed,{
                                method:"POST",
                                headers:this.headers,
                            }).then(r=>r.json()).then(_=>{
                                if(_.message){
                                    error.textContent=_.message;
                                }
                            })
                        }
                    ]

            ]],
            ["Create Server",[
                "text","Not currently implemented, sorry"
            ]]
        ]])
        full.show();
    }
    async guildDiscovery() {
        const content=document.createElement("div");
        content.classList.add("guildy");
        content.textContent="Loading...";
        const full=new Dialog(["html", content]);
        full.show();

        const res=await fetch(this.info.api+"/discoverable-guilds?limit=50", {
            headers: this.headers
        });
        const json=await res.json();

        content.innerHTML="";
        const title=document.createElement("h2");
        title.textContent="Guild discovery ("+json.total+" entries)";
        content.appendChild(title);

        const guilds=document.createElement("div");
        guilds.id="discovery-guild-content";

        json.guilds.forEach((guild)=>{
            const content=document.createElement("div");
            content.classList.add("discovery-guild");

            if(guild.banner) {
                const banner=document.createElement("img");
                banner.classList.add("banner");
                banner.crossOrigin="anonymous";
                banner.src=this.info.cdn+"icons/"+guild.id+"/"+guild.banner+".png?size=256";
                banner.alt="";
                content.appendChild(banner);
            }

            const nameContainer=document.createElement("div");
            nameContainer.classList.add("flex");
            const img=document.createElement("img");
            img.classList.add("icon");
            img.crossOrigin="anonymous";
            img.src=this.info.cdn+(guild.icon ? ("/icons/"+guild.id+"/"+guild.icon+".png?size=48") : "/embed/avatars/3.png");
            img.alt="";
            nameContainer.appendChild(img);

            const name=document.createElement("h3");
            name.textContent=guild.name;
            nameContainer.appendChild(name);
            content.appendChild(nameContainer);
            const desc=document.createElement("p");
            desc.textContent=guild.description;
            content.appendChild(desc);

            content.addEventListener("click", async ()=>{
                const joinRes=await fetch(this.info.api+"/guilds/"+guild.id+"/members/@me", {
                    method: "PUT",
                    headers: this.headers
                });
                if(joinRes.ok) full.hide();
            })
            guilds.appendChild(content);
        })
        content.appendChild(guilds);
    }
    messageCreate(messagep):void{
        messagep.d.guild_id??="@me";
        this.guildids.get(messagep.d.guild_id).channelids[messagep.d.channel_id].messageCreate(messagep);
        this.unreads();
    }
    unreads():void{
        for(const thing of this.guilds){
            if(thing.id==="@me"){continue;}
            const html=this.guildhtml.get(thing.id);
            thing.unreads(html);
        }
    }
    async typingStart(typing):Promise<void>{
        if(this.channelfocus.id===typing.d.channel_id){
            const guild=SnowFlake.getSnowFlakeFromID(typing.d.guild_id,Guild).getObject()
            const memb=await Member.new(typing.d.member,guild);
            if(memb.id===this.user.id){
                console.log("you is typing")
                return;
            }
            console.log("user is typing and you should see it");
            this.typing.set(memb,new Date().getTime());
            setTimeout(this.rendertyping.bind(this),10000);
            this.rendertyping();
        }
    }
    updatepfp(file:Blob):void{
        var reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = ()=>{
            fetch(this.info.api+"/users/@me",{
                method:"PATCH",
                headers:this.headers,
                body:JSON.stringify({
                    avatar:reader.result,
                })
            });
        };

    }
    updateProfile(json:{bio?:string,pronouns?:string}){
        fetch(this.info.api+"/users/@me/profile",{
            method:"PATCH",
            headers:this.headers,
            body:JSON.stringify(json)
        });
    }
    rendertyping():void{
        const typingtext=document.getElementById("typing")
        let build="";
        let showing=false;
        let i=0;
        const curtime=new Date().getTime()-5000;
        for(const thing of this.typing.keys()){
            if(this.typing.get(thing)>curtime){
                if(i!==0){
                    build+=", ";
                }
                i++;
                if(thing.nick){
                    build+=thing.nick;
                }else{
                    build+=thing.user.username;
                }
                showing=true;
            }else{
                this.typing.delete(thing);
            }
        }
        if(i>1){
            build+=" are typing";
        }else{
            build+=" is typing";
        }
        if(showing){
            typingtext.classList.remove("hidden");
            document.getElementById("typingtext").textContent=build;
        }else{
            typingtext.classList.add("hidden");
        }
    }
    showusersettings(){
        const settings=new Settings("Settings");
        this.usersettings=settings;
        {
            const userOptions=settings.addButton("User Settings",{ltr:true});
            const hypotheticalProfile=document.createElement("div");
            let file=undefined;
            let newpronouns:string=undefined;
            let newbio:string=undefined;
            let hypouser=this.user.clone();
            function regen(){
                hypotheticalProfile.textContent="";
                const hypoprofile=hypouser.buildprofile(-1,-1);

                hypotheticalProfile.appendChild(hypoprofile)
            }
            regen();
            const settingsLeft=userOptions.addOptions("");
            const settingsRight=userOptions.addOptions("");
            settingsRight.addHTMLArea(hypotheticalProfile);

            const finput=settingsLeft.addFileInput("Upload pfp:",_=>{
                if(file){
                    this.updatepfp(file)
                }
            });
            finput.watchForChange(_=>{
                if(_.length){
                    file=_[0];
                    const blob = URL.createObjectURL(file);
                    hypouser.avatar = blob;
                    hypouser.hypotheticalpfp=true;
                    regen();
                }
            });
            const pronounbox=settingsLeft.addTextInput("Pronouns",_=>{
                if(newpronouns||newbio){
                    this.updateProfile({pronouns:newpronouns,bio:newbio});
                }
            },{initText:this.user.pronouns});
            pronounbox.watchForChange(_=>{
                hypouser.pronouns=_;
                newpronouns=_;
                regen();
            });
            const bioBox=settingsLeft.addMDInput("Bio:",_=>{

            },{initText:this.user.bio.rawString});
            bioBox.watchForChange(_=>{
                newbio=_;
                hypouser.bio=new MarkDown(_,this);
                regen();
            })
        }
        {
            const tas=settings.addButton("Themes & sounds");
            {
                const themes=["Dark","WHITE","Light"];
                tas.addSelect("Theme:",_=>{
                    localStorage.setItem("theme",themes[_]);
                    setTheme();
                },themes,{defaultIndex:themes.indexOf(localStorage.getItem("theme"))});
            }
            {
                const sounds=Voice.sounds;
                tas.addSelect("Notification sound:",_=>{
                    Voice.setNotificationSound(sounds[_]);
                },sounds,{defaultIndex:sounds.indexOf(Voice.getNotificationSound())}).watchForChange(_=>{
                    Voice.noises(sounds[_]);
                })
            }

            {
                const userinfos=getBulkInfo();
                tas.addColorInput("Accent color:",_=>{
                    userinfos.accent_color=_;
                    localStorage.setItem("userinfos",JSON.stringify(userinfos));
                    document.documentElement.style.setProperty('--accent-color', userinfos.accent_color);
                },{initColor:userinfos.accent_color})
            }
        }
        {
            const security=settings.addButton("Account Security");
            if(this.mfa_enabled){
                security.addTextInput("Disable 2FA, totp code:",_=>{
                    fetch(this.info.api+"/users/@me/mfa/totp/disable",{
                        method:"POST",
                        headers:this.headers,
                        body:JSON.stringify({
                            code:_
                        })
                    }).then(r=>r.json()).then(json=>{
                        if(json.message){
                            alert(json.message);
                        }else{
                            this.mfa_enabled=false;
                            alert("2FA turned off successfully");
                        }
                    });
                })
            }else{
                security.addButtonInput("","Enable 2FA",async ()=>{
                    let secret=""
                    for(let i=0;i<18;i++){
                        secret+="ABCDEFGHIJKLMNOPQRSTUVWXYZ234567"[Math.floor(Math.random()*32)];
                    }
                    let password="";
                    let code="";
                    const addmodel=new Dialog(
                        ["vdiv",
                            ["title","2FA set up"],
                            ["text","Copy this secret into your totp(time-based one time password) app"],
                            ["text",`Your secret is: ${secret} and it's 6 digits, with a 30 second token period`],
                            ["textbox","Account password:","",function(){password=this.value}],
                            ["textbox","Code:","",function(){code=this.value}],
                            ["button","","Submit",()=>{
                                fetch(this.info.api+"/users/@me/mfa/totp/enable/",{
                                    method:"POST",
                                    headers:this.headers,
                                    body:JSON.stringify({
                                        password,
                                        code,
                                        secret
                                    })
                                }).then(r=>r.json()).then(json=>{
                                    if(json.message){
                                        alert(json.message);
                                    }else{
                                        alert("2FA set up successfully");
                                        addmodel.hide();
                                        this.mfa_enabled=true;
                                    }
                                })
                            }]

                        ]);
                    console.log("here :3")
                    addmodel.show();
                })
            }
        }
        {
            const connections=settings.addButton("Connections");
            const connectionContainer=document.createElement("div");
            connectionContainer.id="connection-container";

            fetch(this.info.api+"/connections", {
                headers: this.headers
            }).then(r => r.json()).then(json => {
                Object.keys(json).sort(key => json[key].enabled ? -1 : 1).forEach(key => {
                    const connection=json[key];

                    const container=document.createElement("div");
                    container.textContent=key.charAt(0).toUpperCase() + key.slice(1);

                    if (connection.enabled) {
                        container.addEventListener("click", async () => {
                            const connectionRes=await fetch(this.info.api+"/connections/"+key+"/authorize", {
                                headers: this.headers
                            });
                            const connectionJSON=await connectionRes.json();
                            window.open(connectionJSON.url, "_blank", "noopener noreferrer");
                        })
                    } else {
                        container.classList.add("disabled");
                        container.title="This connection has been disabled server-side.";
                    }

                    connectionContainer.appendChild(container);
                })
            })
            connections.addHTMLArea(connectionContainer);
        }
        {
            const devPortal=settings.addButton("Developer Portal");

            let appName="";
            devPortal.addTextInput("Name:", value => {
                appName=value
            });
            devPortal.addButtonInput("", "Create application", async () => {
                if (appName.trim().length == 0) {
                    return alert("Please enter a name for the application.");
                }

                const res=await fetch(this.info.api+"/applications", {
                    method: "POST",
                    headers: this.headers,
                    body: JSON.stringify({
                        name: appName
                    })
                });
                const json=await res.json();
                this.manageApplication(json.id);
            })

            const appListContainer=document.createElement("div");
            appListContainer.id="app-list-container";
            fetch(this.info.api+"/applications", {
                headers: this.headers
            }).then(r => r.json()).then(json => {
                json.forEach(application => {
                    const container=document.createElement("div");

                    if (application.cover_image || application.icon) {
                        const cover=document.createElement("img");
                        cover.crossOrigin="anonymous";
                        cover.src=this.info.cdn+"/app-icons/"+application.id+"/"+(application.cover_image || application.icon)+".png?size=256";
                        cover.alt="";
                        cover.loading="lazy";
                        container.appendChild(cover);
                    }

                    const name=document.createElement("h2");
                    name.textContent=application.name + (application.bot ? " (Bot)" : "");
                    container.appendChild(name);

                    container.addEventListener("click", async () => {
                        this.manageApplication(application.id);
                    });
                    appListContainer.appendChild(container);
                })
            })
            devPortal.addHTMLArea(appListContainer);
        }
        settings.show();
    }
    async manageApplication(appId="") {
        const res=await fetch(this.info.api+"/applications/" + appId, {
            headers: this.headers
        });
        const json=await res.json();

        const fields: any={};
        const appDialog=new Dialog(
            ["vdiv",
                ["title",
                    "Editing " + json.name
                ],
                ["vdiv",
                    ["textbox", "Application name:", json.name, event => {
                        fields.name=event.target.value;
                    }],
                    ["mdbox", "Description:", json.description, event => {
                        fields.description=event.target.value;
                    }],
                    ["vdiv",
                        json.icon ? ["img", this.info.cdn+"/app-icons/" + appId + "/" + json.icon + ".png?size=128", [128, 128]] : ["text", "No icon"],
                        ["fileupload", "Application icon:", event => {
                            const reader=new FileReader();
                            reader.readAsDataURL(event.target.files[0]);
                            reader.onload=() => {
                                fields.icon=reader.result;
                            }
                        }]
                    ]
                ],
                ["hdiv",
                    ["textbox", "Privacy policy URL:", json.privacy_policy_url || "", event => {
                        fields.privacy_policy_url=event.target.value;
                    }],
                    ["textbox", "Terms of Service URL:", json.terms_of_service_url || "", event => {
                        fields.terms_of_service_url=event.target.value;
                    }]
                ],
                ["hdiv",
                    ["checkbox", "Make bot publicly inviteable?", json.bot_public, event => {
                        fields.bot_public=event.target.checked;
                    }],
                    ["checkbox", "Require code grant to invite the bot?", json.bot_require_code_grant, event => {
                        fields.bot_require_code_grant=event.target.checked;
                    }]
                ],
                ["hdiv",
                    ["button",
                        "",
                        "Save changes",
                        async () => {
                            const updateRes=await fetch(this.info.api+"/applications/" + appId, {
                                method: "PATCH",
                                headers: this.headers,
                                body: JSON.stringify(fields)
                            });
                            if (updateRes.ok) appDialog.hide();
                            else {
                                const updateJSON=await updateRes.json();
                                alert("An error occurred: " + updateJSON.message);
                            }
                        }
                    ],
                    ["button",
                        "",
                        (json.bot ? "Manage" : "Add") + " bot",
                        async () => {
                            if (!json.bot) {
                                if (!confirm("Are you sure you want to add a bot to this application? There's no going back.")) return;

                                const updateRes=await fetch(this.info.api+"/applications/" + appId + "/bot", {
                                    method: "POST",
                                    headers: this.headers
                                });
                                const updateJSON=await updateRes.json();
                                alert("Bot token:\n" + updateJSON.token);
                            }

                            appDialog.hide();
                            this.manageBot(appId);
                        }
                    ]
                ]
            ]
        )
        appDialog.show();
    }
    async manageBot(appId="") {
        const res=await fetch(this.info.api+"/applications/" + appId, {
            headers: this.headers
        });
        const json=await res.json();
        if (!json.bot) return alert("For some reason, this application doesn't have a bot (yet).");

        const fields: any={
            username: json.bot.username,
            avatar: json.bot.avatar ? (this.info.cdn+"/app-icons/" + appId + "/" + json.bot.avatar + ".png?size=256") : ""
        };
        const botDialog=new Dialog(
            ["vdiv",
                ["title",
                    "Editing bot: " + json.bot.username
                ],
                ["hdiv",
                    ["textbox", "Bot username:", json.bot.username, event => {
                        fields.username=event.target.value
                    }],
                    ["vdiv",
                        fields.avatar ? ["img", fields.avatar, [128, 128]] : ["text", "No avatar"],
                        ["fileupload", "Bot avatar:", event => {
                            const reader=new FileReader();
                            reader.readAsDataURL(event.target.files[0]);
                            reader.onload=() => {
                                fields.avatar=reader.result;
                            }
                        }]
                    ]
                ],
                ["hdiv",
                    ["button",
                        "",
                        "Save changes",
                        async () => {
                            const updateRes=await fetch(this.info.api+"/applications/" + appId + "/bot", {
                                method: "PATCH",
                                headers: this.headers,
                                body: JSON.stringify(fields)
                            });
                            if (updateRes.ok) botDialog.hide();
                            else {
                                const updateJSON=await updateRes.json();
                                alert("An error occurred: " + updateJSON.message);
                            }
                        }
                    ],
                    ["button",
                        "",
                        "Reset token",
                        async () => {
                            if (!confirm("Are you sure you want to reset the bot token? Your bot will stop working until you update it.")) return;

                            const updateRes=await fetch(this.info.api+"/applications/" + appId + "/bot/reset", {
                                method: "POST",
                                headers: this.headers
                            });
                            const updateJSON=await updateRes.json();
                            alert("New token:\n" + updateJSON.token);
                            botDialog.hide();
                        }
                    ]
                ]
            ]
        );
        botDialog.show();
    }

    //---------- resolving members code -----------
    waitingmembers:Map<string,Map<string,(returns:memberjson|undefined)=>void>>=new Map();
    async resolvemember(id:string,guildid:string):Promise<memberjson|undefined>{
        if(!this.waitingmembers.has(guildid)){
            this.waitingmembers.set(guildid,new Map());
        }
        let res:(returns:memberjson|undefined)=>void;
        const promise:Promise<memberjson|undefined>=new Promise((r)=>{
            res=r;
        })
        this.waitingmembers.get(guildid).set(id,res);
        this.getmembers();
        return await promise;
    }
    fetchingmembers:Map<string,boolean>=new Map();
    noncemap:Map<string,(r:[memberjson[],string[]])=>void>=new Map();
    noncebuild:Map<string,[memberjson[],string[],number[]]>=new Map();
    async gotChunk(chunk:{chunk_index:number,chunk_count:number,nonce:string,not_found?:string[],members?:memberjson[]}){
        console.log(chunk);
        chunk.members??=[];
        const arr=this.noncebuild.get(chunk.nonce);
        arr[0]=arr[0].concat(chunk.members);
        if(chunk.not_found){
            arr[1]=chunk.not_found;
        }
        arr[2].push(chunk.chunk_index);
        if(arr[2].length===chunk.chunk_count){
            console.log("got through");
            this.noncebuild.delete(chunk.nonce);
            const func=this.noncemap.get(chunk.nonce)
            func([arr[0],arr[1]]);
            this.noncemap.delete(chunk.nonce);
        }
    }
    async getmembers(){
        let res:Function
        const promise=new Promise(r=>res=r);
        setTimeout(res,10);
        await promise;//allow for more to be sent at once :P
        if(this.ws){
            this.waitingmembers.forEach(async (value,guildid)=>{
                const keys=value.keys();
                if(this.fetchingmembers.has(guildid)){
                    return;
                }
                const build:string[]=[];
                for(const key of keys){build.push(key);if(build.length===100){break;}};
                if(!build.length) {
                    this.waitingmembers.delete(guildid);
                    return
                };
                let res:(r:[memberjson[],string[]])=>void;
                const promise:Promise<[memberjson[],string[]]>=new Promise((r)=>{
                    res=r;
                })
                const nonce=""+Math.floor(Math.random()*100000000000);
                this.noncemap.set(nonce,res);
                this.noncebuild.set(nonce,[[],[],[]]);
                this.ws.send(JSON.stringify({
                    op:8,
                    d:{
                        user_ids:build,
                        guild_id:guildid,
                        limit:100,
                        nonce,
                        //presences:true
                    }
                }));
                this.fetchingmembers.set(guildid,true);
                const prom=await promise;;
                const data=prom[0];
                for(const thing of data){
                    if(value.has(thing.id)){
                        value.get(thing.id)(thing);
                        value.delete(thing.id);
                    }
                }
                for(const thing of prom[1]){
                    if(value.has(thing)){
                        value.get(thing)(undefined);
                        value.delete(thing);
                    }
                }
                this.fetchingmembers.delete(guildid);
                this.getmembers();
            })
        }
    }
}
export {Localuser};
