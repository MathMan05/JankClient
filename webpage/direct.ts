import {Guild} from "./guild.js";
import { Channel } from "./channel.js";
import { Message } from "./message.js";
import { Localuser } from "./localuser.js";
import {User} from "./user.js";
import { Member } from "./member.js";
import { SnowFlake } from "./snowflake.js";
import { dirrectjson, memberjson } from "./jsontypes.js";
import { Permissions } from "./permissions.js";

class Direct extends Guild{
    constructor(json:dirrectjson[],owner:Localuser){
        super(-1,owner,null);
        this.message_notifications=0;
        this.owner=owner;
        if(!this.localuser){
            console.error("Owner was not included, please fix")
        }
        this.headers=this.localuser.headers;
        this.channels=[];
        this.channelids={};
        this.snowflake=new SnowFlake("@me",this);
        this.properties={};
        this.roles=[];
        this.roleids=new Map();
        this.prevchannel=undefined;
        this.properties.name="Direct Messages";
        for(const thing of json){
            const temp=new Group(thing,this);
            this.channels.push(temp);
            this.channelids[temp.id]=temp;
        }
        this.headchannels=this.channels;
    }
    createChannelpac(json){
        const thischannel=new Group(json,this);
        this.channelids[json.id]=thischannel;
        this.channels.push(thischannel);
        this.calculateReorder();
        this.printServers();
    }
    sortchannels(){
        this.headchannels.sort((a,b)=>{
            const result=(a.lastmessageid.getUnixTime()-b.lastmessageid.getUnixTime());
            return Number(-result);
        });
    }
    giveMember(_member:memberjson){
        console.error("not a real guild, can't give member object")
    }
    getRole(ID:string){
        return null;
    }
    hasRole(r:string){
        return false;
    }
    isAdmin(){
        return false;
    }
    unreaddms(){
        for(const thing of this.channels){
            (thing as Group).unreads();
        }
    }
}

const dmPermissions = new Permissions("0");
dmPermissions.setPermission("ADD_REACTIONS",1);
dmPermissions.setPermission("VIEW_CHANNEL",1);
dmPermissions.setPermission("SEND_MESSAGES",1);
dmPermissions.setPermission("EMBED_LINKS",1);
dmPermissions.setPermission("ATTACH_FILES",1);
dmPermissions.setPermission("READ_MESSAGE_HISTORY",1);
dmPermissions.setPermission("MENTION_EVERYONE",1);
dmPermissions.setPermission("USE_EXTERNAL_EMOJIS",1);
dmPermissions.setPermission("USE_APPLICATION_COMMANDS",1);
dmPermissions.setPermission("USE_EXTERNAL_STICKERS",1);
dmPermissions.setPermission("USE_EMBEDDED_ACTIVITIES",1);
dmPermissions.setPermission("USE_SOUNDBOARD",1);
dmPermissions.setPermission("USE_EXTERNAL_SOUNDS",1);
dmPermissions.setPermission("SEND_VOICE_MESSAGES",1);
dmPermissions.setPermission("SEND_POLLS",1);
dmPermissions.setPermission("USE_EXTERNAL_APPS",1);

dmPermissions.setPermission("CONNECT",1);
dmPermissions.setPermission("SPEAK",1);
dmPermissions.setPermission("STREAM",1);
dmPermissions.setPermission("USE_VAD",1);

class Group extends Channel{
    user:User;
    constructor(json:dirrectjson,owner:Direct){
        super(-1,owner);
        this.owner=owner;
        this.headers=this.guild.headers;
        this.name=json.recipients[0]?.username;
        if(json.recipients[0]){
            this.user=new User(json.recipients[0],this.localuser);
        }else{
            this.user=this.localuser.user;
        }
        this.name??=this.localuser.user.username;
        this.snowflake=new SnowFlake(json.id,this);
        this.parent_id=null;
        this.parent=null;
        this.children=[];
        this.guild_id="@me";
        this.messageids=new Map();
        this.permission_overwrites=new Map();
        this.lastmessageid=SnowFlake.getSnowFlakeFromID(json.last_message_id,Message);
        this.lastmessageid??=new SnowFlake("0",undefined);
        this.mentions=0;
        this.setUpInfiniteScroller();
        this.position=Math.max(this.lastmessageid.getUnixTime(),this.snowflake.getUnixTime());
    }
    createguildHTML(){
        const div=document.createElement("div")
        div.classList.add("channeleffects");
        const myhtml=document.createElement("span");
        myhtml.textContent=this.name;
        div.appendChild(this.user.buildpfp());
        div.appendChild(myhtml);
        div["myinfo"]=this;
        div.onclick=_=>{
            this.getHTML();
        }
        return div;
    }
    async getHTML(){
        const id=++Channel.genid;
        if(this.guild!==this.localuser.lookingguild){
            this.guild.loadGuild();
        }
        this.guild.prevchannel=this;
        this.localuser.channelfocus=this;
        const prom=this.infinite.delete();
        await this.putmessages();
        await prom;
        if(id!==Channel.genid){
            return;
        }
        this.buildmessages();
        history.pushState(null, null,"/channels/"+this.guild_id+"/"+this.snowflake);
        document.getElementById("channelname").textContent="@"+this.name;
        document.getElementById("channelTopic").setAttribute("hidden","");
        document.getElementById("typebox").contentEditable=""+true;
    }
    messageCreate(messagep){
        const messagez=new Message(messagep.d,this);
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
        this.unreads();
        this.infinite.addedBottom();
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
        return message.author.username;
    }
    unreads(){
        const sentdms=document.getElementById("sentdms");
        let current=null;
        for(const thing of sentdms.children){
            if(thing["all"]===this){
                current=thing;
            }
        }
        if(this.hasunreads){
            if(current){current.noti.textContent=this.mentions;return;}
            const div=document.createElement("div");
            div.classList.add("servernoti");
            const noti=document.createElement("div");
            noti.classList.add("unread","notiunread","pinged");
            noti.textContent=""+this.mentions;
            div["noti"]=noti;
            div.append(noti)
            const buildpfp=this.user.buildpfp();
            div["all"]=this;
            buildpfp.classList.add("mentioned");
            div.append(buildpfp)
            sentdms.append(div);
            div.onclick=_=>{
                this.guild.loadGuild();
                this.getHTML();
            }
        }else if(current){

            current.remove();
        }else{

        }
    }
    isAdmin(): boolean {
        return false;
    }
    hasPermission(name: string): boolean {
        return dmPermissions.hasPermission(name);
    }
}
export {Direct, Group};
