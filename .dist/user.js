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
    premium_since;
    premium_type;
    theme_colors;
    badge_ids;
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
    get id() {
        return this.snowflake.id;
    }
    static contextmenu = new Contextmenu("User Menu");
    static setUpContextMenu() {
        this.contextmenu.addbutton("Copy user id", function () {
            navigator.clipboard.writeText(this.id.id);
        });
        this.contextmenu.addbutton("Message user", function () {
            fetch(this.info.api.toString() + "/v9/users/@me/channels", { method: "POST",
                body: JSON.stringify({ "recipients": [this.id.id] }),
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
        return await Member.resolve(this, guild);
    }
    buildpfp() {
        const pfp = document.createElement('img');
        pfp.src = this.getpfpsrc();
        pfp.classList.add("pfp");
        pfp.classList.add("userid:" + this.id);
        return pfp;
    }
    userupdate(json) {
        if (json.avatar !== this.avatar) {
            console.log;
            this.changepfp(json.avatar);
        }
    }
    bind(html, guild = null) {
        if (guild && guild.id !== "@me") {
            Member.resolve(this, guild).then(_ => {
                _.bind(html);
            }).catch(_ => {
                console.log(_);
            });
        }
        this.profileclick(html);
        User.contextmenu.bind(html, this);
    }
    static async resolve(id, localuser) {
        const json = await fetch(localuser.info.api.toString() + "/v9/users/" + id + "/profile", { headers: localuser.headers }).then(_ => _.json());
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
            return this.info.cdn.toString() + "avatars/" + this.id + "/" + this.avatar + ".png";
        }
        else {
            return this.info.cdn.toString() + "embed/avatars/3.png";
        }
    }
    createjankpromises() {
        new Promise(_ => { });
    }
    buildprofile(x, y) {
        if (Contextmenu.currentmenu != "") {
            Contextmenu.currentmenu.remove();
        }
        const div = document.createElement("div");
        if (x !== -1) {
            div.style.left = x + "px";
            div.style.top = y + "px";
            div.classList.add("profile", "flexttb");
        }
        else {
            div.classList.add("hypoprofile", "flexttb");
        }
        {
            const pfp = this.buildpfp();
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
