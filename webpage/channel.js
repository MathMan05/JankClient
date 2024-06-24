"use strict"
class channel{
    static contextmenu=new contextmenu("channel menu");
    static setupcontextmenu(){
        channel.contextmenu.addbutton("Copy channel id",function(){
            console.log(this)
            navigator.clipboard.writeText(this.id);
        });

        channel.contextmenu.addbutton("Mark as read",function(){
            console.log(this)
            this.readbottom();
        });

        channel.contextmenu.addbutton("Delete channel",function(){
            console.log(this)
            this.deleteChannel();
        },null,_=>{console.log(_);return _.isAdmin()});

        channel.contextmenu.addbutton("Edit channel",function(){
            editchannelf(this);
        },null,_=>{return _.isAdmin()});
    }
    constructor(JSON,owner){

        if(JSON===-1){
            return;
        }
        this.type=JSON.type;
        this.owner=owner;
        this.headers=this.owner.headers;
        this.messages=[];
        this.name=JSON.name;
        this.id=JSON.id;
        this.parent_id=JSON.parent_id;
        this.parrent=null;
        this.children=[];
        this.guild_id=JSON.guild_id;
        this.messageids={};
        this.permission_overwrites=JSON.permission_overwrites;
        this.topic=JSON.topic;
        this.nsfw=JSON.nsfw;
        this.position=JSON.position;
        this.lastreadmessageid=null;
        this.lastmessageid=JSON.last_message_id;
    }
    isAdmin(){
        return this.guild.isAdmin();
    }
    get guild(){
        return this.owner;
    }
    get localuser(){
        return this.guild.localuser;
    }
    readStateInfo(json){
        this.lastreadmessageid=json.last_message_id;
        this.mentions=json.mention_count;
        this.mentions??=0;
        this.lastpin=json.last_pin_timestamp;
    }
    get hasunreads(){
        return this.lastmessageid!==this.lastreadmessageid&&this.type!==4;
    }
    get canMessage(){
        for(const thing of this.permission_overwrites){
            if(this.guild.hasRole(thing.id)&&thing.deny&(1<<11)){
                return false;
            }
        }
        return true;
    }
    sortchildren(){
       this.children.sort((a,b)=>{return a.position-b.position});
    }
    resolveparent(guild){
        this.parrent=guild.channelids[this.parent_id];
        this.parrent??=null;
        if(this.parrent!==null){
            this.parrent.children.push(this);
        }
        return this.parrent===null;
    }
    calculateReorder(){
        let position=-1;
        let build=[];
        for(const thing of this.children){
            const thisthing={id:thing.id}
            if(thing.position<position){
                thing.position=thisthing.position=position+1;
            }
            position=thing.position;
            if(thing.move_id&&thing.move_id!==thing.parent_id){
                thing.parent_id=thing.move_id;
                thisthing.parent_id=thing.parent_id;
                thing.move_id=undefined;
                console.log(this.guild.channelids[thisthing.parent_id]);
            }
            if(thisthing.position||thisthing.parent_id){
                build.push(thisthing);
            }
        }
        return build;
    }
    static dragged=[];
    createguildHTML(admin=false){
        const div=document.createElement("div");
        div.all=this;
        div.draggable=admin;
        div.addEventListener("dragstart",(e)=>{channel.dragged=[this,div];e.stopImmediatePropagation()})
        div.addEventListener("dragend",()=>{channel.dragged=[]})
        if(this.type===4){
            this.sortchildren();
            const caps=document.createElement("div");

            const decdiv=document.createElement("div");
            const decoration=document.createElement("b");
            decoration.textContent="▼"
            decdiv.appendChild(decoration)

            const myhtml=document.createElement("p2");
            myhtml.textContent=this.name;
            decdiv.appendChild(myhtml);
            caps.appendChild(decdiv);
            const childrendiv=document.createElement("div");
            if(admin){
                const addchannel=document.createElement("span");
                addchannel.textContent="+";
                addchannel.classList.add("addchannel");
                caps.appendChild(addchannel);
                addchannel.onclick=function(){
                    createchannels(this.createChannel.bind(this));
                }.bind(this);
                this.coatDropDiv(decdiv,this,childrendiv);
            }
            div.appendChild(caps)
            caps.classList.add("capsflex")
            decdiv.classList.add("channeleffects");
            decdiv.classList.add("channel");

            channel.contextmenu.bind(decdiv,this);
            decdiv.all=this;


            for(const channel of this.children){
                childrendiv.appendChild(channel.createguildHTML(admin));
            }
            childrendiv.classList.add("channels");
            setTimeout(_=>{childrendiv.style.height = childrendiv.scrollHeight + 'px';},100)
            decdiv.onclick=function(){
                if(decoration.textContent==="▼"){//
                    decoration.textContent="▲";
                    //childrendiv.classList.add("colapsediv");
                    childrendiv.style.height = '0px';
                }else{
                    decoration.textContent="▼";
                    //childrendiv.classList.remove("colapsediv")
                    childrendiv.style.height = childrendiv.scrollHeight + 'px';
                }
            }
            div.appendChild(childrendiv);
        }else{
            div.classList.add("channel");
            if(this.hasunreads){
                div.classList.add("cunread");
            }
            channel.contextmenu.bind(div,this);
            if(admin){this.coatDropDiv(div,this);}
            div.all=this;
            const myhtml=document.createElement("span");
            myhtml.textContent=this.name;
            if(this.type===0){
                const decoration=document.createElement("b");
                decoration.textContent="#"
                div.appendChild(decoration)
                decoration.classList.add("space");
            }else if(this.type===2){//
                const decoration=document.createElement("b");
                decoration.textContent="🕪"
                div.appendChild(decoration)
                decoration.classList.add("spacee");
            }else if(this.type===5){//
                const decoration=document.createElement("b");
                decoration.textContent="📣"
                div.appendChild(decoration)
                decoration.classList.add("spacee");
            }else{
                console.log(this.type)
            }
            div.appendChild(myhtml);
            div.myinfo=this;
            div.onclick=function(){
                this.myinfo.getHTML();
            }
        }
        return div;
    }
    get myhtml(){
        const search=document.getElementById("channels").children[0].children
        if(this.guild!==this.localuser.lookingguild){
            return null
        }else if(this.parrent){
            for(const thing of search){
                if(thing.all===this.parrent){
                    for(const thing2 of thing.children[1].children){
                        if(thing2.all===this){
                            return thing2;
                        }
                    }
                }
            }
        }else{
            for(const thing of search){
                if(thing.all===this){
                    return thing;
                }
            }
        }
        return null;
    }
    readbottom(){
        if(!this.hasunreads){
            return;
        }
        fetch(info.api.toString()+"/v9/channels/"+this.id+"/messages/"+this.lastmessageid+"/ack",{
            method:"POST",
            headers:this.headers,
            body:JSON.stringify({})
        });
        this.lastreadmessageid=this.lastmessageid;
        this.guild.unreads();
        if(this.myhtml!==null){
            this.myhtml.classList.remove("cunread");
        }
    }
    coatDropDiv(div,that,container=false){
        div.addEventListener("dragenter", (event) => {
            console.log("enter")
            event.preventDefault();
        });

        div.addEventListener("dragover", (event) => {
            event.preventDefault();
        });

        div.addEventListener("drop", (event) => {
            const that=channel.dragged[0];
            event.preventDefault();
            if(container){
                that.move_id=this.id;
                if(that.parrent){
                    that.parrent.children.splice(that.parrent.children.indexOf(that),1);
                }
                that.parrent=this;
                container.prepend(channel.dragged[1]);
                this.children.unshift(that);
            }else{
                console.log(this,channel.dragged);
                that.move_id=this.parent_id;
                if(that.parrent){
                    that.parrent.children.splice(that.parrent.children.indexOf(that),1);
                }else{
                    this.guild.headchannels.splice(this.guild.headchannels.indexOf(that),1);
                }
                that.parrent=this.parrent;
                if(that.parrent){
                    const build=[];
                    for(let i=0;i<that.parrent.children.length;i++){
                        build.push(that.parrent.children[i])
                        if(that.parrent.children[i]===this){
                            build.push(that);
                        }
                    }
                    that.parrent.children=build;
                }else{
                    const build=[];
                    for(let i=0;i<this.guild.headchannels.length;i++){
                        build.push(this.guild.headchannels[i])
                        if(this.guild.headchannels[i]===this){
                            build.push(that);
                        }
                    }
                    this.guild.headchannels=build;
                }
                div.after(channel.dragged[1]);
            }
            this.guild.calculateReorder()
        });

        return div;
    }
    createChannel(name,type){
        fetch(info.api.toString()+"/guilds/"+this.guild.id+"/channels",{
            method:"Post",
            headers:this.headers,
            body:JSON.stringify({
                name: name,
                type: type,
                parent_id: this.id,
                permission_overwrites:[],
            })
        })
    }
    editChannel(){
        let name=this.name;
        let topic=this.topic;
        let nsfw=this.nsfw;
        const thisid=this.id;
        const thistype=this.type;
        const full=new fullscreen(
        ["hdiv",
            ["vdiv",
                ["textbox","Channel name:",this.name,function(){name=this.value}],
                ["mdbox","Channel topic:",this.topic,function(){topic=this.value}],
                ["checkbox","NSFW Channel",this.nsfw,function(){nsfw=this.checked}],
                ["button","","submit",function(){
                    fetch(info.api.toString()+"/v9/channels/"+thisid,{
                        method:"PATCH",
                        headers:this.headers,
                        body:JSON.stringify({
                            "name": name,
                            "type": thistype,
                            "topic": topic,
                            "bitrate": 64000,
                            "user_limit": 0,
                            "nsfw": nsfw,
                            "flags": 0,
                            "rate_limit_per_user": 0
                        })
                    })
                    console.log(full)
                    full.hide();
                }]
            ]

        ]);
        full.show();
        console.log(full)
    }
    deleteChannel(){
        fetch(info.api.toString()+"/v9/channels/"+this.id,{
            method:"DELETE",
            headers:this.headers
        })
    }
    getHTML(){
        if(this.guild!==this.localuser.lookingguild){
            this.guild.loadGuild();
        }
        this.guild.prevchannel=this;
        this.localuser.channelfocus=this;
        this.putmessages();
        history.pushState(null, null,"/channels/"+this.guild_id+"/"+this.id);
        document.getElementById("channelname").textContent="#"+this.name;
    }
    putmessages(){
        const out=this;
        fetch(info.api.toString()+"/channels/"+this.id+"/messages?limit=100",{
        method: 'GET',
        headers: this.headers,
        }).then((j)=>{return j.json()}).then(responce=>{
            messages.innerHTML = '';
            //responce.reverse()
            messagelist=[];
            for(const thing of responce){
                const messager=new cmessage(thing,this)
                if(out.messageids[messager.id]==undefined){
                    out.messageids[messager.id]=messager;
                    out.messages.push(messager);
                }
            }
            out.buildmessages();
        })
    }
    delChannel(JSON){
        const build=[];
        for(const thing of this.children){
            if(thing.id!==JSON.id){
                build.push(thing)
            }
        }
        this.children=build;
    }
    async grabmoremessages(){
        if(this.messages.length===0||this.allthewayup){
            return;
        }
        const out=this;

        await fetch(info.api.toString()+"/channels/"+this.id+"/messages?before="+this.messages[this.messages.length-1].id+"&limit=100",{
            method:"GET",
            headers:this.headers
        }).then((j)=>{return j.json()}).then(responce=>{
            //messages.innerHTML = '';
            //responce.reverse()
            let next
            if(responce.length===0){
                out.allthewayup=true;
            }
            for(const i in responce){
                let messager
                if(!next){
                    messager=new cmessage(responce[i],this)
                }else{
                    messager=next;
                }
                if(responce[+i+1]!==undefined){
                    next=new cmessage(responce[+i+1],this);
                }else{
                    next=undefined;
                    console.log("ohno",+i+1)
                }
                if(out.messageids[messager.id]==undefined){
                    out.messageids[messager.id]=messager;
                    out.buildmessage(messager,next);
                    out.messages.push(messager);
                }else{
                    console.log("How???")
                }
            }
            //out.buildmessages();
        })
        return;
    }
    buildmessage(message,next){
        const built=message.buildhtml(next);
        messages.prepend(built);
    }
    buildmessages(){
        for(const i in this.messages){
            const prev=this.messages[(+i)+1];
            const built=this.messages[i].buildhtml(prev);
            messages.prepend(built);
        }
        document.getElementById("messagecontainer").scrollTop = document.getElementById("messagecontainer").scrollHeight;

    }
    updateChannel(JSON){
        this.type=JSON.type;
        this.name=JSON.name;
        this.parent_id=JSON.parent_id;
        this.parrent=null;
        this.children=[];
        this.guild_id=JSON.guild_id;
        this.messageids={};
        this.permission_overwrites=JSON.permission_overwrites;
        this.topic=JSON.topic;
        this.nsfw=JSON.nsfw;
    }
    typingstart(){
        if(this.typing>new Date().getTime()){
            return;
        }
        this.typing=new Date().getTime()+6000;
        fetch(info.api.toString()+"/channels/"+this.id+"/typing",{
            method:"POST",
            headers:this.headers
        })
    }
    get notification(){
        let notinumber=this.message_notifications;
        if(+notinumber===3){notinumber=null;}
        notinumber??=this.guild.message_notifications;
        switch(+notinumber){
            case 0:
                return "all";
            case 1:
                return "mentions";
            case 2:
                return "none";
            case 3:
                return "default";
        }
    }
    async sendMessage(content,{attachments=[],embeds=[],replyingto=false}){
        let replyjson=false;
        if(replyingto){
            replyjson=
            {
                "guild_id":replyingto.guild.id,
                "channel_id": replyingto.channel.id,
                "message_id": replyingto.id,
            };
        }
        if(attachments.length===0){
            const body={
                content:content,
                nonce:Math.floor(Math.random()*1000000000)
            };
            if(replyjson){
                body.message_reference=replyjson;
            }
            console.log(body)
            return await fetch(info.api.toString()+"/channels/"+this.id+"/messages",{
                method:"POST",
                headers:this.headers,
                body:JSON.stringify(body)
            })
        }else{
            const formData = new FormData();
            const body={
                content:content,
                nonce:Math.floor(Math.random()*1000000000),
            }
            if(replyjson){
                body.message_reference=replyjson;
            }
            formData.append('payload_json', JSON.stringify(body));
            for(const i in attachments){
                console.log(attachments[i])
                formData.append("files["+i+"]",attachments[i]);
            }
            return await fetch(info.api.toString()+"/channels/"+this.id+"/messages", {
                method: 'POST',
                body: formData,
                headers:{"Authorization":this.headers.Authorization}
            });
        }
    }
    messageCreate(messagep,focus){
        const messagez=new cmessage(messagep.d,this);
        this.lastmessageid=messagez.id;
        if(messagez.author===this.localuser.user){
            this.lastreadmessageid=messagez.id;
            if(this.myhtml){
                this.myhtml.classList.remove("cunread");
            }
        }else{
            if(this.myhtml){
                this.myhtml.classList.add("cunread");
            }
        }
        this.guild.unreads();
        this.messages.unshift(messagez);
        const scrolly=document.getElementById("messagecontainer");
        this.messageids[messagez.id]=messagez;
        if(this.localuser.lookingguild.prevchannel===this){
            var shouldScroll=scrolly.scrollTop+scrolly.clientHeight>scrolly.scrollHeight-20;
            messages.appendChild(messagez.buildhtml(this.messages[1]));
        }
        if(shouldScroll){
                scrolly.scrollTop = scrolly.scrollHeight;
        }
        if(messagez.author===this.localuser.user){
            return;
        }
        if(this.localuser.lookingguild.prevchannel===this&&document.hasFocus()){
            return;
        }
        if(this.notification==="all"){
            this.notify(messagez);
        }else if(this.notification==="mentions"&&messagez.mentionsuser(this.localuser.user)){
            this.notify(messagez);
        }
    }
    notititle(message){
       return message.author.username+" > "+this.guild.properties.name+" > "+this.name;
    }
    notify(message,deep=0){
        voice.noises(voice.getNotificationSound());
        if (!("Notification" in window)) {

        } else if (Notification.permission === "granted") {
            let noticontent=markdown(message.content).textContent;
            if(message.embeds[0]){
                noticontent||=message.embeds[0].json.title;
                noticontent||=markdown(message.embeds[0].json.description).textContent;
            }
            noticontent||="Blank Message";
            let imgurl=null;
            const images=message.getimages();
            if(images.length){
                const image = images[0];
                imgurl||=image.proxy_url;
                imgurl||=image.url;
            }
            const notification = new Notification(this.notititle(message),{
                body:noticontent,
                icon:message.author.getpfpsrc(),
                image:imgurl,
            });
            notification.addEventListener("click",_=>{
                window.focus();
                this.getHTML();
            })
        } else if (Notification.permission !== "denied") {
            Notification.requestPermission().then((permission) => {
                if(deep===3){return};
                this.notify(message,deep+1);
            });
        }
    }
}
channel.setupcontextmenu();
