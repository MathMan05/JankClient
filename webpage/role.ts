export {Role};
import {Permissions} from "./permissions.js";
import {Localuser} from "./localuser.js";
import {Guild} from "./guild.js";
import { SnowFlake } from "./snowflake.js";
import { rolesjson } from "./jsontypes.js";
class Role{
    permissions:Permissions;
    owner:Guild;
    color:number;
    readonly snowflake:SnowFlake<Role>;
    name:string;
    info:Guild["info"];
    hoist:boolean;
    icon:string;
    mentionable:boolean;
    unicode_emoji:string;
    headers:Guild["headers"];
    get id(){
        return this.snowflake.id;
    }
    constructor(json:rolesjson, owner:Guild){
        this.headers=owner.headers;
        this.info=owner.info;
        for(const thing of Object.keys(json)){
            if(thing==="id"){
                this.snowflake=new SnowFlake(json.id,this);
                continue;
            }
            this[thing]=json[thing];
        }
        this.permissions=new Permissions(json.permissions);
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
