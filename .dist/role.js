export { Role };
import { Permissions } from "./permissions.js";
import { SnowFlake } from "./snowflake.js";
class Role {
    permissions;
    owner;
    color;
    snowflake;
    name;
    info;
    hoist;
    icon;
    mentionable;
    unicode_emoji;
    headers;
    get id() {
        return this.snowflake.id;
    }
    constructor(json, owner) {
        this.headers = owner.headers;
        this.info = owner.info;
        for (const thing of Object.keys(json)) {
            if (thing === "id") {
                this.snowflake = new SnowFlake(json.id, this);
                continue;
            }
            this[thing] = json[thing];
        }
        this.permissions = new Permissions(json.permissions);
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
