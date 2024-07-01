import {User} from "./user.js";
import {Role} from "./role.js";
import {Guild} from "./guild.js";
import { Contextmenu } from "./contextmenu.js";

class Member{
    static already={};
    owner:Guild;
    user:User;
    roles:Role[];
    error:boolean;
    static contextmenu:Contextmenu=new Contextmenu("User Menu");
    static setUpContextMenu(){
        this.contextmenu.addbutton("Copy user id",function(){
            navigator.clipboard.writeText(this.id);
        });
        this.contextmenu.addbutton("Message user",function(){
            fetch(this.info.api.toString()+"/v9/users/@me/channels",
                {method:"POST",
                    body:JSON.stringify({"recipients":[this.id]}),
                    headers: this.headers
                });
        });
    }
    constructor(memberjson,owner:Guild,error=false){
        this.error=error;
        this.owner=owner;
        let membery=memberjson;
        this.roles=[];
        if(!error){
            if(memberjson.guild_member){
                membery=memberjson.guild_member;
                this.user=memberjson.user;
            }
        }
        for(const thing of Object.keys(membery)){
            if(thing==="guild"){continue}
            if(thing==="owner"){continue}
            if(thing==="roles"){
                for(const strrole of membery["roles"]){
                    const role=this.guild.getRole(strrole);
                    this.roles.push(role);
                }
                continue;
            }
            this[thing]=membery[thing];
        }
        if(error){
            this.user=memberjson as User;
        }else{
            this.user=new User(this.user,owner.localuser);
        }
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
    static async resolve(unkown:User|object|string,guild:Guild):Promise<Member>{
        if(!(guild instanceof Guild)){
            console.error(guild)
        }
        let user:User;
        let id="";
        if(unkown instanceof User){
            user=unkown as User;
            id=user.id;
        }else if(typeof unkown===typeof ""){
            id=unkown as string;
        }else{
            return new Member(unkown,guild);
        }
        if(guild.id==="@me"){return null}
        if(!Member.already[guild.id]){
            Member.already[guild.id]={};
        }else if(Member.already[guild.id][id]){
            const memb=Member.already[guild.id][id]
            if(memb instanceof Promise){
                return await memb;
            }
            return memb;
        }
        const promoise= fetch(guild.info.api.toString()+"/v9/users/"+id+"/profile?with_mutual_guilds=true&with_mutual_friends_count=true&guild_id="+guild.id,{headers:guild.headers}).then(_=>_.json()).then(json=>{
            const memb=new Member(json,guild);
            Member.already[guild.id][id]=memb;
            console.log("resolved")
            return memb
        })
        Member.already[guild.id][id]=promoise;
        try{
            return await promoise
        }catch(_){
            const memb=new Member(user,guild,true);
            Member.already[guild.id][id]=memb;
            return memb;
        }
    }
    hasRole(ID:string){
        console.log(this.roles,ID);
        for(const thing of this.roles){
            if(thing.id===ID){
                return true;
            }
        }
        return false;
    }
    getColor(){
        for(const thing of this.roles){
            const color=thing.getColor();
            if(color){
              return color;
            }
        }
        return "";
    }
    isAdmin(){
        for(const role of this.roles){
            if(role.permissions.getPermision("ADMINISTRATOR")){
                return true;
            }
        }
        return this.guild.properties.owner_id===this.user.id;
    }
    bind(html:HTMLElement){
        if(html.tagName==="SPAN"){
            if(!this) {return};
            console.log(this.error);
            if(this.error){
                const error=document.createElement("span");
                error.textContent="!";
                error.classList.add("membererror");
                html.after(error);
                return;
            }
            html.style.color=this.getColor();
        }

        this.profileclick(html);
        Member.contextmenu.bind(html);
    }
    profileclick(html:HTMLElement){
        //to be implemented
    }
}
Member.setUpContextMenu();
export {Member};
