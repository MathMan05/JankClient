//const usercache={};
import { Member } from "./member.js";
import { MarkDown } from "./markdown.js";
import { Contextmenu } from "./contextmenu.js";
import { SnowFlake } from "./snowflake.js";
class User {
    static userids = {};
    owner;
    hypotheticalpfp;
    snowflake;
    avatar;
    username;
    bio;
    discriminator;
    pronouns;
    bot;
    public_flags;
    accent_color;
    banner;
    hypotheticalbanner;
    premium_since;
    premium_type;
    theme_colors;
    badge_ids;
    members = new WeakMap();
    status;
    clone() {
        return new User({
            username: this.username,
            id: this.id + "#clone",
            public_flags: this.public_flags,
            discriminator: this.discriminator,
            avatar: this.avatar,
            accent_color: this.accent_color,
            banner: this.banner,
            bio: this.bio.rawString,
            premium_since: this.premium_since,
            premium_type: this.premium_type,
            bot: this.bot,
            theme_colors: this.theme_colors,
            pronouns: this.pronouns,
            badge_ids: this.badge_ids
        }, this.owner);
    }
    getPresence(presence) {
        if (presence) {
            this.setstatus(presence.status);
        }
        else {
            this.setstatus("offline");
        }
    }
    setstatus(status) {
        this.status = status;
    }
    async getStatus() {
        if (this.status) {
            return this.status;
        }
        else {
            return "offline";
        }
    }
    get id() {
        return this.snowflake.id;
    }
    static contextmenu = new Contextmenu("User Menu");
    static setUpContextMenu() {
        this.contextmenu.addbutton("Copy user id", function () {
            navigator.clipboard.writeText(this.id);
        });
        this.contextmenu.addbutton("Message user", function () {
            fetch(this.info.api + "/users/@me/channels", { method: "POST",
                body: JSON.stringify({ "recipients": [this.id] }),
                headers: this.localuser.headers
            });
        });
    }
    static clear() {
        this.userids = {};
    }
    static checkuser(user, owner) {
        if (User.userids[user.id]) {
            return User.userids[user.id];
        }
        else {
            const tempuser = new User(user, owner, true);
            User.userids[user.id] = tempuser;
            return tempuser;
        }
    }
    get info() {
        return this.owner.info;
    }
    get localuser() {
        return this.owner;
    }
    constructor(userjson, owner, dontclone = false) {
        this.owner = owner;
        if (!owner) {
            console.error("missing localuser");
        }
        if (dontclone) {
            for (const thing of Object.keys(userjson)) {
                if (thing === "bio") {
                    this.bio = new MarkDown(userjson[thing], this.localuser);
                    continue;
                }
                if (thing === "id") {
                    this.snowflake = new SnowFlake(userjson[thing], this);
                    continue;
                }
                this[thing] = userjson[thing];
            }
            this.hypotheticalpfp = false;
        }
        else {
            return User.checkuser(userjson, owner);
        }
    }
    async resolvemember(guild) {
        return await Member.resolveMember(this, guild);
    }
    buildpfp() {
        const pfp = document.createElement('img');
        pfp.src = this.getpfpsrc();
        pfp.classList.add("pfp");
        pfp.classList.add("userid:" + this.id);
        return pfp;
    }
    async buildstatuspfp() {
        const div = document.createElement("div");
        div.style.position = "relative";
        const pfp = this.buildpfp();
        div.append(pfp);
        {
            const status = document.createElement("div");
            status.classList.add("statusDiv");
            switch (await this.getStatus()) {
                case "offline":
                    status.classList.add("offlinestatus");
                    break;
                case "online":
                default:
                    status.classList.add("onlinestatus");
                    break;
            }
            div.append(status);
        }
        return div;
    }
    userupdate(json) {
        if (json.avatar !== this.avatar) {
            console.log;
            this.changepfp(json.avatar);
        }
    }
    bind(html, guild = null) {
        if (guild && guild.id !== "@me") {
            Member.resolveMember(this, guild).then(_ => {
                if (_ === undefined) {
                    const error = document.createElement("span");
                    error.textContent = "!";
                    error.classList.add("membererror");
                    html.after(error);
                    return;
                }
                _.bind(html);
            }).catch(_ => {
                console.log(_);
            });
        }
        this.profileclick(html);
        User.contextmenu.bind(html, this);
    }
    static async resolve(id, localuser) {
        const json = await fetch(localuser.info.api.toString() + "/users/" + id + "/profile", { headers: localuser.headers }).then(_ => _.json());
        return new User(json, localuser);
    }
    changepfp(update) {
        this.avatar = update;
        this.hypotheticalpfp = false;
        const src = this.getpfpsrc();
        console.log(src);
        for (const thing of document.getElementsByClassName("userid:" + this.id)) {
            thing.src = src;
        }
    }
    getpfpsrc() {
        if (this.hypotheticalpfp) {
            return this.avatar;
        }
        if (this.avatar != null) {
            return this.info.cdn + "/avatars/" + this.id.replace("#clone", "") + "/" + this.avatar + ".png";
        }
        else {
            const int = new Number((BigInt(this.id) >> 22n) % 6n);
            return this.info.cdn + `/embed/avatars/${int}.png`;
        }
    }
    createjankpromises() {
        new Promise(_ => { });
    }
    async buildprofile(x, y) {
        if (Contextmenu.currentmenu != "") {
            Contextmenu.currentmenu.remove();
        }
        const div = document.createElement("div");
        if (this.accent_color) {
            div.style.setProperty("--accent_color", "#" + this.accent_color.toString(16).padStart(6, "0"));
        }
        else {
            div.style.setProperty("--accent_color", "transparent");
        }
        if (this.banner) {
            const banner = document.createElement("img");
            let src;
            if (!this.hypotheticalbanner) {
                src = this.info.cdn + "/avatars/" + this.id.replace("#clone", "") + "/" + this.banner + ".png";
            }
            else {
                src = this.banner;
            }
            console.log(src, this.banner);
            banner.src = src;
            banner.classList.add("banner");
            div.append(banner);
        }
        if (x !== -1) {
            div.style.left = x + "px";
            div.style.top = y + "px";
            div.classList.add("profile", "flexttb");
        }
        else {
            this.setstatus("online");
            div.classList.add("hypoprofile", "flexttb");
        }
        {
            const pfp = await this.buildstatuspfp();
            div.appendChild(pfp);
        }
        {
            const userbody = document.createElement("div");
            userbody.classList.add("infosection");
            div.appendChild(userbody);
            const usernamehtml = document.createElement("h2");
            usernamehtml.textContent = this.username;
            userbody.appendChild(usernamehtml);
            const discrimatorhtml = document.createElement("h3");
            discrimatorhtml.classList.add("tag");
            discrimatorhtml.textContent = this.username + "#" + this.discriminator;
            userbody.appendChild(discrimatorhtml);
            const pronounshtml = document.createElement("p");
            pronounshtml.textContent = this.pronouns;
            pronounshtml.classList.add("pronouns");
            userbody.appendChild(pronounshtml);
            const rule = document.createElement("hr");
            userbody.appendChild(rule);
            const biohtml = this.bio.makeHTML();
            userbody.appendChild(biohtml);
        }
        console.log(div);
        if (x !== -1) {
            Contextmenu.currentmenu = div;
            document.body.appendChild(div);
            Contextmenu.keepOnScreen(div);
        }
        return div;
    }
    profileclick(obj) {
        obj.onclick = e => {
            this.buildprofile(e.clientX, e.clientY);
            e.stopPropagation();
        };
    }
}
User.setUpContextMenu();
export { User };
