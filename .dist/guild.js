import { Channel } from "./channel.js";
import { Contextmenu } from "./contextmenu.js";
import { Role, RoleList } from "./role.js";
import { Dialog } from "./dialog.js";
import { Member } from "./member.js";
import { Settings } from "./settings.js";
import { SnowFlake } from "./snowflake.js";
import { User } from "./user.js";
class Guild extends SnowFlake {
    owner;
    headers;
    channels;
    channelids;
    properties;
    member_count;
    roles;
    roleids;
    prevchannel;
    message_notifications;
    headchannels;
    position;
    parent_id;
    member;
    html;
    emojis;
    large;
    static contextmenu = new Contextmenu("guild menu");
    static setupcontextmenu() {
        Guild.contextmenu.addbutton("Copy Guild id", function () {
            navigator.clipboard.writeText(this.id);
        });
        Guild.contextmenu.addbutton("Mark as read", function () {
            this.markAsRead();
        });
        Guild.contextmenu.addbutton("Notifications", function () {
            this.setnotifcation();
        });
        Guild.contextmenu.addbutton("Leave guild", function () {
            this.confirmleave();
        }, null, function (_) {
            return this.properties.owner_id !== this.member.user.id;
        });
        Guild.contextmenu.addbutton("Delete guild", function () {
            this.confirmDelete();
        }, null, function (_) {
            return this.properties.owner_id === this.member.user.id;
        });
        Guild.contextmenu.addbutton("Create invite", function () {
        }, null, _ => true, _ => false);
        Guild.contextmenu.addbutton("Settings[temp]", function () {
            this.generateSettings();
        });
        /* -----things left for later-----
        guild.contextmenu.addbutton("Leave Guild",function(){
            console.log(this)
            this.deleteChannel();
        },null,_=>{return thisuser.isAdmin()})

        guild.contextmenu.addbutton("Mute Guild",function(){
            editchannelf(this);
        },null,_=>{return thisuser.isAdmin()})
        */
    }
    generateSettings() {
        const settings = new Settings("Settings for " + this.properties.name);
        const s1 = settings.addButton("roles");
        const permlist = [];
        for (const thing of this.roles) {
            permlist.push([thing, thing.permissions]);
        }
        s1.options.push(new RoleList(permlist, this, this.updateRolePermissions.bind(this)));
        settings.show();
    }
    constructor(json, owner, member) {
        if (json === -1 || member === null) {
            super("@me");
            return;
        }
        if (json.stickers.length) {
            console.log(json.stickers, ":3");
        }
        super(json.id);
        this.large = json.large;
        this.member_count = json.member_count;
        this.emojis = json.emojis;
        this.owner = owner;
        this.headers = this.owner.headers;
        this.channels = [];
        this.channelids = {};
        this.properties = json.properties;
        this.roles = [];
        this.roleids = new Map();
        this.prevchannel = undefined;
        this.message_notifications = 0;
        for (const roley of json.roles) {
            const roleh = new Role(roley, this);
            this.roles.push(roleh);
            this.roleids.set(roleh.id, roleh);
        }
        if (member instanceof User) {
            Member.resolveMember(member, this).then(_ => {
                if (_) {
                    this.member = _;
                }
                else {
                    console.error("Member was unable to resolve");
                }
            });
        }
        else {
            Member.new(member, this).then(_ => {
                if (_) {
                    this.member = _;
                }
            });
        }
        this.perminfo ??= { channels: {} };
        for (const thing of json.channels) {
            const temp = new Channel(thing, this);
            this.channels.push(temp);
            this.channelids[temp.id] = temp;
        }
        this.headchannels = [];
        for (const thing of this.channels) {
            const parent = thing.resolveparent(this);
            if (!parent) {
                this.headchannels.push(thing);
            }
        }
    }
    get perminfo() {
        return this.localuser.perminfo.guilds[this.id];
    }
    set perminfo(e) {
        this.localuser.perminfo.guilds[this.id] = e;
    }
    notisetting(settings) {
        this.message_notifications = settings.message_notifications;
    }
    setnotifcation() {
        let noti = this.message_notifications;
        const notiselect = new Dialog(["vdiv",
            ["radio", "select notifications type",
                ["all", "only mentions", "none"],
                function (e) {
                    noti = ["all", "only mentions", "none"].indexOf(e);
                },
                noti
            ],
            ["button", "", "submit", _ => {
                    //
                    fetch(this.info.api + `/users/@me/guilds/${this.id}/settings/`, {
                        method: "PATCH",
                        headers: this.headers,
                        body: JSON.stringify({
                            message_notifications: noti
                        })
                    });
                    this.message_notifications = noti;
                }]
        ]);
        notiselect.show();
    }
    confirmleave() {
        const full = new Dialog([
            "vdiv",
            ["title",
                "Are you sure you want to leave?"
            ],
            ["hdiv",
                ["button",
                    "",
                    "Yes, I'm sure",
                    _ => {
                        this.leave().then(_ => {
                            full.hide();
                        });
                    }
                ],
                ["button",
                    "",
                    "Nevermind",
                    _ => {
                        full.hide();
                    }
                ]
            ]
        ]);
        full.show();
    }
    async leave() {
        return fetch(this.info.api + "/users/@me/guilds/" + this.id, {
            method: "DELETE",
            headers: this.headers
        });
    }
    printServers() {
        let build = "";
        for (const thing of this.headchannels) {
            build += (thing.name + ":" + thing.position) + "\n";
            for (const thingy of thing.children) {
                build += ("   " + thingy.name + ":" + thingy.position) + "\n";
            }
        }
        console.log(build);
    }
    calculateReorder() {
        let position = -1;
        const build = [];
        for (const thing of this.headchannels) {
            const thisthing = { id: thing.id, position: undefined, parent_id: undefined };
            if (thing.position <= position) {
                thing.position = (thisthing.position = position + 1);
            }
            position = thing.position;
            console.log(position);
            if (thing.move_id && thing.move_id !== thing.parent_id) {
                thing.parent_id = thing.move_id;
                thisthing.parent_id = thing.parent?.id;
                thing.move_id = undefined;
            }
            if (thisthing.position || thisthing.parent_id) {
                build.push(thisthing);
            }
            if (thing.children.length > 0) {
                const things = thing.calculateReorder();
                for (const thing of things) {
                    build.push(thing);
                }
            }
        }
        console.log(build);
        this.printServers();
        if (build.length === 0) {
            return;
        }
        const serverbug = false;
        if (serverbug) {
            for (const thing of build) {
                console.log(build, thing);
                fetch(this.info.api + "/guilds/" + this.id + "/channels", {
                    method: "PATCH",
                    headers: this.headers,
                    body: JSON.stringify([thing])
                });
            }
        }
        else {
            fetch(this.info.api + "/guilds/" + this.id + "/channels", {
                method: "PATCH",
                headers: this.headers,
                body: JSON.stringify(build)
            });
        }
    }
    get localuser() {
        return this.owner;
    }
    get info() {
        return this.owner.info;
    }
    sortchannels() {
        this.headchannels.sort((a, b) => {
            return a.position - b.position;
        });
    }
    generateGuildIcon() {
        const divy = document.createElement("div");
        divy.classList.add("servernoti");
        const noti = document.createElement("div");
        noti.classList.add("unread");
        divy.append(noti);
        this.localuser.guildhtml.set(this.id, divy);
        if (this.properties.icon != null) {
            const img = document.createElement("img");
            img.classList.add("pfp", "servericon");
            img.src = this.info.cdn + "/icons/" + this.properties.id + "/" + this.properties.icon + ".png";
            divy.appendChild(img);
            img.onclick = () => {
                console.log(this.loadGuild);
                this.loadGuild();
                this.loadChannel();
            };
            Guild.contextmenu.bindContextmenu(img, this, undefined);
        }
        else {
            const div = document.createElement("div");
            const build = this.properties.name.replace(/'s /g, " ").replace(/\w+/g, word => word[0]).replace(/\s/g, "");
            div.textContent = build;
            div.classList.add("blankserver", "servericon");
            divy.appendChild(div);
            div.onclick = () => {
                this.loadGuild();
                this.loadChannel();
            };
            Guild.contextmenu.bindContextmenu(div, this, undefined);
        }
        return divy;
    }
    confirmDelete() {
        let confirmname = "";
        const full = new Dialog([
            "vdiv",
            ["title",
                "Are you sure you want to delete " + this.properties.name + "?"
            ],
            ["textbox",
                "Name of server:",
                "",
                function () {
                    confirmname = this.value;
                }
            ],
            ["hdiv",
                ["button",
                    "",
                    "Yes, I'm sure",
                    _ => {
                        console.log(confirmname);
                        if (confirmname !== this.properties.name) {
                            return;
                        }
                        this.delete().then(_ => {
                            full.hide();
                        });
                    }
                ],
                ["button",
                    "",
                    "Nevermind",
                    _ => {
                        full.hide();
                    }
                ]
            ]
        ]);
        full.show();
    }
    async delete() {
        return fetch(this.info.api + "/guilds/" + this.id + "/delete", {
            method: "POST",
            headers: this.headers,
        });
    }
    unreads(html) {
        if (html) {
            this.html = html;
        }
        else {
            html = this.html;
        }
        let read = true;
        for (const thing of this.channels) {
            if (thing.hasunreads) {
                console.log(thing);
                read = false;
                break;
            }
        }
        if (!html) {
            return;
        }
        if (read) {
            html.children[0].classList.remove("notiunread");
        }
        else {
            html.children[0].classList.add("notiunread");
        }
    }
    getHTML() {
        //this.printServers();
        this.sortchannels();
        this.printServers();
        const build = document.createElement("div");
        for (const thing of this.headchannels) {
            build.appendChild(thing.createguildHTML(this.isAdmin()));
        }
        return build;
    }
    isAdmin() {
        return this.member.isAdmin();
    }
    async markAsRead() {
        const build = { read_states: [] };
        for (const thing of this.channels) {
            if (thing.hasunreads) {
                build.read_states.push({ channel_id: thing.id, message_id: thing.lastmessageid, read_state_type: 0 });
                thing.lastreadmessageid = thing.lastmessageid;
                if (!thing.myhtml)
                    continue;
                thing.myhtml.classList.remove("cunread");
            }
        }
        this.unreads();
        fetch(this.info.api + "/read-states/ack-bulk", {
            method: "POST",
            headers: this.headers,
            body: JSON.stringify(build)
        });
    }
    hasRole(r) {
        console.log("this should run");
        if (r instanceof Role) {
            r = r.id;
        }
        return this.member.hasRole(r);
    }
    loadChannel(ID) {
        if (ID && this.channelids[ID]) {
            this.channelids[ID].getHTML();
            return;
        }
        if (this.prevchannel) {
            console.log(this.prevchannel);
            this.prevchannel.getHTML();
            return;
        }
        for (const thing of this.channels) {
            if (thing.children.length === 0) {
                thing.getHTML();
                return;
            }
        }
    }
    loadGuild() {
        this.localuser.loadGuild(this.id);
    }
    updateChannel(json) {
        const channel = this.channelids[json.id];
        if (channel) {
            channel.updateChannel(json);
            this.headchannels = [];
            for (const thing of this.channels) {
                thing.children = [];
            }
            this.headchannels = [];
            for (const thing of this.channels) {
                const parent = thing.resolveparent(this);
                if (!parent) {
                    this.headchannels.push(thing);
                }
            }
            this.printServers();
        }
    }
    createChannelpac(json) {
        const thischannel = new Channel(json, this);
        this.channelids[json.id] = thischannel;
        this.channels.push(thischannel);
        thischannel.resolveparent(this);
        if (!thischannel.parent) {
            this.headchannels.push(thischannel);
        }
        this.calculateReorder();
        this.printServers();
    }
    createchannels(func = this.createChannel) {
        let name = "";
        let category = 0;
        const channelselect = new Dialog(["vdiv",
            ["radio", "select channel type",
                ["voice", "text", "announcement"],
                function (e) {
                    console.log(e);
                    category = { text: 0, voice: 2, announcement: 5, category: 4 }[e];
                },
                1
            ],
            ["textbox", "Name of channel", "", function () {
                    name = this.value;
                }],
            ["button", "", "submit", function () {
                    console.log(name, category);
                    func(name, category);
                    channelselect.hide();
                }]]);
        channelselect.show();
    }
    createcategory() {
        let name = "";
        const category = 4;
        const channelselect = new Dialog(["vdiv",
            ["textbox", "Name of category", "", function () {
                    name = this.value;
                }],
            ["button", "", "submit", () => {
                    console.log(name, category);
                    this.createChannel(name, category);
                    channelselect.hide();
                }]]);
        channelselect.show();
    }
    delChannel(json) {
        const channel = this.channelids[json.id];
        delete this.channelids[json.id];
        this.channels.splice(this.channels.indexOf(channel), 1);
        const indexy = this.headchannels.indexOf(channel);
        if (indexy !== -1) {
            this.headchannels.splice(indexy, 1);
        }
        /*
        const build=[];
        for(const thing of this.channels){
            console.log(thing.id);
            if(thing!==channel){
                build.push(thing)
            }else{
                console.log("fail");
                if(thing.parent){
                    thing.parent.delChannel(json);
                }
            }
        }
        this.channels=build;
        */
        this.printServers();
    }
    createChannel(name, type) {
        fetch(this.info.api + "/guilds/" + this.id + "/channels", {
            method: "POST",
            headers: this.headers,
            body: JSON.stringify({ name, type })
        });
    }
    async createRole(name) {
        const fetched = await fetch(this.info.api + "/guilds/" + this.id + "roles", {
            method: "POST",
            headers: this.headers,
            body: JSON.stringify({
                name,
                color: 0,
                permissions: "0"
            })
        });
        const json = await fetched.json();
        const role = new Role(json, this);
        this.roleids.set(role.id, role);
        this.roles.push(role);
        return role;
    }
    async updateRolePermissions(id, perms) {
        const role = this.roleids[id];
        role.permissions.allow = perms.allow;
        role.permissions.deny = perms.deny;
        await fetch(this.info.api + "/guilds/" + this.id + "/roles/" + role.id, {
            method: "PATCH",
            headers: this.headers,
            body: JSON.stringify({
                color: role.color,
                hoist: role.hoist,
                icon: role.icon,
                mentionable: role.mentionable,
                name: role.name,
                permissions: role.permissions.allow.toString(),
                unicode_emoji: role.unicode_emoji,
            })
        });
    }
}
Guild.setupcontextmenu();
export { Guild };
