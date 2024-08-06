"use strict"
import { Message } from "./message.js";
import {Voice} from "./audio.js";
import {Contextmenu} from "./contextmenu.js";
import {Fullscreen} from "./fullscreen.js";
import {Guild} from "./guild.js";
import { Localuser } from "./localuser.js";
import { Permissions } from "./permissions.js";
import { Settings, RoleList } from "./settings.js";
import { Role } from "./role.js";
import {InfiniteScroller} from "./infiniteScroller.js";
import { SnowFlake } from "./snowflake.js";
import { channeljson, messagejson, readyjson } from "./jsontypes.js";
import {Emoji} from "./emoji.js";
new Emoji();
declare global {
    interface NotificationOptions {
        image?: string
    }
}
class Channel{
    editing:Message;
    type:number;
    owner:Guild;
    headers:Localuser["headers"];
    name:string;
    snowflake:SnowFlake<Channel>;
    parent_id:SnowFlake<Channel>;
    parent:Channel;
    children:Channel[];
    guild_id:string;
    messageids:Map<SnowFlake<Message>,Message>;
    permission_overwrites:Map<string,Permissions>;
    permission_overwritesar:[SnowFlake<Role>,Permissions][]
    topic:string;
    nsfw:boolean;
    position:number;
    lastreadmessageid:SnowFlake<Message>;
    lastmessageid:SnowFlake<Message>;
    mentions:number;
    lastpin:string;
    move_id:SnowFlake<Channel>;
    typing:number;
    message_notifications:number;
    allthewayup:boolean;
    static contextmenu=new Contextmenu("channel menu");
    replyingto:Message;
    infinite:InfiniteScroller;
    idToPrev:Map<SnowFlake<Message>,SnowFlake<Message>>=new Map();
    idToNext:Map<SnowFlake<Message>,SnowFlake<Message>>=new Map();
    get id(){
        return this.snowflake.id;
    }
    static setupcontextmenu(){
        this.contextmenu.addbutton("Copy channel id",function(){
            console.log(this)
            navigator.clipboard.writeText(this.id);
        });

        this.contextmenu.addbutton("Mark as read",function(){
            console.log(this)
            this.readbottom();
        });

        this.contextmenu.addbutton("Settings[temp]",function(){
            this.generateSettings();
        });

        this.contextmenu.addbutton("Delete channel",function(){
            console.log(this)
            this.deleteChannel();
        },null,_=>{console.log(_);return _.isAdmin()});

        this.contextmenu.addbutton("Edit channel",function(){
            this.editChannel(this);
        },null,_=>{return _.isAdmin()});
    }
    generateSettings(){
        this.sortPerms();
        const settings=new Settings("Settings for "+this.name);

        const s1=settings.addButton("roles");

        s1.options.push(new RoleList(this.permission_overwritesar,this.guild,this.updateRolePermissions.bind(this),true))
        settings.show();
    }
    sortPerms(){
        this.permission_overwritesar.sort((a,b)=>{
            const order=this.guild.roles.findIndex(_=>_.snowflake===a[0])-this.guild.roles.findIndex(_=>_.snowflake===b[0]);
            return order;
        })
    }
    setUpInfiniteScroller(){
        const ids:{[key:string]:Function}={};
        this.infinite=new InfiniteScroller(async function(this:Channel,id:string,offset:number):Promise<string>{
            const snowflake=SnowFlake.getSnowFlakeFromID(id,Message) as SnowFlake<Message>;
            if(offset===1){
                if(this.idToPrev.has(snowflake)){
                    return this.idToPrev.get(snowflake)?.id;
                }else{
                    await this.grabBefore(id);
                    return this.idToPrev.get(snowflake)?.id;
                }
            }else{
                if(this.idToNext.has(snowflake)){
                    return this.idToNext.get(snowflake)?.id;
                }else if(this.lastmessage.id!==id){
                    await this.grabAfter(id);
                    return this.idToNext.get(snowflake)?.id;
                }else{
                    console.log("at bottom")
                }
            }
        }.bind(this),
        async function(this:Channel,id:string){
            let res:Function;
            const promise=new Promise(_=>{res=_;}) as Promise<void>;
            const snowflake=SnowFlake.getSnowFlakeFromID(id,Message);
            if(!snowflake.getObject()){
                await this.grabArround(id);
            }
            const html=snowflake.getObject().buildhtml(this.messageids.get(this.idToPrev.get(snowflake)),promise);
            ids[id]=res;
            return html;
        }.bind(this),
        async function(this:Channel,id:string){
            ids[id]();
            delete ids[id];
            return true;
        }.bind(this),
        this.readbottom.bind(this)
        );
    }
    constructor(json:channeljson|-1,owner:Guild){

        if(json===-1){
            return;
        }
        this.editing;
        this.type=json.type;
        this.owner=owner;
        this.headers=this.owner.headers;
        this.name=json.name;
        this.snowflake=new SnowFlake(json.id,this);
        this.parent_id=new SnowFlake(json.parent_id,undefined);
        this.parent=null;
        this.children=[];
        this.guild_id=json.guild_id;
        this.messageids=new Map();
        this.permission_overwrites=new Map();
        this.permission_overwritesar=[];
        for(const thing of json.permission_overwrites){
            if(thing.id==="1182819038095799904"||thing.id==="1182820803700625444"){continue;};
            this.permission_overwrites.set(thing.id,new Permissions(thing.allow,thing.deny));
            this.permission_overwritesar.push([SnowFlake.getSnowFlakeFromID(thing.id,Role),this.permission_overwrites.get(thing.id)]);
        }

        this.topic=json.topic;
        this.nsfw=json.nsfw;
        this.position=json.position;
        this.lastreadmessageid=null;
        this.lastmessageid=SnowFlake.getSnowFlakeFromID(json.last_message_id,Message);
        this.setUpInfiniteScroller();
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
    get info(){
        return this.owner.info;
    }
    readStateInfo(json:readyjson["d"]["read_state"]["entries"][0]){
        this.lastreadmessageid=SnowFlake.getSnowFlakeFromID(json.last_message_id,Message);
        this.mentions=json.mention_count;
        this.mentions??=0;
        this.lastpin=json.last_pin_timestamp;
    }
    get hasunreads():boolean{
        if(!this.hasPermission("VIEW_CHANNEL")){return false;}
        return this.lastmessageid!==this.lastreadmessageid&&this.type!==4&&!!this.lastmessageid.id;
    }
    hasPermission(name:string,member=this.guild.member):boolean{
        if(member.isAdmin()){
            return true;
        }
        for(const thing of member.roles){
            if(this.permission_overwrites.get(thing.id)){
                let perm=this.permission_overwrites.get(thing.id).getPermission(name);
                if(perm){
                    return perm===1;
                }
            }
            if(thing.permissions.getPermission(name)){
                return true;
            }
        }
        return false;
    }
    get canMessage():boolean{
        if((0===this.permission_overwritesar.length)&&this.hasPermission("MANAGE_CHANNELS")){
            this.addRoleToPerms(this.guild.roles.find(_=>_.name==="@everyone"));
        }
        return this.hasPermission("SEND_MESSAGES");
    }
    sortchildren(){
       this.children.sort((a,b)=>{return a.position-b.position});
    }
    resolveparent(guild:Guild){
        this.parent=guild.channelids[this.parent_id?.id];
        this.parent??=null;
        if(this.parent!==null){
            this.parent.children.push(this);
        }
        return this.parent===null;
    }
    calculateReorder(){
        let position=-1;
        let build=[];
        for(const thing of this.children){
            const thisthing={id:thing.snowflake,position:undefined,parent_id:undefined};
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
    createguildHTML(admin=false):HTMLDivElement{
        const div=document.createElement("div");
        if(!this.hasPermission("VIEW_CHANNEL")){
            let quit=true
            for(const thing of this.children){
                if(thing.hasPermission("VIEW_CHANNEL")){
                    quit=false;
                }
            }
            if(quit){
                return div;
            }
        }
        div["all"]=this;
        div.draggable=admin;
        div.addEventListener("dragstart",(e)=>{Channel.dragged=[this,div];e.stopImmediatePropagation()})
        div.addEventListener("dragend",()=>{Channel.dragged=[]})
        if(this.type===4){
            this.sortchildren();
            const caps=document.createElement("div");

            const decdiv=document.createElement("div");
            const decoration=document.createElement("img");
            decoration.src="/icons/category.svg";
            decoration.classList.add("svgtheme","colaspeicon")
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
                    this.guild.createchannels(this.createChannel.bind(this));
                }.bind(this);
                this.coatDropDiv(decdiv,childrendiv);
            }
            div.appendChild(caps)
            caps.classList.add("capsflex")
            decdiv.classList.add("channeleffects");
            decdiv.classList.add("channel");

            Channel.contextmenu.bind(decdiv,this);
            decdiv["all"]=this;


            for(const channel of this.children){
                childrendiv.appendChild(channel.createguildHTML(admin));
            }
            childrendiv.classList.add("channels");
            setTimeout(_=>{childrendiv.style.height = childrendiv.scrollHeight + 'px';},100)
            decdiv.onclick=function(){
                if(childrendiv.style.height!=='0px'){
                    decoration.classList.add("hiddencat");
                    //childrendiv.classList.add("colapsediv");
                    childrendiv.style.height = '0px';
                }else{
                    decoration.classList.remove("hiddencat");
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
            Channel.contextmenu.bind(div,this);
            if(admin){this.coatDropDiv(div);}
            div["all"]=this;
            const myhtml=document.createElement("span");
            myhtml.textContent=this.name;
            if(this.type===0){
                const decoration=document.createElement("img");
                decoration.src="/icons/channel.svg";
                div.appendChild(decoration)
                decoration.classList.add("space","svgtheme");
            }else if(this.type===2){//
                const decoration=document.createElement("img");
                decoration.src="/icons/voice.svg";
                div.appendChild(decoration)
                decoration.classList.add("space","svgtheme");
            }else if(this.type===5){//
                const decoration=document.createElement("img");
                decoration.src="/icons/announce.svg";
                div.appendChild(decoration)
                decoration.classList.add("space","svgtheme");
            }else{
                console.log(this.type)
            }
            div.appendChild(myhtml);
            div.onclick=_=>{
                this.getHTML();
            }
        }
        return div;
    }
    get myhtml(){
        const search=document.getElementById("channels").children[0].children
        if(this.guild!==this.localuser.lookingguild){
            return null
        }else if(this.parent){
            for(const thing of search){
                if(thing["all"]===this.parent){
                    for(const thing2 of thing.children[1].children){
                        if(thing2["all"]===this){
                            return thing2;
                        }
                    }
                }
            }
        }else{
            for(const thing of search){
                if(thing["all"]===this){
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
        fetch(this.info.api.toString()+"/channels/"+this.snowflake+"/messages/"+this.lastmessageid+"/ack",{
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
    coatDropDiv(div:HTMLDivElement,container:HTMLElement|boolean=false){
        div.addEventListener("dragenter", (event) => {
            console.log("enter")
            event.preventDefault();
        });

        div.addEventListener("dragover", (event) => {
            event.preventDefault();
        });

        div.addEventListener("drop", (event) => {
            const that=Channel.dragged[0];
            event.preventDefault();
            if(container){
                that.move_id=this.snowflake;
                if(that.parent){
                    that.parent.children.splice(that.parent.children.indexOf(that),1);
                }
                that.parent=this;
                (container as HTMLElement).prepend(Channel.dragged[1]);
                this.children.unshift(that);
            }else{
                console.log(this,Channel.dragged);
                that.move_id=this.parent_id;
                if(that.parent){
                    that.parent.children.splice(that.parent.children.indexOf(that),1);
                }else{
                    this.guild.headchannels.splice(this.guild.headchannels.indexOf(that),1);
                }
                that.parent=this.parent;
                if(that.parent){
                    const build=[];
                    for(let i=0;i<that.parent.children.length;i++){
                        build.push(that.parent.children[i])
                        if(that.parent.children[i]===this){
                            build.push(that);
                        }
                    }
                    that.parent.children=build;
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
                div.after(Channel.dragged[1]);
            }
            this.guild.calculateReorder()
        });

        return div;
    }
    createChannel(name:string,type:number){
        fetch(this.info.api.toString()+"/guilds/"+this.guild.snowflake+"/channels",{
            method:"POST",
            headers:this.headers,
            body:JSON.stringify({
                name: name,
                type: type,
                parent_id: this.snowflake,
                permission_overwrites:[],
            })
        })
    }
    editChannel(){
        let name=this.name;
        let topic=this.topic;
        let nsfw=this.nsfw;
        const thisid=this.snowflake;
        const thistype=this.type;
        const full=new Fullscreen(
        ["hdiv",
            ["vdiv",
                ["textbox","Channel name:",this.name,function(){name=this.value}],
                ["mdbox","Channel topic:",this.topic,function(){topic=this.value}],
                ["checkbox","NSFW Channel",this.nsfw,function(){nsfw=this.checked}],
                ["button","","submit",()=>{
                    fetch(this.info.api.toString()+"/channels/"+thisid,{
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
        fetch(this.info.api.toString()+"/channels/"+this.snowflake,{
            method:"DELETE",
            headers:this.headers
        })
    }
    setReplying(message:Message){
            if(this.replyingto){
                this.replyingto.div.classList.remove("replying");
            }
            this.replyingto=message;
            console.log(message);
            this.replyingto.div.classList.add("replying");
            this.makereplybox();

    }
    makereplybox(){
        const replybox=document.getElementById("replybox");
        if(this.replyingto){
            replybox.innerHTML="";
            const span=document.createElement("span");
            span.textContent="Replying to "+this.replyingto.author.username;
            const X=document.createElement("button");
            X.onclick=_=>{
                this.replyingto.div.classList.remove("replying");
                replybox.classList.add("hideReplyBox");
                this.replyingto=null;
                replybox.innerHTML="";
            }
            replybox.classList.remove("hideReplyBox");
            X.textContent="⦻";
            X.classList.add("cancelReply");
            replybox.append(span);
            replybox.append(X);
        }else{
            replybox.classList.add("hideReplyBox");
        }
    }
    async getmessage(id:string):Promise<Message>{
        const snowflake=SnowFlake.getSnowFlakeFromID(id,Message) as SnowFlake<Message>;
        if(snowflake.getObject()){
            return snowflake.getObject();
        }else{
            const gety=await fetch(this.info.api.toString()+"/channels/"+this.snowflake+"/messages?limit=1&around="+id,{headers:this.headers})
            const json=await gety.json();
            return new Message(json[0],this);
        }
    }
    static genid:number=0;
    async getHTML(){
        const id=++Channel.genid;
        if(this.guild!==this.localuser.lookingguild){
            this.guild.loadGuild();
        }
        if(this.localuser.channelfocus&&this.localuser.channelfocus.myhtml){
            this.localuser.channelfocus.myhtml.classList.remove("viewChannel");
        }
        this.myhtml.classList.add("viewChannel")
        this.guild.prevchannel=this;
        this.localuser.channelfocus=this;
        const prom=this.infinite.delete();
        await this.putmessages();
        await prom;
        if(id!==Channel.genid){
            return;
        }
        this.makereplybox();
        await this.buildmessages();
        history.pushState(null, null,"/channels/"+this.guild_id+"/"+this.snowflake);
        document.getElementById("channelname").textContent="#"+this.name;
        console.log(this);
        document.getElementById("typebox").contentEditable=""+this.canMessage;
    }
    lastmessage:Message;
    async putmessages(){
        if(this.allthewayup){return};
        const j=await fetch(this.info.api.toString()+"/channels/"+this.snowflake+"/messages?limit=100",{
        headers: this.headers,
        });

        const response=await j.json();
        if(response.length!==100){
            this.allthewayup=true;
        }
        let prev:Message=undefined;
        for(const thing of response){
            const message=new Message(thing,this);
            if(prev){
                this.idToNext.set(message.snowflake,prev.snowflake);
                this.idToPrev.set(prev.snowflake,message.snowflake);
            }else{
                this.lastmessage=message;
            }
            prev=message;
            if(this.messageids.get(message.snowflake)===undefined){
                this.messageids.set(message.snowflake,message);
            }
        }
    }
    delChannel(json:channeljson){
        const build=[];
        for(const thing of this.children){
            if(thing.id!==json.id){
                build.push(thing)
            }
        }
        this.children=build;
    }
    async grabAfter(id:string){
        console.log(id,this.lastmessage.id)
        if(id===this.lastmessage.id){
            return;
        }
        await fetch(this.info.api.toString()+"/channels/"+this.id+"/messages?limit=100&after="+id,{
            headers:this.headers
        }).then((j)=>{return j.json()}).then(response=>{
            let previd:SnowFlake<Message>=SnowFlake.getSnowFlakeFromID(id,Message);
            for(const i in response){
                let messager:Message;
                let willbreak=false
                if(!SnowFlake.hasSnowFlakeFromID(response[i].id,Message)){
                    messager=new Message(response[i],this);
                }else{
                    messager=SnowFlake.getSnowFlakeFromID(response[i].id,Message).getObject();
                    willbreak=true;
                }
                this.idToPrev.set(messager.snowflake,previd);
                this.idToNext.set(previd,messager.snowflake);
                previd=messager.snowflake;
                this.messageids.set(messager.snowflake,messager);
                if(willbreak){
                    break;
                }
            }
            //out.buildmessages();
        })
        return;
    }
    topid:SnowFlake<Message>;
    async grabBefore(id:string){
        if(this.topid&&id===this.topid.id){
            return;
        }

        await fetch(this.info.api.toString()+"/channels/"+this.snowflake+"/messages?before="+id+"&limit=100",{
            headers:this.headers
        }).then((j)=>{return j.json()}).then((response:messagejson[])=>{
            if(response.length<100){
                this.allthewayup=true;
                if(response.length===0){
                    this.topid=SnowFlake.getSnowFlakeFromID(id,Message);
                }
            }
            let previd=SnowFlake.getSnowFlakeFromID(id,Message) as SnowFlake<Message>;
            for(const i in response){
                let messager:Message;
                let willbreak=false;
                if(!SnowFlake.hasSnowFlakeFromID(response[i].id,Message)){
                    messager=new Message(response[i],this);
                }else{
                    console.log("flaky")
                    messager=SnowFlake.getSnowFlakeFromID(response[i].id,Message).getObject();
                    willbreak=true;
                }

                this.idToNext.set(messager.snowflake,previd);
                this.idToPrev.set(previd,messager.snowflake);
                previd=messager.snowflake;
                this.messageids.set(messager.snowflake,messager);

                if(+i===response.length-1&&response.length<100){
                    this.topid=previd;
                }
                if(willbreak){
                    break;
                }
            }
        })
        return;
    }
    /**
     * Please dont use this, its not implemented.
     **/
    async grabArround(id:string){//currently unused and no plans to use it yet
        throw new Error("please don't call this, no one has implemented it :P")
    }
    buildmessage(message:Message,next:Message){
        const built=message.buildhtml(next);
        document.getElementById("messages").prepend(built);
    }
    async buildmessages(){
        const messages=document.getElementById("channelw");
        messages.innerHTML="";
        let id:SnowFlake<Message>;
        if(this.lastreadmessageid&&this.lastreadmessageid.getObject()){
            id=this.lastreadmessageid;
        }else if(this.lastmessage.snowflake){
            id=this.goBackIds(this.lastmessage.snowflake,50);
            console.log("shouldn't")
        }
        console.log(this.lastreadmessageid,id.id);
        messages.append(await this.infinite.getDiv(id.id));
        this.infinite.updatestuff();
        this.infinite.watchForChange().then(async _=>{
            await new Promise(resolve => setTimeout(resolve, 100));
            this.infinite.focus(id.id,false);//if someone could figure out how to make this work correctly without this, that's be great :P
        })
    }
    private goBackIds(id:SnowFlake<Message>,back:number):SnowFlake<Message>{
        while(back!==0){
            const nextid=this.idToPrev.get(id);
            if(nextid){
                id=nextid;
                console.log(id);
                back--;
            }else{
                break;
            }
        }
        return id;
    }
    updateChannel(json:channeljson){
        this.type=json.type;
        this.name=json.name;
        this.parent_id=new SnowFlake(json.parent_id,undefined);
        this.parent=null;
        this.children=[];
        this.guild_id=json.guild_id;
        this.messageids=new Map();
        this.permission_overwrites=new Map();
        for(const thing of json.permission_overwrites){
            if(thing.id==="1182819038095799904"||thing.id==="1182820803700625444"){continue;};
            this.permission_overwrites.set(thing.id,new Permissions(thing.allow,thing.deny));
            this.permission_overwritesar.push([SnowFlake.getSnowFlakeFromID(thing.id,Role),this.permission_overwrites.get(thing.id)]);
        }
        this.topic=json.topic;
        this.nsfw=json.nsfw;
    }
    typingstart(){
        if(this.typing>new Date().getTime()){
            return;
        }
        this.typing=new Date().getTime()+6000;
        fetch(this.info.api.toString()+"/channels/"+this.snowflake+"/typing",{
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
    async sendMessage(content:string,{attachments=[],embeds=[],replyingto=null}){
        let replyjson:any;
        if(replyingto){
            replyjson=
            {
                "guild_id":replyingto.guild.id,
                "channel_id": replyingto.channel.id,
                "message_id": replyingto.id,
            };
        };
        if(attachments.length===0){
            const body={
                content:content,
                nonce:Math.floor(Math.random()*1000000000),
                message_reference:undefined
            };
            if(replyjson){
                body.message_reference=replyjson;
            }
            console.log(body)
            return await fetch(this.info.api.toString()+"/channels/"+this.snowflake+"/messages",{
                method:"POST",
                headers:this.headers,
                body:JSON.stringify(body)
            })
        }else{
            const formData = new FormData();
            const body={
                content:content,
                nonce:Math.floor(Math.random()*1000000000),
                message_reference:undefined
            }
            if(replyjson){
                body.message_reference=replyjson;
            }
            formData.append('payload_json', JSON.stringify(body));
            for(const i in attachments){
                console.log(attachments[i])
                formData.append("files["+i+"]",attachments[i]);
            }
            return await fetch(this.info.api.toString()+"/channels/"+this.snowflake+"/messages", {
                method: 'POST',
                body: formData,
                headers:{"Authorization":this.headers.Authorization}
            });
        }
    }
    messageCreate(messagep:any):void{
        if(!this.hasPermission("VIEW_CHANNEL")){return}
        const messagez=new Message(messagep.d,this);
        this.lastmessage=messagez;
        console.log(this.lastmessageid,messagez.snowflake,":3");
        this.idToNext.set(this.lastmessageid,messagez.snowflake);
        this.idToPrev.set(messagez.snowflake,this.lastmessageid);
        this.lastmessageid=messagez.snowflake;
        this.messageids.set(messagez.snowflake,messagez);
        if(messagez.author===this.localuser.user){
            this.lastreadmessageid=messagez.snowflake;
            if(this.myhtml){
                this.myhtml.classList.remove("cunread");
            }
        }else{
            if(this.myhtml){
                this.myhtml.classList.add("cunread");
            }
        }
        this.guild.unreads();
        if(this===this.localuser.channelfocus){
            this.infinite.addedBottom();
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
    notititle(message:Message):string{
       return message.author.username+" > "+this.guild.properties.name+" > "+this.name;
    }
    notify(message:Message,deep=0){
        Voice.noises(Voice.getNotificationSound());
        if (!("Notification" in window)) {

        } else if (Notification.permission === "granted") {
            let noticontent=message.content.textContent;
            if(message.embeds[0]){
                noticontent||=message.embeds[0].json.title;
                noticontent||=message.content.textContent;
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
            Notification.requestPermission().then(() => {
                if(deep===3){return};
                this.notify(message,deep+1);
            });
        }
    }
    async addRoleToPerms(role:Role){
        await fetch(this.info.api.toString()+"/channels/"+this.snowflake+"/permissions/"+role.snowflake,{
            method:"PUT",
            headers:this.headers,
            body:JSON.stringify({
                allow:"0",
                deny:"0",
                id:role.snowflake,
                type:0
            })
        })
        const perm=new Permissions("0","0");
        this.permission_overwrites.set(role.id,perm);
        this.permission_overwritesar.push([role.snowflake,perm]);
    }
    async updateRolePermissions(id:string,perms:Permissions){
        const permission=this.permission_overwrites.get(id);
        permission.allow=perms.allow;
        permission.deny=perms.deny;
        await fetch(this.info.api.toString()+"/channels/"+this.snowflake+"/permissions/"+id,{
            method:"PUT",
            headers:this.headers,
            body:JSON.stringify({
                allow:permission.allow.toString(),
                deny:permission.deny.toString(),
                id:id,
                type:0
            })
        })
    }
}
Channel.setupcontextmenu();
export {Channel};
{
    let last:string;
    const dud=document.createElement("p")
    dud.classList.add("svgtheme")
    document.body.append(dud);
    const css=window.getComputedStyle(dud);
    function fixsvgtheme(){
        //console.log(things);
        const thing=css.color.replace("rgb(","").replace(")","").split(",");
        //sconsole.log(thing);
        const r=+thing[0]/255;
        const g=+thing[1]/255;
        const b=+thing[2]/255;
        const max=Math.max(r,g,b);
        const min=Math.min(r,g,b);
        const l=(max+min)/2;

        let s:number;
        let h:number;
        if(max!==min){
            if(l<=.5){
                s=(max-min)/(max+min);
            }else{
                s=(max-min)/(2.0-max-min);
            }
            if(r===max){
                h=(g-b)/(max-min);
            }else if(g===max){
                h=2+(b-r)/(max-min);
            }else if(b===max){
                h=4+(r-g)/(max-min);
            }
        }else{
            s=0;
            h=0;
        }
        const rot=Math.floor(h*60)+"deg";
        const invert=.5-(s/2)+"";
        const brightness=Math.floor((l*200))+"%";
        const current=rot+invert+brightness;
        if(current!==last){
            last=current;
            document.documentElement.style.setProperty('--rot', rot);
            document.documentElement.style.setProperty('--invert', invert);
            document.documentElement.style.setProperty('--brightness', brightness);
        }
    }
    setInterval(fixsvgtheme,100);
}
