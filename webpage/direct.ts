import {Guild} from "./guild.js";
import { Channel } from "./channel.js";
import { Message } from "./message.js";
import { Localuser } from "./localuser.js";
import {User} from "./user.js";
import { Member } from "./member.js";
import { SnowFlake } from "./snowflake.js";

class Direct extends Guild{
    constructor(JSON,owner:Localuser){
        super(-1,owner,null);
        this.message_notifications=0;
        console.log(JSON);
        this.owner=owner;
        if(!this.localuser){
            console.error("Owner was not included, please fix")
        }
        this.headers=this.localuser.headers;
        this.channels=[];
        this.channelids={};
        this.id=new SnowFlake("@me",this);
        this.properties={};
        this.roles=[];
        this.roleids=new Map();
        this.prevchannel=undefined;
        this.properties.name="Direct Messages";
        for(const thing of JSON){
            const temp=new Group(thing,this);
            this.channels.push(temp);
            this.channelids[temp.id.id]=temp;
        }
        this.headchannels=this.channels;
    }
    createChannelpac(JSON){
        const thischannel=new Group(JSON,this);
        this.channelids[JSON.id]=thischannel;
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
    giveMember(member){
        console.error("not a real guild, can't give member object")
    }
    getRole(ID){
        return null;
    }
    hasRole(r){
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
class Group extends Channel{
    user:User;
    constructor(JSON,owner:Direct){
        super(-1,owner);
        this.owner=owner;
        this.headers=this.guild.headers;
        this.name=JSON.recipients[0]?.username;
        if(JSON.recipients[0]){
            this.user=new User(JSON.recipients[0],this.localuser);
        }else{
            this.user=this.localuser.user;
        }
        this.name??=this.localuser.user.username;
        this.id=new SnowFlake(JSON.id,this);
        this.parent_id=null;
        this.parent=null;
        this.children=[];
        this.guild_id="@me";
        this.messageids=new Map();
        this.permission_overwrites=new Map();
        this.lastmessageid=SnowFlake.getSnowFlakeFromID(JSON.last_message_id,Message);
        this.lastmessageid??=new SnowFlake("0",undefined);
        this.mentions=0;
        this.setUpInfiniteScroller();
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
        history.pushState(null, null,"/channels/"+this.guild_id+"/"+this.id);
        document.getElementById("channelname").textContent="@"+this.name;
    }
    messageCreate(messagep){
        const messagez=new Message(messagep.d,this);
        this.idToNext.set(this.lastmessageid,messagez.id);
        this.idToPrev.set(messagez.id,this.lastmessageid);
        this.lastmessageid=messagez.id;
        this.messageids.set(messagez.id,messagez);
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
            console.log(this.mentions)
            div["noti"]=noti;
            div.append(noti)
            const buildpfp=this.user.buildpfp();
            div["all"]=this;
            buildpfp.classList.add("mentioned");
            console.log(this);
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
    hasPermission(name: string, member?: Member): boolean {
        return true;
    }
}
export {Direct, Group};
