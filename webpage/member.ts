import {User} from "./user.js";
import {Role} from "./role.js";
import {Guild} from "./guild.js";
class Member{
    static already={};
    owner:Guild;
    user:User;
    roles:Role[];
    constructor(memberjson,owner:Guild){
        if(!owner){console.error("Guild not included in the creation of a member object")}
        this.owner=owner;
        let membery=memberjson;
        if(memberjson.guild_member){
            membery=memberjson.guild_member;
            this.user=memberjson.user;
        }
        for(const thing of Object.keys(membery)){
            if(thing==="guild"){continue}
            this[thing]=membery[thing];
        }
        this.user=new User(this.user,owner.localuser);
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
    static async resolve(user:User,guild:Guild){
        if(guild.id==="@me"){return null}
        if(!Member.already[guild.id]){
            Member.already[guild.id]={};
        }else if(Member.already[guild.id][user.id]){
            const memb=Member.already[guild.id][user.id]
            if(memb instanceof Promise){
                return await memb;
            }
            return memb;
        }
        const promoise= fetch(guild.info.api.toString()+"/v9/users/"+user.id+"/profile?with_mutual_guilds=true&with_mutual_friends_count=true&guild_id="+guild.id,{headers:guild.headers}).then(_=>_.json()).then(json=>{
            const memb=new Member(json,guild);
            Member.already[guild.id][user.id]=memb;
            guild.fillMember(memb);
            console.log("resolved")
            return memb
        });
        Member.already[guild.id][user.id]=promoise;
        return await promoise;
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
        return this.guild.properties.owner_id===this.user.id;

    }
}
export {Member};
