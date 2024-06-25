class localuser{
    constructor(userinfo){
        this.token=userinfo.token;
        this.userinfo=userinfo;
        this.serverurls=this.userinfo.serverurls;
        this.initialized=false;
        this.headers={"Content-type": "application/json; charset=UTF-8",Authorization:this.userinfo.token};
    }
    gottenReady(ready){
        this.usersettings=null;
        this.initialized=true;
        this.ready=ready;
        this.guilds=[];
        this.guildids={};
        this.user=new user(ready.d.user);
        this.userinfo.username=this.user.username;
        this.userinfo.pfpsrc=this.user.getpfpsrc();
        this.status=this.ready.d.user_settings.status;
        this.channelfocus=null;
        this.lookingguild=null;
        this.guildhtml={};
        for(const thing of ready.d.guilds){
            const temp=new guild(thing,this);
            this.guilds.push(temp);
            this.guildids[temp.id]=temp;
        }
        {
            const temp=new direct(ready.d.private_channels,this);
            this.guilds.push(temp);
            this.guildids[temp.id]=temp;
        }
        console.log(ready.d.user_guild_settings.entries)
        for(const thing of ready.d.user_guild_settings.entries){
            this.guildids[thing.guild_id].notisetting(thing);
        }
        for(const thing of ready.d.merged_members){
            const guild=this.guildids[thing[0].guild_id]
            const temp=new member(thing[0],guild);
            guild.giveMember(temp);
        }
        for(const thing of ready.d.read_state.entries){
            const guild=this.resolveGuildidFromChannelID(thing.id)
            if(guild===undefined){
                continue
            }
            const guildid=guild.id;
            this.guildids[guildid].channelids[thing.channel_id].readStateInfo(thing);
        }
        this.typing=[];
    }
    outoffocus(){
        document.getElementById("servers").textContent="";
        document.getElementById("channels").textContent="";
        document.getElementById("messages").textContent="";
        this.lookingguild=null;
        this.channelfocus=null;
    }
    unload(){
        this.initialized=false;
        clearInterval(this.wsinterval);
        this.outoffocus();
        this.guilds=[];
        this.guildids={};
        this.ws.close(4000)
    }
    async initwebsocket(){
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
                    case "READY":
                        this.gottenReady(temp);
                        READY=temp;
                        this.genusersettings();
                        returny();
                        break;
                    case "MESSAGE_UPDATE":
                        if(this.initialized){
                            if(window.location.pathname.split("/")[3]==temp.d.channel_id){
                                const find=temp.d.id;
                                for(const message of messagelist){
                                    if(message.all.id===find){
                                        message.all.content=temp.d.content;
                                        message.txt.innerHTML=markdown(temp.d.content).innerHTML;
                                        break;
                                    }
                                }
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
                            const users=user.userids[temp.d.id];
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
                        const guildy=new guild(temp.d,this);
                        this.guilds.push(guildy);
                        this.guildids[guildy.id]=guildy;
                        document.getElementById("servers").insertBefore(guildy.generateGuildIcon(),document.getElementById("bottomseperator"));
                    }
                }

            }else if(temp.op===10){
                console.log("heartbeat down")
                this.wsinterval=setInterval(_=>{
                    this.ws.send(JSON.stringify({op:1,d:packets}))
                },temp.d.heartbeat_interval)
                packets=1;
            }else if(temp.op!=11){
                packets++
            }
        }catch(error){
            console.error(error)
        }

        });

        this.ws.addEventListener('close', (event) => {
            clearInterval(this.wsinterval);
            console.log('WebSocket closed');
            console.warn(event);
            if(event.code!==4000&&thisuser===this){
                this.unload();
                document.getElementById("loading").classList.remove("doneloading");
                document.getElementById("loading").classList.add("loading");
                this.initwebsocket().then(_=>{
                    thisuser.loaduser();
                    thisuser.init();
                    document.getElementById("loading").classList.add("doneloading");
                    document.getElementById("loading").classList.remove("loading");
                    console.log("done loading")
                });
            }
        });
        await promise;
        return;
    }
    resolveGuildidFromChannelID(ID){
        let resolve=this.guilds.find(guild => guild.channelids[ID])
        resolve??=undefined;
        return resolve;
    }
    updateChannel(JSON){
        this.guildids[JSON.guild_id].updateChannel(JSON);
        if(JSON.guild_id===this.lookingguild.id){
            this.loadGuild(JSON.guild_id);
        }
    }
    createChannel(JSON){
        JSON.guild_id??="@me";
        this.guildids[JSON.guild_id].createChannelpac(JSON);
        if(JSON.guild_id===this.lookingguild.id){
            this.loadGuild(JSON.guild_id);
        }
    }
    delChannel(JSON){
        JSON.guild_id??="@me";
        this.guildids[JSON.guild_id].delChannel(JSON);
        if(JSON.guild_id===this.lookingguild.id){
            this.loadGuild(JSON.guild_id);
        }
    }
    init(){
        const location=window.location.href.split("/");
        if(location[3]==="channels"){
            const guild=this.loadGuild(location[4]);
            guild.loadChannel(location[5]);
            this.channelfocus=guild.channelids[location[5]];
        }
        this.buildservers();
    }
    loaduser(){
        document.getElementById("username").textContent=this.user.username
        document.getElementById("userpfp").src=this.user.getpfpsrc()
        document.getElementById("status").textContent=this.status;
    }
    isAdmin(){
        return this.lookingguild.isAdmin();
    }
    loadGuild(id){
        let guild=this.guildids[id];
        if(!guild){
            guild=this.guildids["@me"];
        }
        this.lookingguild=guild;
        document.getElementById("serverName").textContent=guild.properties.name;
        //console.log(this.guildids,id)
        document.getElementById("channels").innerHTML="";
        document.getElementById("channels").appendChild(guild.getHTML());
        return guild;
    }
    buildservers(){
        const serverlist=document.getElementById("servers");//

        const div=document.createElement("div");
        div.textContent="⌂";
        div.classList.add("home","servericon")
        div.all=this.guildids["@me"];
        serverlist.appendChild(div)
        div.onclick=function(){
            this.all.loadGuild();
            this.all.loadChannel();
        }
        const sentdms=document.createElement("div");
        sentdms.classList.add("sentdms");
        serverlist.append(sentdms);
        sentdms.id="sentdms";

        const br=document.createElement("hr")
        br.classList.add("lightbr");
        serverlist.appendChild(br)
        for(const thing of this.guilds){
            if(thing instanceof direct){
                thing.unreaddms();
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

        }
        this.unreads();
    }
    createGuild(){
        let inviteurl="";
        const error=document.createElement("span");

        const full=new fullscreen(["tabs",[
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
                            fetch(info.api.toString()+"/v9/invites/"+parsed,{
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
    messageCreate(messagep){
        messagep.d.guild_id??="@me";
        this.guildids[messagep.d.guild_id].channelids[messagep.d.channel_id].messageCreate(messagep,this.channelfocus.id===messagep.d.channel_id);
        this.unreads();
    }
    unreads(){
        console.log(this.guildhtml)
        for(const thing of this.guilds){
            if(thing.id==="@me"){continue;}
            thing.unreads(this.guildhtml[thing.id]);
        }
    }
    typeingStart(typing){
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
    updatepfp(file){
        var reader = new FileReader();
        reader.readAsDataURL(file);
        console.log(this.headers);
        reader.onload = ()=>{
            fetch(info.api.toString()+"/v9/users/@me",{
                method:"PATCH",
                headers:this.headers,
                body:JSON.stringify({
                    avatar:reader.result,
                })
            });
            console.log(reader.result);
        };

    }
    updatepronouns(pronouns){
        fetch(info.api.toString()+"/v9/users/@me/profile",{
            method:"PATCH",
            headers:this.headers,
            body:JSON.stringify({
                pronouns:pronouns,
            })
        });
    }
    updatebio(bio){
        fetch(info.api.toString()+"/v9/users/@me/profile",{
            method:"PATCH",
            headers:this.headers,
            body:JSON.stringify({
                bio:bio,
            })
        });
    }
    rendertyping(){
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
    genusersettings(){
        const hypothetcialprofie=document.createElement("div");
        let file=null;
        let newprouns=null;
        let newbio=null;
        let hypouser=new user(thisuser.user,true);
        function regen(){
            hypothetcialprofie.textContent="";
            const hypoprofile=buildprofile(-1,-1,hypouser);

            hypothetcialprofie.appendChild(hypoprofile)
        }
        regen();
        this.usersettings=new fullscreen(
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
                ["textbox","Pronouns:",thisuser.user.pronouns,function(e){
                    console.log(this.value);
                    hypouser.pronouns=this.value;
                    newprouns=this.value;
                    regen();
                }],
                ["mdbox","Bio:",thisuser.user.bio,function(e){
                    console.log(this.value);
                    hypouser.bio=this.value;
                    newbio=this.value;
                    regen();
                }],
                ["button","update user content:","submit",function(){
                    if(file!==null){
                        thisuser.updatepfp(file);
                    }
                    if(newprouns!==null){
                        thisuser.updatepronouns(newprouns);
                    }
                    if(newbio!==null){
                        thisuser.updatebio(newbio);
                    }
                }],
                ["select","Theme:",["Dark","Light","WHITE"],e=>{
                    localStorage.setItem("theme",["Dark","Light","WHITE"][e.target.selectedIndex]);
                    setTheme();
                },["Dark","Light","WHITE"].indexOf(localStorage.getItem("theme"))],
                ["select","Notification sound:",voice.sounds,e=>{
                    voice.setNotificationSound(voice.sounds[e.target.selectedIndex]);
                    voice.noises(voice.sounds[e.target.selectedIndex]);
                },voice.sounds.indexOf(voice.getNotificationSound())]
            ],
            ["vdiv",
                ["html",hypothetcialprofie]
            ]
        ],_=>{},function(){
            hypouser=new user(thisuser.user);
            regen();
            file=null;
            newprouns=null;
            newbio=null;
        })
    }
}
