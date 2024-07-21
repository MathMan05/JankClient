//const usercache={};
import { Member } from "./member.js";
import { MarkDown } from "./markdown.js";
import { Contextmenu } from "./contextmenu.js";
class User {
    static userids = {};
    owner;
    hypotheticalpfp;
    id;
    avatar;
    username;
    bio;
    discriminator;
    pronouns;
    bot;
    static contextmenu = new Contextmenu("User Menu");
    static setUpContextMenu() {
        this.contextmenu.addbutton("Copy user id", function () {
            navigator.clipboard.writeText(this.id);
        });
        this.contextmenu.addbutton("Message user", function () {
            fetch(this.info.api.toString() + "/v9/users/@me/channels", { method: "POST",
                body: JSON.stringify({ "recipients": [this.id] }),
                headers: this.headers
            });
        });
    }
    static checkuser(userjson, owner) {
        if (User.userids[userjson.id]) {
            return User.userids[userjson.id];
        }
        else {
            const tempuser = new User(userjson, owner, true);
            User.userids[userjson.id] = tempuser;
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
                this[thing] = userjson[thing];
            }
            this.hypotheticalpfp = false;
        }
        else {
            return User.checkuser(userjson, owner);
        }
    }
    async resolvemember(guild) {
        await Member.resolve(this, guild);
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
        const div = document.createElement("table");
        if (x !== -1) {
            div.style.left = x + "px";
            div.style.top = y + "px";
            div.classList.add("profile");
        }
        else {
            div.classList.add("hypoprofile");
        }
        {
            const pfp = this.buildpfp();
            const pfprow = document.createElement("tr");
            div.appendChild(pfprow);
            pfprow.appendChild(pfp);
        }
        {
            const userbody = document.createElement("tr");
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
