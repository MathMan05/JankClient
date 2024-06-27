export {Role};
import {Permissions} from "./permissions.js";
import {Localuser} from "./localuser.js";
import {Guild} from "./guild.js";
class Role{
    permissions:Permissions;
    owner:Guild;
    color:number;
    id:string;
    constructor(JSON, owner:Guild){
        for(const thing of Object.keys(JSON)){
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
