import { User } from "./user.js";
import { Role } from "./role.js";
import { Contextmenu } from "./contextmenu.js";
import { SnowFlake } from "./snowflake.js";
class Member {
    static already = {};
    owner;
    user;
    roles = [];
    id;
    nick;
    static contextmenu = new Contextmenu("User Menu");
    static setUpContextMenu() {
        this.contextmenu.addbutton("Copy user id", function () {
            navigator.clipboard.writeText(this.id);
        });
        this.contextmenu.addbutton("Message user", function () {
            fetch(this.info.api + "/users/@me/channels", { method: "POST",
                body: JSON.stringify({ "recipients": [this.id] }),
                headers: this.headers
            });
        });
    }
    constructor(memberjson, owner) {
        if (User.userids[memberjson.id]) {
            this.user = User.userids[memberjson.id];
        }
        else {
            this.user = new User(memberjson.user, owner.localuser);
        }
        this.owner = owner;
        for (const thing of Object.keys(memberjson)) {
            if (thing === "guild") {
                continue;
            }
            if (thing === "owner") {
                continue;
            }
            if (thing === "roles") {
                for (const strrole of memberjson["roles"]) {
                    const role = SnowFlake.getSnowFlakeFromID(strrole, Role).getObject();
                    this.roles.push(role);
                }
                continue;
            }
            this[thing] = memberjson[thing];
        }
        if (SnowFlake.getSnowFlakeFromID(this?.id, User)) {
            this.user = SnowFlake.getSnowFlakeFromID(this.id, User).getObject();
            return;
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
    static async new(memberjson, owner) {
        let user;
        if (User.userids[memberjson.id]) {
            user = User.userids[memberjson.id];
        }
        else {
            user = new User(memberjson.user, owner.localuser);
        }
        if (user.members.has(owner)) {
            let memb = user.members.get(owner);
            if (memb === undefined) {
                memb = new Member(memberjson, owner);
                user.members.set(owner, memb);
                return memb;
            }
            else if (memb instanceof Promise) {
                return await memb; //I should do something else, though for now this is "good enough"
            }
            else {
                return memb;
            }
        }
        else {
            const memb = new Member(memberjson, owner);
            user.members.set(owner, memb);
            return memb;
        }
    }
    static async resolveMember(user, guild) {
        const maybe = user.members.get(guild);
        if (!user.members.has(guild)) {
            const membpromise = guild.localuser.resolvemember(user.id, guild.id);
            let res;
            const promise = new Promise(r => { res = r; });
            user.members.set(guild, promise);
            const membjson = await membpromise;
            if (membjson === undefined) {
                res(undefined);
                return undefined;
            }
            else {
                const member = new Member(membjson, guild);
                const map = guild.localuser.presences;
                member.getPresence(map.get(member.id));
                map.delete(member.id);
                res(member);
                return member;
            }
        }
        if (maybe instanceof Promise) {
            return await maybe;
        }
        else {
            return maybe;
        }
    }
    getPresence(presence) {
        this.user.getPresence(presence);
    }
    /**
     * @todo
     */
    highInfo() {
        fetch(this.info.api + "/users/" + this.id + "/profile?with_mutual_guilds=true&with_mutual_friends_count=true&guild_id=" + this.guild.id, { headers: this.guild.headers });
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
            if (role.permissions.getPermission("ADMINISTRATOR")) {
                return true;
            }
        }
        return this.guild.properties.owner_id === this.user.id;
    }
    bind(html) {
        if (html.tagName === "SPAN") {
            if (!this) {
                return;
            }
            ;
            /*
            if(this.error){

            }
            */
            html.style.color = this.getColor();
        }
        this.profileclick(html);
        Member.contextmenu.bind(html);
    }
    profileclick(html) {
        //to be implemented
    }
}
Member.setUpContextMenu();
export { Member };
