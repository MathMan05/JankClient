import {Guild} from "./guild.js";
import {Channel} from "./channel.js";
import {Direct} from "./direct.js";
import {Voice} from "./audio.js";
import {User} from "./user.js";
import {Member} from "./member.js";
import {markdown} from "./markdown.js";
import {Fullscreen} from "./fullscreen.js";
import {setTheme, Specialuser} from "./login.js";
class Localuser{
    packets:number;
    token:string;
    userinfo:Specialuser;
    serverurls;
    initialized:boolean;
    info;
    headers:{"Content-type":string,Authorization:string};
    usersettings:Fullscreen;
    ready;
    guilds:Guild[];
    guildids:{ [key: string]: Guild };
    user:User;
    status:string;
    channelfocus:Channel;
    lookingguild:Guild;
    guildhtml:Record<string, HTMLDivElement>;
    ws:WebSocket;
    typing:[string,number][];
    wsinterval:NodeJS.Timeout;
    constructor(userinfo:Specialuser){
        this.packets=1;
        this.token=userinfo.token;
        this.userinfo=userinfo;
        this.serverurls=this.userinfo.serverurls;
        this.initialized=false;
        this.info=this.serverurls;
        this.headers={"Content-type": "application/json; charset=UTF-8",Authorization:this.userinfo.token};
    }
    gottenReady(ready):void{
        this.usersettings=null;
        this.initialized=true;
        this.ready=ready;
        this.guilds=[];
        this.guildids={};
        this.user=new User(ready.d.user,this);
        this.userinfo.username=this.user.username;
        this.userinfo.pfpsrc=this.user.getpfpsrc();
        this.status=this.ready.d.user_settings.status;
        this.channelfocus=null;
        this.lookingguild=null;
        this.guildhtml={};
        const members={};
        for(const thing of ready.d.merged_members){
            members[thing[0].guild_id]=thing[0];
        }

        for(const thing of ready.d.guilds){
            const temp=new Guild(thing,this,members[thing.id]);
            this.guilds.push(temp);
            this.guildids[temp.id]=temp;
        }
        {
            const temp=new Direct(ready.d.private_channels,this);
            this.guilds.push(temp);
            this.guildids[temp.id]=temp;
        }
        console.log(ready.d.user_guild_settings.entries);


        for(const thing of ready.d.user_guild_settings.entries){
            this.guildids[thing.guild_id].notisetting(thing);
        }

        for(const thing of ready.d.read_state.entries){
            const channel=this.resolveChannelFromID(thing.id);
            if(!channel){continue;}
            const guild=channel.guild;
            if(guild===undefined){
                continue
            }
            const guildid=guild.id;
            this.guildids[guildid].channelids[thing.channel_id].readStateInfo(thing);
        }
        this.typing=[];
    }
    outoffocus():void{
        document.getElementById("servers").textContent="";
        document.getElementById("channels").textContent="";
        document.getElementById("messages").textContent="";
        this.lookingguild=null;
        this.channelfocus=null;
    }
    unload():void{
        this.initialized=false;
        clearInterval(this.wsinterval);
        this.outoffocus();
        this.guilds=[];
        this.guildids={};
        this.ws.close(4000)
    }
    async initwebsocket():Promise<void>{
        let returny=null
        const promise=new Promise((res)=>{returny=res});
        this.ws = new WebSocket(this.serverurls.gateway.toString());
        this.ws.addEventListener('open', (event) => {
        console.log('WebSocket connected');
        this.ws.send(JSON.stringify({
            "op": 2,
            "d": {
                "token":this.token,
                "capabilities": 16381,
                "properties": {
                    "browser": "Jank Client",
                    "client_build_number": 0,
                    "release_channel": "Custom",
                    "browser_user_agent": navigator.userAgent
                },
                "compress": false,
                "presence": {
                    "status": "online",
                    "since": new Date().getTime(),
                    "activities": [],
                    "afk": false
                }
            }
        }))
        });

        this.ws.addEventListener('message', (event) => {


        try{
            const temp=JSON.parse(event.data);
            console.log(temp)
            if(temp.op==0){
                switch(temp.t){
                    case "MESSAGE_CREATE":
                        if(this.initialized){
                            this.messageCreate(temp);
                        }
                        break;
                    case "MESSAGE_DELETE":
                        console.log(temp.d);
                        this.guildids[temp.d.guild_id].channelids[temp.d.channel_id].messageids[temp.d.id].deleteEvent();
                        break;
                    case "READY":
                        this.gottenReady(temp);
                        this.genusersettings();
                        returny();
                        break;
                    case "MESSAGE_UPDATE":
                        if(this.initialized){
                            if(this.channelfocus.id===temp.d.channel_id){
                                const find=temp.d.id;
                                const messagelist=document.getElementById("messages").children;
                                for(const message of messagelist){
                                    const all = message["all"];
                                    if(all.id===find){
                                        all.content=temp.d.content;
                                        message["txt"].innerHTML=markdown(temp.d.content).innerHTML;
                                        break;
                                    }
                                }
                            }else{
                                this.resolveChannelFromID(temp.d.channel_id).messages.find(e=>e.id===temp.d.channel_id).content=temp.d.content;
                            }
                        }
                        break;
                    case "TYPING_START":
                        if(this.initialized){
                            this.typeingStart(temp);
                        }
                        break;
                    case "USER_UPDATE":
                        if(this.initialized){
                            const users=User.userids[temp.d.id];
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
                        const guildy=this.guildids[temp.d.id];
                        delete this.guildids[temp.d.id];
                        this.guilds.splice(this.guilds.indexOf(guildy),1);
                        guildy.html.remove();
                        break;
                    }
                    case "GUILD_CREATE":
                    {
                        const guildy=new Guild(temp.d,this,this.user);
                        this.guilds.push(guildy);
                        this.guildids[guildy.id]=guildy;
                        document.getElementById("servers").insertBefore(guildy.generateGuildIcon(),document.getElementById("bottomseperator"));
                    }
                }

            }else if(temp.op===10){
                console.log("heartbeat down")
                this.wsinterval=setInterval(_=>{
                    this.ws.send(JSON.stringify({op:1,d:this.packets}))
                },temp.d.heartbeat_interval)
                this.packets=1;
            }else if(temp.op!=11){
                this.packets++
            }
        }catch(error){
            console.error(error)
        }

        });

        this.ws.addEventListener('close', (event) => {
            clearInterval(this.wsinterval);
            console.log('WebSocket closed');
            console.warn(event);
            if(event.code!==4000){
                this.unload();
                document.getElementById("loading").classList.remove("doneloading");
                document.getElementById("loading").classList.add("loading");
                this.initwebsocket().then(_=>{
                    this.loaduser();
                    this.init();
                    document.getElementById("loading").classList.add("doneloading");
                    document.getElementById("loading").classList.remove("loading");
                    console.log("done loading")
                });
            }
        });
        await promise;
        return;
    }
    resolveChannelFromID(ID:string):Channel{
        let resolve=this.guilds.find(guild => guild.channelids[ID]);
        if(resolve){
            return resolve.channelids[ID];
        }
        return undefined;
    }
    updateChannel(JSON):void{
        this.guildids[JSON.guild_id].updateChannel(JSON);
        if(JSON.guild_id===this.lookingguild.id){
            this.loadGuild(JSON.guild_id);
        }
    }
    createChannel(JSON):void{
        JSON.guild_id??="@me";
        this.guildids[JSON.guild_id].createChannelpac(JSON);
        if(JSON.guild_id===this.lookingguild.id){
            this.loadGuild(JSON.guild_id);
        }
    }
    delChannel(JSON):void{
        JSON.guild_id??="@me";
        this.guildids[JSON.guild_id].delChannel(JSON);

        if(JSON.guild_id===this.lookingguild.id){
            this.loadGuild(JSON.guild_id);
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
        let guild=this.guildids[id];
        if(!guild){
            guild=this.guildids["@me"];
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
        const div=document.createElement("div");

        div.textContent="⌂";
        div.classList.add("home","servericon")
        div["all"]=this.guildids["@me"];
        this.guildids["@me"].html=outdiv;
        const unread=document.createElement("div");
        unread.classList.add("unread");
        outdiv.append(unread);
        outdiv.appendChild(div);

        outdiv.classList.add("servernoti")
        serverlist.append(outdiv);
        div.onclick=function(){
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
            br.id="bottomseperator";

            const div=document.createElement("div");
            div.textContent="+";
            div.classList.add("addserver","servericon")
            serverlist.appendChild(div)
            div.onclick=_=>{
                console.log("clicked :3")
                this.createGuild();
            }

            const guildDiscoveryContainer=document.createElement("div");
            guildDiscoveryContainer.textContent="🧭";
            guildDiscoveryContainer.classList.add("home","servericon");
            serverlist.appendChild(guildDiscoveryContainer);
            guildDiscoveryContainer.addEventListener("click", ()=>{
                this.guildDiscovery();
            });

        }
        this.unreads();
    }
    createGuild(){
        let inviteurl="";
        const error=document.createElement("span");

        const full=new Fullscreen(["tabs",[
            ["Join using invite",[
                "vdiv",
                    ["textbox",
                        "Invite Link/Code",
                        "",
                        function(){
                            console.log(this)
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
                            fetch(this.info.api.toString()+"/v9/invites/"+parsed,{
                                method:"POST",
                                headers:this.headers,
                            }).then(r=>r.json()).then(_=>{
                                console.log(_);
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
        content.textContent="Loading...";
        const full=new Fullscreen(["html", content]);
        full.show();

        const res=await fetch(this.info.api.toString()+"/v9/discoverable-guilds?limit=16", {
            headers: this.headers
        });
        const json=await res.json();

        content.innerHTML="";
        const title=document.createElement("h2");
        title.textContent="Guild discovery ("+json.total+" entries)";
        content.appendChild(title);

        const guilds=document.createElement("div");
        guilds.id="discovery-guild-content";

        json.guilds.forEach(guild=>{
            const content=document.createElement("div");
            content.classList.add("discovery-guild");

            if(guild.banner) {
                const banner=document.createElement("img");
                banner.classList.add("banner");
                banner.crossOrigin="anonymous";
                banner.src=this.info.api.toString()+"/v9/icons/"+guild.id+"/"+guild.banner+".png?size=256";
                banner.alt="";
                content.appendChild(banner);
            }

            const nameContainer=document.createElement("div");
            nameContainer.classList.add("flex");
            const img=document.createElement("img");
            img.classList.add("icon");
            img.crossOrigin="anonymous";
            img.src=this.info.api.toString()+"/v9/"+(guild.icon ? ("icons/"+guild.id+"/"+guild.icon+".png?size=48") : "embed/avatars/3.png");
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
                const joinRes=await fetch(this.info.api.toString()+"/v9/guilds/"+guild.id+"/members/@me", {
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
        this.guildids[messagep.d.guild_id].channelids[messagep.d.channel_id].messageCreate(messagep);
        this.unreads();
    }
    unreads():void{
        console.log(this.guildhtml)
        for(const thing of this.guilds){
            if(thing.id==="@me"){continue;}
            thing.unreads(this.guildhtml[thing.id]);
        }
    }
    typeingStart(typing):void{
        if(this.channelfocus.id===typing.d.channel_id){
            const memb=typing.d.member;
            let name;
            if(memb.id===this.user.id){
                console.log("you is typing")
                return;
            }
            console.log("user is typing and you should see it");
            if(memb.nick){
                name=memb.nick;
            }else{
                name=memb.user.username;
            }
            let already=false;
            for(const thing of this.typing){
                if(thing[0]===name){
                    thing[1]=new Date().getTime();
                    already=true;
                    break;
                }
            }
            if(!already){
                this.typing.push([name,new Date().getTime()]);
            }
            setTimeout(this.rendertyping.bind(this),10000);
            this.rendertyping();
        }
    }
    updatepfp(file:Blob):void{
        var reader = new FileReader();
        reader.readAsDataURL(file);
        console.log(this.headers);
        reader.onload = ()=>{
            fetch(this.info.api.toString()+"/v9/users/@me",{
                method:"PATCH",
                headers:this.headers,
                body:JSON.stringify({
                    avatar:reader.result,
                })
            });
            console.log(reader.result);
        };

    }
    updatepronouns(pronouns:string):void{
        fetch(this.info.api.toString()+"/v9/users/@me/profile",{
            method:"PATCH",
            headers:this.headers,
            body:JSON.stringify({
                pronouns:pronouns,
            })
        });
    }
    updatebio(bio:string):void{
        fetch(this.info.api.toString()+"/v9/users/@me/profile",{
            method:"PATCH",
            headers:this.headers,
            body:JSON.stringify({
                bio:bio,
            })
        });
    }
    rendertyping():void{
        const typingtext=document.getElementById("typing")
        let build="";
        const array2=[];
        let showing=false;
        let i=0;
        for(const thing of this.typing){
            i++;
            if(thing[1]>new Date().getTime()-5000){
                build+=thing[0];
                array2.push(thing);
                showing=true;
                if(i!==this.typing.length){
                    build+=",";
                }
            }
        }
        if(i>1){
            build+=" are typing";
        }else{
            build+=" is typing";
        }
        console.log(typingtext.classList);
        if(showing){
            typingtext.classList.remove("hidden");
            document.getElementById("typingtext").textContent=build;
        }else{
            typingtext.classList.add("hidden");
        }
    }
    genusersettings():void{
        const hypothetcialprofie=document.createElement("div");
        let file=null;
        let newprouns=null;
        let newbio=null;
        let hypouser=new User(this.user,this,true);
        function regen(){
            hypothetcialprofie.textContent="";
            const hypoprofile=hypouser.buildprofile(-1,-1);

            hypothetcialprofie.appendChild(hypoprofile)
        }
        regen();
        this.usersettings=new Fullscreen(
        ["hdiv",
            ["vdiv",
                ["fileupload","upload pfp:",function(e){
                    console.log(this.files[0])
                    file=this.files[0];
                    const blob = URL.createObjectURL(this.files[0]);
                    hypouser.avatar = blob;
                    hypouser.hypotheticalpfp=true;
                    regen();
                }],
                ["textbox","Pronouns:",this.user.pronouns,function(e){
                    console.log(this.value);
                    hypouser.pronouns=this.value;
                    newprouns=this.value;
                    regen();
                }],
                ["mdbox","Bio:",this.user.bio,function(e){
                    console.log(this.value);
                    hypouser.bio=this.value;
                    newbio=this.value;
                    regen();
                }],
                ["button","update user content:","submit",function(){
                    if(file!==null){
                        this.updatepfp(file);
                    }
                    if(newprouns!==null){
                        this.updatepronouns(newprouns);
                    }
                    if(newbio!==null){
                        this.updatebio(newbio);
                    }
                }],
                ["select","Theme:",["Dark","Light","WHITE"],e=>{
                    localStorage.setItem("theme",["Dark","Light","WHITE"][e.target.selectedIndex]);
                    setTheme();
                },["Dark","Light","WHITE"].indexOf(localStorage.getItem("theme"))],
                ["select","Notification sound:",Voice.sounds,e=>{
                    Voice.setNotificationSound(Voice.sounds[e.target.selectedIndex]);
                    Voice.noises(Voice.sounds[e.target.selectedIndex]);
                },Voice.sounds.indexOf(Voice.getNotificationSound())]
            ],
            ["vdiv",
                ["html",hypothetcialprofie]
            ]
        ],_=>{},function(){
            console.log(this);
            hypouser=new User(this.user,this);
            regen();
            file=null;
            newprouns=null;
            newbio=null;
        }.bind(this))
    }
}
export {Localuser};
