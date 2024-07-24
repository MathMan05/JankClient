"use strict";
import { Message } from "./message.js";
import { Voice } from "./audio.js";
import { Contextmenu } from "./contextmenu.js";
import { Fullscreen } from "./fullscreen.js";
import { Permissions } from "./permissions.js";
import { Settings, RoleList } from "./settings.js";
import { InfiniteScroller } from "./infiniteScroller.js";
import { SnowFlake } from "./snowflake.js";
class Channel {
    editing;
    type;
    owner;
    headers;
    name;
    id;
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
        }, null, _ => { console.log(_); return _.isAdmin(); });
        this.contextmenu.addbutton("Edit channel", function () {
            this.editChannel(this);
        }, null, _ => { return _.isAdmin(); });
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
            const order = this.guild.roles.findIndex(_ => _.id === a[0]) - this.guild.roles.findIndex(_ => _.id === b[0]);
            return order;
        });
    }
    setUpInfiniteScroller() {
        const ids = {};
        this.infinite = new InfiniteScroller(async function (id, offset) {
            const snowflake = SnowFlake.getSnowFlakeFromID(id, Message);
            if (offset === 1) {
                if (this.idToPrev.get(snowflake)) {
                    return this.idToPrev.get(snowflake)?.id;
                }
                else {
                    await this.grabBefore(id);
                    return this.idToPrev.get(snowflake)?.id;
                }
            }
            else {
                return this.idToNext.get(snowflake)?.id;
            }
        }.bind(this), function (id) {
            let res;
            const promise = new Promise(_ => { res = _; });
            const snowflake = SnowFlake.getSnowFlakeFromID(id, Message);
            const html = this.messageids.get(snowflake).buildhtml(this.messageids.get(this.idToPrev.get(snowflake)), promise);
            ids[id] = res;
            return html;
        }.bind(this), async function (id) {
            ids[id]();
            delete ids[id];
            return true;
        }.bind(this), this.readbottom.bind(this));
    }
    constructor(JSON, owner) {
        if (JSON === -1) {
            return;
        }
        this.editing;
        this.type = JSON.type;
        this.owner = owner;
        this.headers = this.owner.headers;
        this.name = JSON.name;
        this.id = new SnowFlake(JSON.id, this);
        this.parent_id = new SnowFlake(JSON.parent_id, undefined);
        this.parent = null;
        this.children = [];
        this.guild_id = JSON.guild_id;
        this.messageids = new Map();
        this.permission_overwrites = new Map();
        this.permission_overwritesar = [];
        for (const thing of JSON.permission_overwrites) {
            if (thing.id === "1182819038095799904" || thing.id === "1182820803700625444") {
                continue;
            }
            ;
            this.permission_overwrites.set(thing.id, new Permissions(thing.allow, thing.deny));
            this.permission_overwritesar.push([thing.id, this.permission_overwrites.get(thing.id)]);
        }
        this.topic = JSON.topic;
        this.nsfw = JSON.nsfw;
        this.position = JSON.position;
        this.lastreadmessageid = null;
        this.lastmessageid = SnowFlake.getSnowFlakeFromID(JSON.last_message_id, Message);
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
        this.lastreadmessageid = SnowFlake.getSnowFlakeFromID(json.last_message_id, Message);
        this.mentions = json.mention_count;
        this.mentions ??= 0;
        this.lastpin = json.last_pin_timestamp;
    }
    get hasunreads() {
        if (!this.hasPermission("VIEW_CHANNEL")) {
            return false;
        }
        return this.lastmessageid !== this.lastreadmessageid && this.type !== 4 && !!this.lastmessageid.id;
    }
    hasPermission(name, member = this.guild.member) {
        if (member.isAdmin()) {
            return true;
        }
        for (const thing of member.roles) {
            if (this.permission_overwrites.get(thing.id.id)) {
                let perm = this.permission_overwrites.get(thing.id.id).getPermission(name);
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
            this.addRoleToPerms(this.guild.roles.find(_ => _.name === "@everyone"));
        }
        return this.hasPermission("SEND_MESSAGES");
    }
    sortchildren() {
        this.children.sort((a, b) => { return a.position - b.position; });
    }
    resolveparent(guild) {
        this.parent = guild.channelids[this.parent_id?.id];
        this.parent ??= null;
        if (this.parent !== null) {
            this.parent.children.push(this);
        }
        return this.parent === null;
    }
    calculateReorder() {
        let position = -1;
        let build = [];
        for (const thing of this.children) {
            const thisthing = { id: thing.id, position: undefined, parent_id: undefined };
            if (thing.position < position) {
                thing.position = thisthing.position = position + 1;
            }
            position = thing.position;
            if (thing.move_id && thing.move_id !== thing.parent_id) {
                thing.parent_id = thing.move_id;
                thisthing.parent_id = thing.parent_id;
                thing.move_id = undefined;
                console.log(this.guild.channelids[thisthing.parent_id]);
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
            const decoration = document.createElement("b");
            decoration.textContent = "▼";
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
                addchannel.onclick = function () {
                    this.guild.createchannels(this.createChannel.bind(this));
                }.bind(this);
                this.coatDropDiv(decdiv, childrendiv);
            }
            div.appendChild(caps);
            caps.classList.add("capsflex");
            decdiv.classList.add("channeleffects");
            decdiv.classList.add("channel");
            Channel.contextmenu.bind(decdiv, this);
            decdiv["all"] = this;
            for (const channel of this.children) {
                childrendiv.appendChild(channel.createguildHTML(admin));
            }
            childrendiv.classList.add("channels");
            setTimeout(_ => { childrendiv.style.height = childrendiv.scrollHeight + 'px'; }, 100);
            decdiv.onclick = function () {
                if (decoration.textContent === "▼") { //
                    decoration.textContent = "▲";
                    //childrendiv.classList.add("colapsediv");
                    childrendiv.style.height = '0px';
                }
                else {
                    decoration.textContent = "▼";
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
            Channel.contextmenu.bind(div, this);
            if (admin) {
                this.coatDropDiv(div);
            }
            div["all"] = this;
            const myhtml = document.createElement("span");
            myhtml.textContent = this.name;
            if (this.type === 0) {
                const decoration = document.createElement("b");
                decoration.textContent = "#";
                div.appendChild(decoration);
                decoration.classList.add("space");
            }
            else if (this.type === 2) { //
                const decoration = document.createElement("b");
                decoration.textContent = "🕪";
                div.appendChild(decoration);
                decoration.classList.add("spacee");
            }
            else if (this.type === 5) { //
                const decoration = document.createElement("b");
                decoration.textContent = "📣";
                div.appendChild(decoration);
                decoration.classList.add("spacee");
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
        fetch(this.info.api.toString() + "/channels/" + this.id + "/messages/" + this.lastmessageid + "/ack", {
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
            event.preventDefault();
            if (container) {
                that.move_id = this.id;
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
                div.after(Channel.dragged[1]);
            }
            this.guild.calculateReorder();
        });
        return div;
    }
    createChannel(name, type) {
        fetch(this.info.api.toString() + "/guilds/" + this.guild.id + "/channels", {
            method: "POST",
            headers: this.headers,
            body: JSON.stringify({
                name: name,
                type: type,
                parent_id: this.id,
                permission_overwrites: [],
            })
        });
    }
    editChannel() {
        let name = this.name;
        let topic = this.topic;
        let nsfw = this.nsfw;
        const thisid = this.id;
        const thistype = this.type;
        const full = new Fullscreen(["hdiv",
            ["vdiv",
                ["textbox", "Channel name:", this.name, function () { name = this.value; }],
                ["mdbox", "Channel topic:", this.topic, function () { topic = this.value; }],
                ["checkbox", "NSFW Channel", this.nsfw, function () { nsfw = this.checked; }],
                ["button", "", "submit", () => {
                        fetch(this.info.api.toString() + "/channels/" + thisid, {
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
                    }]
            ]
        ]);
        full.show();
        console.log(full);
    }
    deleteChannel() {
        fetch(this.info.api.toString() + "/channels/" + this.id, {
            method: "DELETE",
            headers: this.headers
        });
    }
    setReplying(message) {
        if (this.replyingto) {
            this.replyingto.div.classList.remove("replying");
        }
        this.replyingto = message;
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
                this.replyingto.div.classList.remove("replying");
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
        const snowflake = SnowFlake.getSnowFlakeFromID(id, Message);
        if (snowflake.getObject()) {
            return snowflake.getObject();
        }
        else {
            const gety = await fetch(this.info.api.toString() + "/channels/" + this.id + "/messages?limit=1&around=" + id, { headers: this.headers });
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
        if (this.localuser.channelfocus && this.localuser.channelfocus.myhtml) {
            this.localuser.channelfocus.myhtml.classList.remove("viewChannel");
        }
        this.myhtml.classList.add("viewChannel");
        this.guild.prevchannel = this;
        this.localuser.channelfocus = this;
        const prom = this.infinite.delete();
        await this.putmessages();
        await prom;
        if (id !== Channel.genid) {
            return;
        }
        this.makereplybox();
        this.buildmessages();
        history.pushState(null, null, "/channels/" + this.guild_id + "/" + this.id);
        document.getElementById("channelname").textContent = "#" + this.name;
        console.log(this);
        document.getElementById("typebox").contentEditable = "" + this.canMessage;
    }
    lastmessage;
    async putmessages() {
        if (this.allthewayup) {
            return;
        }
        ;
        const j = await fetch(this.info.api.toString() + "/channels/" + this.id + "/messages?limit=100", {
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
            }
            prev = message;
            if (this.messageids.get(message.id) === undefined) {
                this.messageids.set(message.id, message);
            }
        }
    }
    delChannel(JSON) {
        const build = [];
        for (const thing of this.children) {
            if (thing.id !== JSON.id) {
                build.push(thing);
            }
        }
        this.children = build;
    }
    async grabBefore(id) {
        if (this.allthewayup) {
            return;
        }
        await fetch(this.info.api.toString() + "/channels/" + this.id + "/messages?before=" + id + "&limit=100", {
            headers: this.headers
        }).then((j) => { return j.json(); }).then(response => {
            let next;
            if (response.length === 0) {
                this.allthewayup = true;
            }
            let previd = SnowFlake.getSnowFlakeFromID(id, Message);
            for (const i in response) {
                let messager;
                if (!next) {
                    messager = new Message(response[i], this);
                }
                else {
                    messager = next;
                }
                if (response[+i + 1] !== undefined) {
                    next = new Message(response[+i + 1], this);
                }
                else {
                    next = undefined;
                    console.log("ohno", +i + 1);
                }
                if (this.messageids.get(messager.id) === undefined) {
                    this.idToNext.set(messager.id, previd);
                    this.idToPrev.set(previd, messager.id);
                    previd = messager.id;
                    this.messageids.set(messager.id, messager);
                }
                else {
                    console.log("How???");
                }
            }
            //out.buildmessages();
        });
        return;
    }
    buildmessage(message, next) {
        const built = message.buildhtml(next);
        document.getElementById("messages").prepend(built);
    }
    buildmessages() {
        const messages = document.getElementById("channelw");
        messages.innerHTML = "";
        let id;
        if (this.messageids.get(this.lastreadmessageid)) {
            id = this.lastreadmessageid;
        }
        else if (this.lastmessage.id) {
            id = this.goBackIds(this.lastmessage.id, 50);
            console.log("shouldn't");
        }
        messages.append(this.infinite.getDiv(id.id));
    }
    goBackIds(id, back) {
        while (back !== 0) {
            const nextid = this.idToPrev.get(id);
            if (nextid) {
                id = nextid;
                console.log(id);
                back--;
            }
            else {
                break;
            }
        }
        return id;
    }
    updateChannel(JSON) {
        this.type = JSON.type;
        this.name = JSON.name;
        this.parent_id = new SnowFlake(JSON.parent_id, undefined);
        this.parent = null;
        this.children = [];
        this.guild_id = JSON.guild_id;
        this.messageids = new Map();
        this.permission_overwrites = new Map();
        for (const thing of JSON.permission_overwrites) {
            if (thing.id === "1182819038095799904" || thing.id === "1182820803700625444") {
                continue;
            }
            ;
            this.permission_overwrites.set(thing.id, new Permissions(thing.allow, thing.deny));
            this.permission_overwritesar.push([thing.id, this.permission_overwrites.get(thing.id)]);
        }
        this.topic = JSON.topic;
        this.nsfw = JSON.nsfw;
    }
    typingstart() {
        if (this.typing > new Date().getTime()) {
            return;
        }
        this.typing = new Date().getTime() + 6000;
        fetch(this.info.api.toString() + "/channels/" + this.id + "/typing", {
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
                    "guild_id": replyingto.guild.id.id,
                    "channel_id": replyingto.channel.id.id,
                    "message_id": replyingto.id.id,
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
            console.log(body);
            return await fetch(this.info.api.toString() + "/channels/" + this.id + "/messages", {
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
                console.log(attachments[i]);
                formData.append("files[" + i + "]", attachments[i]);
            }
            return await fetch(this.info.api.toString() + "/channels/" + this.id + "/messages", {
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
        console.log(this.lastmessageid, messagez.id, ":3");
        this.idToNext.set(this.lastmessageid, messagez.id);
        this.idToPrev.set(messagez.id, this.lastmessageid);
        this.lastmessageid = messagez.id;
        this.messageids.set(messagez.id, messagez);
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
        this.infinite.addedBottom();
        if (messagez.author === this.localuser.user) {
            return;
        }
        if (this.localuser.lookingguild.prevchannel === this && document.hasFocus()) {
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
                imgurl ||= image.proxy_url;
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
        await fetch(this.info.api.toString() + "/channels/" + this.id + "/permissions/" + role.id, {
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
        this.permission_overwrites.set(role.id.id, perm);
        this.permission_overwritesar.push([role.id, perm]);
    }
    async updateRolePermissions(id, perms) {
        const permission = this.permission_overwrites.get(id);
        permission.allow = perms.allow;
        permission.deny = perms.deny;
        await fetch(this.info.api.toString() + "/channels/" + this.id + "/permissions/" + id, {
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
Channel.setupcontextmenu();
export { Channel };
