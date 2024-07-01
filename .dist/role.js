export { Role };
import { Permissions } from "./permissions.js";
class Role {
    permissions;
    owner;
    color;
    id;
    name;
    info;
    hoist;
    icon;
    mentionable;
    unicode_emoji;
    headers;
    constructor(JSON, owner) {
        this.headers = owner.headers;
        this.info = owner.info;
        for (const thing of Object.keys(JSON)) {
            this[thing] = JSON[thing];
        }
        this.permissions = new Permissions(JSON.permissions);
        this.owner = owner;
    }
    get guild() {
        return this.owner;
    }
    get localuser() {
        return this.guild.localuser;
    }
    getColor() {
        if (this.color === 0) {
            return null;
        }
        ;
        return `#${this.color.toString(16)}`;
    }
}
