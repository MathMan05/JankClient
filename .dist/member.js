import { User } from "./user.js";
import { Guild } from "./guild.js";
class Member {
    static already = {};
    owner;
    user;
    roles;
    error;
    constructor(memberjson, owner, error = false) {
        this.error = error;
        this.owner = owner;
        let membery = memberjson;
        this.roles = [];
        if (!error) {
            if (memberjson.guild_member) {
                membery = memberjson.guild_member;
                this.user = memberjson.user;
            }
        }
        for (const thing of Object.keys(membery)) {
            if (thing === "guild") {
                continue;
            }
            if (thing === "owner") {
                continue;
            }
            if (thing === "roles") {
                for (const strrole of membery["roles"]) {
                    const role = this.guild.getRole(strrole);
                    this.roles.push(role);
                }
                continue;
            }
            this[thing] = membery[thing];
        }
        if (error) {
            this.user = memberjson;
        }
        else {
            this.user = new User(this.user, owner.localuser);
        }
    }
    get guild() {
        return this.owner;
    }
    get localuser() {
        return this.guild.localuser;
    }
    get info() {
        return this.owner.info;
    }
    static async resolve(unkown, guild) {
        if (!(guild instanceof Guild)) {
            console.error(guild);
        }
        let user;
        if (unkown instanceof User) {
            user = unkown;
        }
        else {
            return new Member(unkown, guild);
        }
        if (guild.id === "@me") {
            return null;
        }
        if (!Member.already[guild.id]) {
            Member.already[guild.id] = {};
        }
        else if (Member.already[guild.id][user.id]) {
            const memb = Member.already[guild.id][user.id];
            if (memb instanceof Promise) {
                return await memb;
            }
            return memb;
        }
        const promoise = fetch(guild.info.api.toString() + "/v9/users/" + user.id + "/profile?with_mutual_guilds=true&with_mutual_friends_count=true&guild_id=" + guild.id, { headers: guild.headers }).then(_ => _.json()).then(json => {
            const memb = new Member(json, guild);
            Member.already[guild.id][user.id] = memb;
            console.log("resolved");
            return memb;
        });
        Member.already[guild.id][user.id] = promoise;
        try {
            return await promoise;
        }
        catch (_) {
            const memb = new Member(user, guild, true);
            Member.already[guild.id][user.id] = memb;
            return memb;
        }
    }
    hasRole(ID) {
        console.log(this.roles, ID);
        for (const thing of this.roles) {
            if (thing.id === ID) {
                return true;
            }
        }
        return false;
    }
    getColor() {
        for (const thing of this.roles) {
            const color = thing.getColor();
            if (color) {
                return color;
            }
        }
        return "";
    }
    isAdmin() {
        for (const role of this.roles) {
            if (role.permissions.getPermision("ADMINISTRATOR")) {
                return true;
            }
        }
        return this.guild.properties.owner_id === this.user.id;
    }
}
export { Member };
