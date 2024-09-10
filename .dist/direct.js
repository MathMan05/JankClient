import { Guild } from "./guild.js";
import { Channel } from "./channel.js";
import { Message } from "./message.js";
import { User } from "./user.js";
import { Permissions } from "./permissions.js";
import { SnowFlake } from "./snowflake.js";
import { Contextmenu } from "./contextmenu.js";
class Direct extends Guild {
    getUnixTime() {
        throw new Error("Do not call this for Direct, it does not make sense");
    }
    constructor(json, owner) {
        super(-1, owner, null);
        this.message_notifications = 0;
        this.owner = owner;
        if (!this.localuser) {
            console.error("Owner was not included, please fix");
        }
        this.headers = this.localuser.headers;
        this.channels = [];
        this.channelids = {};
        this.properties = {};
        this.roles = [];
        this.roleids = new Map();
        this.prevchannel = undefined;
        this.properties.name = "Direct Messages";
        for (const thing of json) {
            const temp = new Group(thing, this);
            this.channels.push(temp);
            this.channelids[temp.id] = temp;
        }
        this.headchannels = this.channels;
    }
    createChannelpac(json) {
        const thischannel = new Group(json, this);
        this.channelids[thischannel.id] = thischannel;
        this.channels.push(thischannel);
        this.sortchannels();
        this.printServers();
        return thischannel;
    }
    delChannel(json) {
        const channel = this.channelids[json.id];
        super.delChannel(json);
        if (channel) {
            channel.del();
        }
    }
    giveMember(_member) {
        console.error("not a real guild, can't give member object");
    }
    getRole(ID) {
        return null;
    }
    hasRole(r) {
        return false;
    }
    isAdmin() {
        return false;
    }
    unreaddms() {
        for (const thing of this.channels) {
            thing.unreads();
        }
    }
}
const dmPermissions = new Permissions("0");
dmPermissions.setPermission("ADD_REACTIONS", 1);
dmPermissions.setPermission("VIEW_CHANNEL", 1);
dmPermissions.setPermission("SEND_MESSAGES", 1);
dmPermissions.setPermission("EMBED_LINKS", 1);
dmPermissions.setPermission("ATTACH_FILES", 1);
dmPermissions.setPermission("READ_MESSAGE_HISTORY", 1);
dmPermissions.setPermission("MENTION_EVERYONE", 1);
dmPermissions.setPermission("USE_EXTERNAL_EMOJIS", 1);
dmPermissions.setPermission("USE_APPLICATION_COMMANDS", 1);
dmPermissions.setPermission("USE_EXTERNAL_STICKERS", 1);
dmPermissions.setPermission("USE_EMBEDDED_ACTIVITIES", 1);
dmPermissions.setPermission("USE_SOUNDBOARD", 1);
dmPermissions.setPermission("USE_EXTERNAL_SOUNDS", 1);
dmPermissions.setPermission("SEND_VOICE_MESSAGES", 1);
dmPermissions.setPermission("SEND_POLLS", 1);
dmPermissions.setPermission("USE_EXTERNAL_APPS", 1);
dmPermissions.setPermission("CONNECT", 1);
dmPermissions.setPermission("SPEAK", 1);
dmPermissions.setPermission("STREAM", 1);
dmPermissions.setPermission("USE_VAD", 1);
class Group extends Channel {
    user;
    static contextmenu = new Contextmenu("channel menu");
    static setupcontextmenu() {
        this.contextmenu.addbutton("Copy DM id", function () {
            navigator.clipboard.writeText(this.id);
        });
        this.contextmenu.addbutton("Mark as read", function () {
            this.readbottom();
        });
        this.contextmenu.addbutton("Close DM", function () {
            this.deleteChannel();
        });
        this.contextmenu.addbutton("Copy user ID", function () {
            navigator.clipboard.writeText(this.user.id);
        });
    }
    constructor(json, owner) {
        super(-1, owner, json.id);
        this.owner = owner;
        this.headers = this.guild.headers;
        this.name = json.recipients[0]?.username;
        if (json.recipients[0]) {
            this.user = new User(json.recipients[0], this.localuser);
        }
        else {
            this.user = this.localuser.user;
        }
        this.name ??= this.localuser.user.username;
        this.parent_id = undefined;
        this.parent = null;
        this.children = [];
        this.guild_id = "@me";
        this.permission_overwrites = new Map();
        this.lastmessageid = json.last_message_id;
        this.mentions = 0;
        this.setUpInfiniteScroller();
        this.updatePosition();
    }
    updatePosition() {
        if (this.lastmessageid) {
            this.position = SnowFlake.stringToUnixTime(this.lastmessageid);
        }
        else {
            this.position = 0;
        }
        this.position = -Math.max(this.position, this.getUnixTime());
    }
    createguildHTML() {
        const div = document.createElement("div");
        Group.contextmenu.bindContextmenu(div, this, undefined);
        this.html = new WeakRef(div);
        div.classList.add("channeleffects");
        const myhtml = document.createElement("span");
        myhtml.textContent = this.name;
        div.appendChild(this.user.buildpfp());
        div.appendChild(myhtml);
        div["myinfo"] = this;
        div.onclick = _ => {
            this.getHTML();
        };
        return div;
    }
    async getHTML() {
        const id = ++Channel.genid;
        if (this.localuser.channelfocus) {
            this.localuser.channelfocus.infinite.delete();
        }
        if (this.guild !== this.localuser.lookingguild) {
            this.guild.loadGuild();
        }
        this.guild.prevchannel = this;
        this.localuser.channelfocus = this;
        const prom = this.infinite.delete();
        history.pushState(null, "", "/channels/" + this.guild_id + "/" + this.id);
        this.localuser.pageTitle("@" + this.name);
        document.getElementById("channelTopic").setAttribute("hidden", "");
        const loading = document.getElementById("loadingdiv");
        Channel.regenLoadingMessages();
        loading.classList.add("loading");
        this.rendertyping();
        await this.putmessages();
        await prom;
        if (id !== Channel.genid) {
            return;
        }
        this.buildmessages();
        document.getElementById("typebox").contentEditable = "" + true;
    }
    messageCreate(messagep) {
        const messagez = new Message(messagep.d, this);
        if (this.lastmessageid) {
            this.idToNext.set(this.lastmessageid, messagez.id);
            this.idToPrev.set(messagez.id, this.lastmessageid);
        }
        this.lastmessageid = messagez.id;
        if (messagez.author === this.localuser.user) {
            this.lastreadmessageid = messagez.id;
            if (this.myhtml) {
                this.myhtml.classList.remove("cunread");
            }
        }
        else {
            if (this.myhtml) {
                this.myhtml.classList.add("cunread");
            }
        }
        this.unreads();
        this.updatePosition();
        this.infinite.addedBottom();
        this.guild.sortchannels();
        if (this.myhtml) {
            const parrent = this.myhtml.parentElement;
            parrent.prepend(this.myhtml);
        }
        if (this === this.localuser.channelfocus) {
            if (!this.infinitefocus) {
                this.tryfocusinfinate();
            }
            this.infinite.addedBottom();
        }
        this.unreads();
        if (messagez.author === this.localuser.user) {
            return;
        }
        if (this.localuser.lookingguild?.prevchannel === this && document.hasFocus()) {
            return;
        }
        if (this.notification === "all") {
            this.notify(messagez);
        }
        else if (this.notification === "mentions" && messagez.mentionsuser(this.localuser.user)) {
            this.notify(messagez);
        }
    }
    notititle(message) {
        return message.author.username;
    }
    readbottom() {
        super.readbottom();
        this.unreads();
    }
    all = new WeakRef(document.createElement("div"));
    noti = new WeakRef(document.createElement("div"));
    del() {
        const all = this.all.deref();
        if (all) {
            all.remove();
        }
        if (this.myhtml) {
            this.myhtml.remove();
        }
    }
    unreads() {
        const sentdms = document.getElementById("sentdms"); //Need to change sometime
        const current = this.all.deref();
        if (this.hasunreads) {
            {
                const noti = this.noti.deref();
                if (noti) {
                    noti.textContent = this.mentions + "";
                    return;
                }
            }
            const div = document.createElement("div");
            div.classList.add("servernoti");
            const noti = document.createElement("div");
            noti.classList.add("unread", "notiunread", "pinged");
            noti.textContent = "" + this.mentions;
            this.noti = new WeakRef(noti);
            div.append(noti);
            const buildpfp = this.user.buildpfp();
            this.all = new WeakRef(div);
            buildpfp.classList.add("mentioned");
            div.append(buildpfp);
            sentdms.append(div);
            div.onclick = _ => {
                this.guild.loadGuild();
                this.getHTML();
            };
        }
        else if (current) {
            current.remove();
        }
        else {
        }
    }
    isAdmin() {
        return false;
    }
    hasPermission(name) {
        return dmPermissions.hasPermission(name);
    }
}
export { Direct, Group };
Group.setupcontextmenu();
