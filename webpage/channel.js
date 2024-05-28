class channel{
    constructor(JSON,owner){
        if(JSON===-1){
            return;
        }
        this.type=JSON.type;
        this.owner=owner;
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
    readStateInfo(json){
        this.lastreadmessageid=json.last_message_id;
        this.mentions=json.mention_count;
        this.lastpin=json.last_pin_timestamp;
    }
    get hasunreads(){
        return this.lastmessageid!==this.lastreadmessageid&&this.type!==4;
    }
    get canMessage(){
        for(const thing of this.permission_overwrites){
            if(this.owner.hasRole(thing.id)&&thing.deny&(1<<11)){
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
                console.log(this.owner.channelids[thisthing.parent_id]);
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
            decoration.innerText="▼"
            decdiv.appendChild(decoration)

            const myhtml=document.createElement("p2");
            myhtml.innerText=this.name;
            decdiv.appendChild(myhtml);
            caps.appendChild(decdiv);
            const childrendiv=document.createElement("div");
            if(admin){
                const addchannel=document.createElement("span");
                addchannel.innerText="+";
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
            decdiv.classList.add("Channel");

            lacechannel(decdiv);
            decdiv.all=this;


            for(const channel of this.children){
                childrendiv.appendChild(channel.createguildHTML(admin));
            }
            childrendiv.classList.add("channels");
            setTimeout(_=>{childrendiv.style.height = childrendiv.scrollHeight + 'px';},100)
            decdiv.onclick=function(){
                if(decoration.innerText==="▼"){//
                    decoration.innerText="▲";
                    //childrendiv.classList.add("colapsediv");
                    childrendiv.style.height = '0px';
                }else{
                    decoration.innerText="▼";
                    //childrendiv.classList.remove("colapsediv")
                    childrendiv.style.height = childrendiv.scrollHeight + 'px';
                }
            }
            div.appendChild(childrendiv);
        }else{
            div.classList.add("Channel");
            if(this.hasunreads){
                div.classList.add("cunread");
            }
            lacechannel(div);
            if(admin){this.coatDropDiv(div,this);}
            div.all=this;
            const myhtml=document.createElement("span");
            myhtml.innerText=this.name;
            if(this.type===0){
                const decoration=document.createElement("b");
                decoration.innerText="#"
                div.appendChild(decoration)
                decoration.classList.add("space");
            }else if(this.type===2){//
                const decoration=document.createElement("b");
                decoration.innerText="🕪"
                div.appendChild(decoration)
                decoration.classList.add("spacee");
            }else if(this.type===5){//
                const decoration=document.createElement("b");
                decoration.innerText="📣"
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
        if(this.owner!==thisuser.lookingguild){
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
        fetch("https://old.server.spacebar.chat/api/v9/channels/"+this.id+"/messages/"+this.lastmessageid+"/ack",{
            method:"POST",
            headers:{"Content-type": "application/json; charset=UTF-8",Authorization:token},
            body:JSON.stringify({})
        });
        this.lastreadmessageid=this.lastmessageid;
        this.owner.unreads();
        if(this.myhtml!==null){
            console.log(this.myhtml.classList)
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
                console.log(this,that)
                this.children.unshift(that);
            }else{
                console.log(this,channel.dragged);
                that.move_id=this.parent_id;
                if(that.parrent){
                    that.parrent.children.splice(that.parrent.children.indexOf(that),1);
                }else{
                    this.owner.headchannels.splice(this.owner.headchannels.indexOf(that),1);
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
                    for(let i=0;i<this.owner.headchannels.length;i++){
                        build.push(this.owner.headchannels[i])
                        if(this.owner.headchannels[i]===this){
                            build.push(that);
                        }
                    }
                    this.owner.headchannels=build;
                }
                div.after(channel.dragged[1]);
            }
            this.owner.calculateReorder()
        });

        return div;
    }
    createChannel(name,type){
        fetch("https://api.old.server.spacebar.chat/api/guilds/"+this.owner.id+"/channels",{
            method:"Post",
            headers:{"Content-type": "application/json; charset=UTF-8",Authorization:token},
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
                    fetch("https://api.old.server.spacebar.chat/api/v9/channels/"+thisid,{
                        method:"PATCH",
                        headers:{"Content-type": "application/json; charset=UTF-8",Authorization:token},
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
        fetch("https://api.old.server.spacebar.chat/api/v9/channels/"+this.id,{
            method:"DELETE",
            headers:{"Content-type": "application/json; charset=UTF-8",Authorization:token}
        })
    }
    getHTML(){
        this.owner.prevchannel=this;
        this.owner.owner.channelfocus=this.id;
        this.putmessages();
        history.pushState(null, null,"/channels/"+this.guild_id+"/"+this.id);
        document.getElementById("channelname").innerText="#"+this.name;
    }
    putmessages(){
        const out=this;
        fetch("https://api.old.server.spacebar.chat/api/channels/"+this.id+"/messages?limit=100",{
        method: 'GET',
        headers: {Authorization:token},
        }).then((j)=>{return j.json()}).then(function(responce){
            messages.innerHTML = '';
            //responce.reverse()
            messagelist=[];
            for(const thing of responce){
                const messager=new cmessage(thing)
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
    grabmoremessages(){
        if(this.messages.length===0){
            return;
        }
        const out=this;
        fetch("https://api.old.server.spacebar.chat/api/channels/"+this.id+"/messages?before="+this.messages[this.messages.length-1].id+"&limit=100",{
            method:"GET",
            headers:{Authorization:token}
        }).then((j)=>{return j.json()}).then(function(responce){
            //messages.innerHTML = '';
            //responce.reverse()
            let next
            for(const i in responce){
                let messager
                if(!next){
                    messager=new cmessage(responce[i])
                }else{
                    messager=next;
                }
                if(responce[+i+1]!==undefined){
                    next=new cmessage(responce[+i+1]);
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

        console.log(typebox.disabled=!this.canMessage);
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
        fetch("https://api.old.server.spacebar.chat/api/channels/"+this.id+"/typing",{
            method:"POST",
            headers:{Authorization:token}
        })
    }
    messageCreate(messagep,focus){
        const messagez=new cmessage(messagep.d);
        this.lastmessageid=messagez.id;
        if(messagez.author===thisuser.user){
            this.lastreadmessageid=messagez.id;
            if(this.myhtml){
                this.myhtml.classList.remove("cunread");
            }
        }else{
            if(this.myhtml){
                this.myhtml.classList.add("cunread");
            }
        }
        this.owner.unreads();
        this.messages.unshift(messagez);
        const scrolly=document.getElementById("messagecontainer");
        this.messageids[messagez.id]=messagez;
        if(this.owner.owner.lookingguild.prevchannel===this){
            var shouldScroll=scrolly.scrollTop+scrolly.clientHeight>scrolly.scrollHeight-20;
            messages.appendChild(messagez.buildhtml(this.messages[1]));
        }
        if(shouldScroll){
                scrolly.scrollTop = scrolly.scrollHeight;
        }
    }
}
