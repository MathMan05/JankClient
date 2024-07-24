export {Role};
import {Permissions} from "./permissions.js";
import {Localuser} from "./localuser.js";
import {Guild} from "./guild.js";
import { SnowFlake } from "./snowflake.js";
class Role{
    permissions:Permissions;
    owner:Guild;
    color:number;
    readonly id:SnowFlake<Role>;
    name:string;
    info:Guild["info"];
    hoist:boolean;
    icon:string;
    mentionable:boolean;
    unicode_emoji:string;
    headers:Guild["headers"];
    constructor(JSON, owner:Guild){
        this.headers=owner.headers;
        this.info=owner.info;
        for(const thing of Object.keys(JSON)){
            if(thing==="id"){
                this.id=new SnowFlake(JSON.id,this);
                continue;
            }
            this[thing]=JSON[thing];
        }
        this.permissions=new Permissions(JSON.permissions);
        this.owner=owner;
    }
    get guild():Guild{
        return this.owner;
    }
    get localuser():Localuser{
        return this.guild.localuser;
    }
    getColor():string{
        if(this.color===0){return null};
        return `#${this.color.toString(16)}`;
    }
}
