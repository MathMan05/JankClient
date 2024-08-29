"use strict";
import { Message } from "./message.js";
import { Voice } from "./audio.js";
import { Contextmenu } from "./contextmenu.js";
import { Dialog } from "./dialog.js";
import { Permissions } from "./permissions.js";
import { Settings } from "./settings.js";
import { Role, RoleList } from "./role.js";
import { InfiniteScroller } from "./infiniteScroller.js";
import { SnowFlake } from "./snowflake.js";
import { MarkDown } from "./markdown.js";
class Channel {
    editing;
    type;
    owner;
    headers;
    name;
    snowflake;
    parent_id;
    parent;
    children;
    guild_id;
    messageids;
    permission_overwrites;
    permission_overwritesar;
    topic;
    nsfw;
    position;
    lastreadmessageid;
    lastmessageid;
    mentions;
    lastpin;
    move_id;
    typing;
    message_notifications;
    allthewayup;
    static contextmenu = new Contextmenu("channel menu");
    replyingto;
    infinite;
    idToPrev = new Map();
    idToNext = new Map();
    messages = new Map();
    get id() {
        return this.snowflake.id;
    }
    static setupcontextmenu() {
        this.contextmenu.addbutton("Copy channel id", function () {
            console.log(this);
            navigator.clipboard.writeText(this.id);
        });
        this.contextmenu.addbutton("Mark as read", function () {
            console.log(this);
            this.readbottom();
        });
        this.contextmenu.addbutton("Settings[temp]", function () {
            this.generateSettings();
        });
        this.contextmenu.addbutton("Delete channel", function () {
            console.log(this);
            this.deleteChannel();
        }, null, function () { return this.isAdmin(); });
        this.contextmenu.addbutton("Edit channel", function () {
            this.editChannel();
        }, null, function () { return this.isAdmin(); });
        this.contextmenu.addbutton("Make invite", function () {
            this.createInvite();
        }, null, function () {
            return this.hasPermission("CREATE_INSTANT_INVITE") && this.type !== 4;
        });
        /*
        this.contextmenu.addbutton("Test button",function(){
            this.localuser.ws.send(JSON.stringify({
                "op": 14,
                "d": {
                    "guild_id": this.guild.id,
                    "channels": {
                        [this.id]: [
                            [
                                0,
                                99
                            ]
                        ]
                    }
                }
            }))
        },null);
        /**/
    }
    createInvite() {
        const div = document.createElement("div");
        div.classList.add("invitediv");
        const text = document.createElement("span");
        div.append(text);
        let uses = 0;
        let expires = 1800;
        const copycontainer = document.createElement("div");
        copycontainer.classList.add("copycontainer");
        const copy = document.createElement("img");
        copy.src = "/icons/copy.svg";
        copy.classList.add("copybutton", "svgtheme");
        copycontainer.append(copy);
        copycontainer.onclick = _ => {
            if (text.textContent) {
                navigator.clipboard.writeText(text.textContent);
            }
        };
        div.append(copycontainer);
        const update = () => {
            fetch(`${this.info.api}/channels/${this.id}/invites`, {
                method: "POST",
                headers: this.headers,
                body: JSON.stringify({
                    flags: 0,
                    target_type: null,
                    target_user_id: null,
                    max_age: expires + "",
                    max_uses: uses,
                    temporary: uses !== 0
                })
            }).then(_ => _.json()).then(json => {
                const params = new URLSearchParams("");
                params.set("instance", this.info.wellknown);
                const encoded = params.toString();
                text.textContent = `${location.origin}/invite/${json.code}?${encoded}`;
            });
        };
        update();
        new Dialog(["vdiv",
            ["title", "Invite people"],
            ["text", `to #${this.name} in ${this.guild.properties.name}`],
            ["select", "Expire after:", ["30 Minutes", "1 Hour", "6 Hours", "12 Hours", "1 Day", "7 Days", "30 Days", "Never"], function (e) {
                    expires = [1800, 3600, 21600, 43200, 86400, 604800, 2592000, 0][e.srcElement.selectedIndex];
                    update();
                }, 0],
            ["select", "Max uses:", ["No limit", "1 use", "5 uses", "10 uses", "25 uses", "50 uses", "100 uses"], function (e) {
                    uses = [0, 1, 5, 10, 25, 50, 100][e.srcElement.selectedIndex];
                    update();
                }, 0],
            ["html", div]
        ]).show();
    }
    generateSettings() {
        this.sortPerms();
        const settings = new Settings("Settings for " + this.name);
        const s1 = settings.addButton("roles");
        s1.options.push(new RoleList(this.permission_overwritesar, this.guild, this.updateRolePermissions.bind(this), true));
        settings.show();
    }
    sortPerms() {
        this.permission_overwritesar.sort((a, b) => {
            const order = this.guild.roles.findIndex(_ => _.snowflake === a[0]) - this.guild.roles.findIndex(_ => _.snowflake === b[0]);
            return order;
        });
    }
    setUpInfiniteScroller() {
        this.infinite = new InfiniteScroller(async function (id, offset) {
            const snowflake = id;
            if (offset === 1) {
                if (this.idToPrev.has(snowflake)) {
                    return this.idToPrev.get(snowflake);
                }
                else {
                    await this.grabBefore(id);
                    return this.idToPrev.get(snowflake);
                }
            }
            else {
                if (this.idToNext.has(snowflake)) {
                    return this.idToNext.get(snowflake);
                }
                else if (this.lastmessage?.id !== id) {
                    await this.grabAfter(id);
                    return this.idToNext.get(snowflake);
                }
                else {
                    console.log("at bottom");
                }
            }
        }.bind(this), async function (id) {
            //await new Promise(_=>{setTimeout(_,Math.random()*10)})
            const messgage = this.messages.get(id);
            try {
                if (messgage) {
                    const html = messgage.buildhtml();
                    return html;
                }
                else {
                    console.error(id + " not found");
                }
            }
            catch (e) {
                console.error(e);
            }
        }.bind(this), async function (id) {
            const message = this.messages.get(id);
            try {
                if (message) {
                    message.deleteDiv();
                }
            }
            catch (e) {
                console.error(e);
            }
            finally { }
        }.bind(this), this.readbottom.bind(this));
    }
    constructor(json, owner) {
        if (json === -1) {
            return;
        }
        this.editing;
        this.type = json.type;
        this.owner = owner;
        this.headers = this.owner.headers;
        this.name = json.name;
        this.snowflake = new SnowFlake(json.id, this);
        if (json.parent_id) {
            this.parent_id = SnowFlake.getSnowFlakeFromID(json.parent_id, Channel);
        }
        this.parent = null;
        this.children = [];
        this.guild_id = json.guild_id;
        this.messageids = new Map();
        this.permission_overwrites = new Map();
        this.permission_overwritesar = [];
        for (const thing of json.permission_overwrites) {
            if (thing.id === "1182819038095799904" || thing.id === "1182820803700625444") {
                continue;
            }
            ;
            this.permission_overwrites.set(thing.id, new Permissions(thing.allow, thing.deny));
            const permission = this.permission_overwrites.get(thing.id);
            if (permission) {
                this.permission_overwritesar.push([SnowFlake.getSnowFlakeFromID(thing.id, Role), permission]);
            }
        }
        this.topic = json.topic;
        this.nsfw = json.nsfw;
        this.position = json.position;
        this.lastreadmessageid = undefined;
        if (json.last_message_id) {
            this.lastmessageid = json.last_message_id;
        }
        else {
            this.lastmessageid = undefined;
        }
        this.setUpInfiniteScroller();
    }
    isAdmin() {
        return this.guild.isAdmin();
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
    readStateInfo(json) {
        this.lastreadmessageid = json.last_message_id;
        this.mentions = json.mention_count;
        this.mentions ??= 0;
        this.lastpin = json.last_pin_timestamp;
    }
    get hasunreads() {
        if (!this.hasPermission("VIEW_CHANNEL")) {
            return false;
        }
        return this.lastmessageid !== this.lastreadmessageid && this.type !== 4 && !!this.lastmessageid;
    }
    hasPermission(name, member = this.guild.member) {
        if (member.isAdmin()) {
            return true;
        }
        for (const thing of member.roles) {
            const premission = this.permission_overwrites.get(thing.id);
            if (premission) {
                let perm = premission.getPermission(name);
                if (perm) {
                    return perm === 1;
                }
            }
            if (thing.permissions.getPermission(name)) {
                return true;
            }
        }
        return false;
    }
    get canMessage() {
        if ((0 === this.permission_overwritesar.length) && this.hasPermission("MANAGE_CHANNELS")) {
            const role = this.guild.roles.find(_ => _.name === "@everyone");
            if (role) {
                this.addRoleToPerms(role);
            }
        }
        return this.hasPermission("SEND_MESSAGES");
    }
    sortchildren() {
        this.children.sort((a, b) => { return a.position - b.position; });
    }
    resolveparent(guild) {
        const parentid = this.parent_id?.id;
        if (!parentid)
            return false;
        this.parent = guild.channelids[parentid];
        this.parent ??= null;
        if (this.parent !== null) {
            this.parent.children.push(this);
        }
        return this.parent !== null;
    }
    calculateReorder() {
        let position = -1;
        let build = [];
        for (const thing of this.children) {
            const thisthing = { id: thing.snowflake, position: undefined, parent_id: undefined };
            if (thing.position < position) {
                thing.position = thisthing.position = position + 1;
            }
            position = thing.position;
            if (thing.move_id && thing.move_id !== thing.parent_id) {
                thing.parent_id = thing.move_id;
                thisthing.parent_id = thing.parent_id;
                thing.move_id = null;
                console.log(this.guild.channelids[thisthing.parent_id.id]);
            }
            if (thisthing.position || thisthing.parent_id) {
                build.push(thisthing);
            }
        }
        return build;
    }
    static dragged = [];
    createguildHTML(admin = false) {
        const div = document.createElement("div");
        if (!this.hasPermission("VIEW_CHANNEL")) {
            let quit = true;
            for (const thing of this.children) {
                if (thing.hasPermission("VIEW_CHANNEL")) {
                    quit = false;
                }
            }
            if (quit) {
                return div;
            }
        }
        div["all"] = this;
        div.draggable = admin;
        div.addEventListener("dragstart", (e) => { Channel.dragged = [this, div]; e.stopImmediatePropagation(); });
        div.addEventListener("dragend", () => { Channel.dragged = []; });
        if (this.type === 4) {
            this.sortchildren();
            const caps = document.createElement("div");
            const decdiv = document.createElement("div");
            const decoration = document.createElement("span");
            decoration.classList.add("svgtheme", "colaspeicon", "svg-category");
            decdiv.appendChild(decoration);
            const myhtml = document.createElement("p2");
            myhtml.textContent = this.name;
            decdiv.appendChild(myhtml);
            caps.appendChild(decdiv);
            const childrendiv = document.createElement("div");
            if (admin) {
                const addchannel = document.createElement("span");
                addchannel.textContent = "+";
                addchannel.classList.add("addchannel");
                caps.appendChild(addchannel);
                addchannel.onclick = _ => {
                    this.guild.createchannels(this.createChannel.bind(this));
                };
                this.coatDropDiv(decdiv, childrendiv);
            }
            div.appendChild(caps);
            caps.classList.add("capsflex");
            decdiv.classList.add("channeleffects");
            decdiv.classList.add("channel");
            Channel.contextmenu.bindContextmenu(decdiv, this, undefined);
            decdiv["all"] = this;
            for (const channel of this.children) {
                childrendiv.appendChild(channel.createguildHTML(admin));
            }
            childrendiv.classList.add("channels");
            setTimeout(_ => { childrendiv.style.height = childrendiv.scrollHeight + 'px'; }, 100);
            decdiv.onclick = function () {
                if (childrendiv.style.height !== '0px') {
                    decoration.classList.add("hiddencat");
                    //childrendiv.classList.add("colapsediv");
                    childrendiv.style.height = '0px';
                }
                else {
                    decoration.classList.remove("hiddencat");
                    //childrendiv.classList.remove("colapsediv")
                    childrendiv.style.height = childrendiv.scrollHeight + 'px';
                }
            };
            div.appendChild(childrendiv);
        }
        else {
            div.classList.add("channel");
            if (this.hasunreads) {
                div.classList.add("cunread");
            }
            Channel.contextmenu.bindContextmenu(div, this, undefined);
            if (admin) {
                this.coatDropDiv(div);
            }
            div["all"] = this;
            const myhtml = document.createElement("span");
            myhtml.textContent = this.name;
            if (this.type === 0) {
                const decoration = document.createElement("span");
                div.appendChild(decoration);
                decoration.classList.add("space", "svgtheme", "svg-channel");
            }
            else if (this.type === 2) { //
                const decoration = document.createElement("span");
                div.appendChild(decoration);
                decoration.classList.add("space", "svgtheme", "svg-voice");
            }
            else if (this.type === 5) { //
                const decoration = document.createElement("span");
                div.appendChild(decoration);
                decoration.classList.add("space", "svgtheme", "svg-announce");
            }
            else {
                console.log(this.type);
            }
            div.appendChild(myhtml);
            div.onclick = _ => {
                this.getHTML();
            };
        }
        return div;
    }
    get myhtml() {
        const search = document.getElementById("channels").children[0].children;
        if (this.guild !== this.localuser.lookingguild) {
            return null;
        }
        else if (this.parent) {
            for (const thing of search) {
                if (thing["all"] === this.parent) {
                    for (const thing2 of thing.children[1].children) {
                        if (thing2["all"] === this) {
                            return thing2;
                        }
                    }
                }
            }
        }
        else {
            for (const thing of search) {
                if (thing["all"] === this) {
                    return thing;
                }
            }
        }
        return null;
    }
    readbottom() {
        if (!this.hasunreads) {
            return;
        }
        fetch(this.info.api + "/channels/" + this.snowflake + "/messages/" + this.lastmessageid + "/ack", {
            method: "POST",
            headers: this.headers,
            body: JSON.stringify({})
        });
        this.lastreadmessageid = this.lastmessageid;
        this.guild.unreads();
        if (this.myhtml !== null) {
            this.myhtml.classList.remove("cunread");
        }
    }
    coatDropDiv(div, container = false) {
        div.addEventListener("dragenter", (event) => {
            console.log("enter");
            event.preventDefault();
        });
        div.addEventListener("dragover", (event) => {
            event.preventDefault();
        });
        div.addEventListener("drop", (event) => {
            const that = Channel.dragged[0];
            if (!that)
                return;
            event.preventDefault();
            if (container) {
                that.move_id = this.snowflake;
                if (that.parent) {
                    that.parent.children.splice(that.parent.children.indexOf(that), 1);
                }
                that.parent = this;
                container.prepend(Channel.dragged[1]);
                this.children.unshift(that);
            }
            else {
                console.log(this, Channel.dragged);
                that.move_id = this.parent_id;
                if (that.parent) {
                    that.parent.children.splice(that.parent.children.indexOf(that), 1);
                }
                else {
                    this.guild.headchannels.splice(this.guild.headchannels.indexOf(that), 1);
                }
                that.parent = this.parent;
                if (that.parent) {
                    const build = [];
                    for (let i = 0; i < that.parent.children.length; i++) {
                        build.push(that.parent.children[i]);
                        if (that.parent.children[i] === this) {
                            build.push(that);
                        }
                    }
                    that.parent.children = build;
                }
                else {
                    const build = [];
                    for (let i = 0; i < this.guild.headchannels.length; i++) {
                        build.push(this.guild.headchannels[i]);
                        if (this.guild.headchannels[i] === this) {
                            build.push(that);
                        }
                    }
                    this.guild.headchannels = build;
                }
                if (Channel.dragged[1]) {
                    div.after(Channel.dragged[1]);
                }
            }
            this.guild.calculateReorder();
        });
        return div;
    }
    createChannel(name, type) {
        fetch(this.info.api + "/guilds/" + this.guild.id + "/channels", {
            method: "POST",
            headers: this.headers,
            body: JSON.stringify({
                name: name,
                type: type,
                parent_id: this.snowflake,
                permission_overwrites: [],
            })
        });
    }
    editChannel() {
        let name = this.name;
        let topic = this.topic;
        let nsfw = this.nsfw;
        const thisid = this.snowflake;
        const thistype = this.type;
        const full = new Dialog(["hdiv",
            ["vdiv",
                ["textbox", "Channel name:", this.name, function () { name = this.value; }],
                ["mdbox", "Channel topic:", this.topic, function () { topic = this.value; }],
                ["checkbox", "NSFW Channel", this.nsfw, function () { nsfw = this.checked; }],
                ["button", "", "submit", () => {
                        fetch(this.info.api + "/channels/" + thisid, {
                            method: "PATCH",
                            headers: this.headers,
                            body: JSON.stringify({
                                "name": name,
                                "type": thistype,
                                "topic": topic,
                                "bitrate": 64000,
                                "user_limit": 0,
                                "nsfw": nsfw,
                                "flags": 0,
                                "rate_limit_per_user": 0
                            })
                        });
                        console.log(full);
                        full.hide();
                    }]]
        ]);
        full.show();
        console.log(full);
    }
    deleteChannel() {
        fetch(this.info.api + "/channels/" + this.snowflake, {
            method: "DELETE",
            headers: this.headers
        });
    }
    setReplying(message) {
        if (this.replyingto?.div) {
            this.replyingto.div.classList.remove("replying");
        }
        this.replyingto = message;
        if (!this.replyingto?.div)
            return;
        console.log(message);
        this.replyingto.div.classList.add("replying");
        this.makereplybox();
    }
    makereplybox() {
        const replybox = document.getElementById("replybox");
        if (this.replyingto) {
            replybox.innerHTML = "";
            const span = document.createElement("span");
            span.textContent = "Replying to " + this.replyingto.author.username;
            const X = document.createElement("button");
            X.onclick = _ => {
                if (this.replyingto?.div) {
                    this.replyingto.div.classList.remove("replying");
                }
                replybox.classList.add("hideReplyBox");
                this.replyingto = null;
                replybox.innerHTML = "";
            };
            replybox.classList.remove("hideReplyBox");
            X.textContent = "⦻";
            X.classList.add("cancelReply");
            replybox.append(span);
            replybox.append(X);
        }
        else {
            replybox.classList.add("hideReplyBox");
        }
    }
    async getmessage(id) {
        const message = this.messages.get(id);
        if (message) {
            return message;
        }
        else {
            const gety = await fetch(this.info.api + "/channels/" + this.snowflake + "/messages?limit=1&around=" + id, { headers: this.headers });
            const json = await gety.json();
            return new Message(json[0], this);
        }
    }
    static genid = 0;
    async getHTML() {
        const id = ++Channel.genid;
        if (this.guild !== this.localuser.lookingguild) {
            this.guild.loadGuild();
        }
        if (this.localuser.channelfocus) {
            this.localuser.channelfocus.infinite.delete();
        }
        if (this.localuser.channelfocus && this.localuser.channelfocus.myhtml) {
            this.localuser.channelfocus.myhtml.classList.remove("viewChannel");
        }
        if (this.myhtml) {
            this.myhtml.classList.add("viewChannel");
        }
        this.guild.prevchannel = this;
        this.localuser.channelfocus = this;
        const prom = this.infinite.delete();
        history.pushState(null, "", "/channels/" + this.guild_id + "/" + this.snowflake);
        this.localuser.pageTitle("#" + this.name);
        const channelTopic = document.getElementById("channelTopic");
        if (this.topic) {
            channelTopic.innerHTML = new MarkDown(this.topic, this).makeHTML().innerHTML;
            channelTopic.removeAttribute("hidden");
        }
        else
            channelTopic.setAttribute("hidden", "");
        const loading = document.getElementById("loadingdiv");
        Channel.regenLoadingMessages();
        loading.classList.add("loading");
        await this.putmessages();
        await prom;
        if (id !== Channel.genid) {
            return;
        }
        this.makereplybox();
        await this.buildmessages();
        //loading.classList.remove("loading");
        console.log(this);
        document.getElementById("typebox").contentEditable = "" + this.canMessage;
    }
    static regenLoadingMessages() {
        const loading = document.getElementById("loadingdiv");
        loading.innerHTML = "";
        for (let i = 0; i < 15; i++) {
            const div = document.createElement("div");
            div.classList.add("loadingmessage");
            if (Math.random() < .5) {
                const pfp = document.createElement("div");
                pfp.classList.add("loadingpfp");
                const username = document.createElement("div");
                username.style.width = Math.floor(Math.random() * 96 * 1.5 + 40) + "px";
                username.classList.add("loadingcontent");
                div.append(pfp, username);
            }
            const content = document.createElement("div");
            content.style.width = Math.floor(Math.random() * 96 * 3 + 40) + "px";
            content.style.height = Math.floor(Math.random() * 3 + 1) * 20 + "px";
            content.classList.add("loadingcontent");
            div.append(content);
            loading.append(div);
        }
    }
    lastmessage;
    async putmessages() {
        if (this.allthewayup) {
            return;
        }
        ;
        if (this.lastreadmessageid && this.messages.has(this.lastreadmessageid)) {
            return;
        }
        const j = await fetch(this.info.api + "/channels/" + this.snowflake + "/messages?limit=100", {
            headers: this.headers,
        });
        const response = await j.json();
        if (response.length !== 100) {
            this.allthewayup = true;
        }
        let prev = undefined;
        for (const thing of response) {
            const message = new Message(thing, this);
            if (prev) {
                this.idToNext.set(message.id, prev.id);
                this.idToPrev.set(prev.id, message.id);
            }
            else {
                this.lastmessage = message;
                this.lastmessageid = message.id;
            }
            prev = message;
            if (this.messageids.get(message.snowflake) === undefined) {
                this.messageids.set(message.snowflake, message);
            }
        }
    }
    delChannel(json) {
        const build = [];
        for (const thing of this.children) {
            if (thing.id !== json.id) {
                build.push(thing);
            }
        }
        this.children = build;
    }
    async grabAfter(id) {
        if (id === this.lastmessage?.id) {
            return;
        }
        await fetch(this.info.api + "/channels/" + this.id + "/messages?limit=100&after=" + id, {
            headers: this.headers
        }).then((j) => { return j.json(); }).then(response => {
            let previd = id;
            for (const i in response) {
                let messager;
                let willbreak = false;
                if (!SnowFlake.hasSnowFlakeFromID(response[i].id, Message)) {
                    messager = new Message(response[i], this);
                }
                else {
                    messager = SnowFlake.getSnowFlakeFromID(response[i].id, Message).getObject();
                    willbreak = true;
                }
                this.idToPrev.set(messager.id, previd);
                this.idToNext.set(previd, messager.id);
                previd = messager.id;
                this.messageids.set(messager.snowflake, messager);
                if (willbreak) {
                    break;
                }
            }
            //out.buildmessages();
        });
        return;
    }
    topid;
    async grabBefore(id) {
        if (this.topid && id === this.topid) {
            return;
        }
        await fetch(this.info.api + "/channels/" + this.id + "/messages?before=" + id + "&limit=100", {
            headers: this.headers
        }).then((j) => { return j.json(); }).then((response) => {
            if (response.length < 100) {
                this.allthewayup = true;
                if (response.length === 0) {
                    this.topid = id;
                }
            }
            let previd = id;
            for (const i in response) {
                let messager;
                let willbreak = false;
                if (this.messages.has(response[i].id)) {
                    console.log("flaky");
                    messager = this.messages.get(response[i].id);
                    willbreak = true;
                }
                else {
                    messager = new Message(response[i], this);
                }
                this.idToNext.set(messager.id, previd);
                this.idToPrev.set(previd, messager.id);
                previd = messager.id;
                this.messageids.set(messager.snowflake, messager);
                if (+i === response.length - 1 && response.length < 100) {
                    this.topid = previd;
                }
                if (willbreak) {
                    break;
                }
            }
        });
        return;
    }
    /**
     * Please dont use this, its not implemented.
     * @deprecated
     * @todo
     **/
    async grabArround(id) {
        throw new Error("please don't call this, no one has implemented it :P");
    }
    async buildmessages() {
        /*
        if(((!this.lastmessage)||(!this.lastmessage.snowflake)||(!this.goBackIds(this.lastmessage.snowflake,50,false)))&&this.lastreadmessageid){
            await this.grabAfter(this.lastreadmessageid.id);
        }
        */
        this.infinitefocus = false;
        this.tryfocusinfinate();
    }
    infinitefocus = false;
    async tryfocusinfinate() {
        if (this.infinitefocus)
            return;
        this.infinitefocus = true;
        const messages = document.getElementById("channelw");
        for (const thing of messages.getElementsByClassName("messagecontainer")) {
            thing.remove();
        }
        const loading = document.getElementById("loadingdiv");
        const removetitle = document.getElementById("removetitle");
        //messages.innerHTML="";
        let id;
        if (this.lastreadmessageid && this.messages.has(this.lastreadmessageid)) {
            id = this.lastreadmessageid;
        }
        else if (this.lastreadmessageid && (id = this.findClosest(this.lastreadmessageid))) {
        }
        else if (this.lastmessageid && this.messages.has(this.lastmessageid)) {
            id = this.goBackIds(this.lastmessageid, 50);
        }
        if (!id) {
            if (!removetitle) {
                const title = document.createElement("h2");
                title.id = "removetitle";
                title.textContent = "No messages appear to be here, be the first to say something!";
                title.classList.add("titlespace");
                messages.append(title);
            }
            this.infinitefocus = false;
            loading.classList.remove("loading");
            return;
        }
        else if (removetitle) {
            removetitle.remove();
        }
        messages.append(await this.infinite.getDiv(id));
        this.infinite.updatestuff();
        this.infinite.watchForChange().then(async (_) => {
            //await new Promise(resolve => setTimeout(resolve, 0));
            this.infinite.focus(id, false); //if someone could figure out how to make this work correctly without this, that's be great :P
            loading.classList.remove("loading");
        });
        //this.infinite.focus(id.id,false);
    }
    goBackIds(id, back, returnifnotexistant = true) {
        while (back !== 0) {
            const nextid = this.idToPrev.get(id);
            if (nextid) {
                id = nextid;
                back--;
            }
            else {
                if (returnifnotexistant) {
                    break;
                }
                else {
                    return undefined;
                }
            }
        }
        return id;
    }
    findClosest(id) {
        if (!this.lastmessageid || !id)
            return;
        let flake = this.lastmessageid;
        const time = Number((BigInt(id) >> 22n) + 1420070400000n);
        let flaketime = Number((BigInt(flake) >> 22n) + 1420070400000n);
        while (flake && time < flaketime) {
            flake = this.idToPrev.get(flake);
            if (!flake) {
                return undefined;
            }
            flaketime = Number((BigInt(flake) >> 22n) + 1420070400000n);
        }
        return flake;
    }
    updateChannel(json) {
        this.type = json.type;
        this.name = json.name;
        this.parent_id = SnowFlake.getSnowFlakeFromID(json.parent_id, Channel);
        this.parent = null;
        this.children = [];
        this.guild_id = json.guild_id;
        this.messageids = new Map();
        this.permission_overwrites = new Map();
        for (const thing of json.permission_overwrites) {
            if (thing.id === "1182819038095799904" || thing.id === "1182820803700625444") {
                continue;
            }
            ;
            this.permission_overwrites.set(thing.id, new Permissions(thing.allow, thing.deny));
            const permisions = this.permission_overwrites.get(thing.id);
            if (permisions) {
                this.permission_overwritesar.push([SnowFlake.getSnowFlakeFromID(thing.id, Role), permisions]);
            }
        }
        this.topic = json.topic;
        this.nsfw = json.nsfw;
    }
    typingstart() {
        if (this.typing > new Date().getTime()) {
            return;
        }
        this.typing = new Date().getTime() + 6000;
        fetch(this.info.api + "/channels/" + this.snowflake + "/typing", {
            method: "POST",
            headers: this.headers
        });
    }
    get notification() {
        let notinumber = this.message_notifications;
        if (+notinumber === 3) {
            notinumber = null;
        }
        notinumber ??= this.guild.message_notifications;
        switch (+notinumber) {
            case 0:
                return "all";
            case 1:
                return "mentions";
            case 2:
                return "none";
            case 3:
                return "default";
        }
    }
    async sendMessage(content, { attachments = [], embeds = [], replyingto = null }) {
        let replyjson;
        if (replyingto) {
            replyjson =
                {
                    "guild_id": replyingto.guild.id,
                    "channel_id": replyingto.channel.id,
                    "message_id": replyingto.id,
                };
        }
        ;
        if (attachments.length === 0) {
            const body = {
                content: content,
                nonce: Math.floor(Math.random() * 1000000000),
                message_reference: undefined
            };
            if (replyjson) {
                body.message_reference = replyjson;
            }
            return await fetch(this.info.api + "/channels/" + this.snowflake + "/messages", {
                method: "POST",
                headers: this.headers,
                body: JSON.stringify(body)
            });
        }
        else {
            const formData = new FormData();
            const body = {
                content: content,
                nonce: Math.floor(Math.random() * 1000000000),
                message_reference: undefined
            };
            if (replyjson) {
                body.message_reference = replyjson;
            }
            formData.append('payload_json', JSON.stringify(body));
            for (const i in attachments) {
                formData.append("files[" + i + "]", attachments[i]);
            }
            return await fetch(this.info.api + "/channels/" + this.snowflake + "/messages", {
                method: 'POST',
                body: formData,
                headers: { "Authorization": this.headers.Authorization }
            });
        }
    }
    messageCreate(messagep) {
        if (!this.hasPermission("VIEW_CHANNEL")) {
            return;
        }
        const messagez = new Message(messagep.d, this);
        this.lastmessage = messagez;
        if (this.lastmessageid) {
            this.idToNext.set(this.lastmessageid, messagez.id);
            this.idToPrev.set(messagez.id, this.lastmessageid);
        }
        this.lastmessageid = messagez.id;
        this.messageids.set(messagez.snowflake, messagez);
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
        this.guild.unreads();
        if (this === this.localuser.channelfocus) {
            if (!this.infinitefocus) {
                this.tryfocusinfinate();
            }
            this.infinite.addedBottom();
        }
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
        return message.author.username + " > " + this.guild.properties.name + " > " + this.name;
    }
    notify(message, deep = 0) {
        Voice.noises(Voice.getNotificationSound());
        if (!("Notification" in window)) {
        }
        else if (Notification.permission === "granted") {
            let noticontent = message.content.textContent;
            if (message.embeds[0]) {
                noticontent ||= message.embeds[0].json.title;
                noticontent ||= message.content.textContent;
            }
            noticontent ||= "Blank Message";
            let imgurl = null;
            const images = message.getimages();
            if (images.length) {
                const image = images[0];
                if (image.proxy_url) {
                    imgurl ||= image.proxy_url;
                }
                imgurl ||= image.url;
            }
            const notification = new Notification(this.notititle(message), {
                body: noticontent,
                icon: message.author.getpfpsrc(),
                image: imgurl,
            });
            notification.addEventListener("click", _ => {
                window.focus();
                this.getHTML();
            });
        }
        else if (Notification.permission !== "denied") {
            Notification.requestPermission().then(() => {
                if (deep === 3) {
                    return;
                }
                ;
                this.notify(message, deep + 1);
            });
        }
    }
    async addRoleToPerms(role) {
        await fetch(this.info.api + "/channels/" + this.snowflake + "/permissions/" + role.snowflake, {
            method: "PUT",
            headers: this.headers,
            body: JSON.stringify({
                allow: "0",
                deny: "0",
                id: role.id,
                type: 0
            })
        });
        const perm = new Permissions("0", "0");
        this.permission_overwrites.set(role.id, perm);
        this.permission_overwritesar.push([role.snowflake, perm]);
    }
    async updateRolePermissions(id, perms) {
        const permission = this.permission_overwrites.get(id);
        if (permission) {
            permission.allow = perms.allow;
            permission.deny = perms.deny;
            await fetch(this.info.api + "/channels/" + this.snowflake + "/permissions/" + id, {
                method: "PUT",
                headers: this.headers,
                body: JSON.stringify({
                    allow: permission.allow.toString(),
                    deny: permission.deny.toString(),
                    id: id,
                    type: 0
                })
            });
        }
    }
}
Channel.setupcontextmenu();
export { Channel };
