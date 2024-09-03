import { Permissions } from "./permissions.js";
import { SnowFlake } from "./snowflake.js";
class Role extends SnowFlake {
    permissions;
    owner;
    color;
    name;
    info;
    hoist;
    icon;
    mentionable;
    unicode_emoji;
    headers;
    constructor(json, owner) {
        super(json.id);
        this.headers = owner.headers;
        this.info = owner.info;
        for (const thing of Object.keys(json)) {
            if (thing === "id") {
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
        return `#${this.color.toString(16)}`;
    }
}
export { Role };
import { Options } from "./settings.js";
class PermissionToggle {
    rolejson;
    permissions;
    owner;
    value;
    constructor(roleJSON, permissions, owner) {
        this.rolejson = roleJSON;
        this.permissions = permissions;
        this.owner = owner;
    }
    watchForChange() { }
    generateHTML() {
        const div = document.createElement("div");
        div.classList.add("setting");
        const name = document.createElement("span");
        name.textContent = this.rolejson.readableName;
        name.classList.add("settingsname");
        div.append(name);
        div.append(this.generateCheckbox());
        const p = document.createElement("p");
        p.textContent = this.rolejson.description;
        div.appendChild(p);
        return div;
    }
    generateCheckbox() {
        const div = document.createElement("div");
        div.classList.add("tritoggle");
        const state = this.permissions.getPermission(this.rolejson.name);
        const on = document.createElement("input");
        on.type = "radio";
        on.name = this.rolejson.name;
        div.append(on);
        if (state === 1) {
            on.checked = true;
        }
        on.onclick = _ => {
            this.permissions.setPermission(this.rolejson.name, 1);
            this.owner.changed();
        };
        const no = document.createElement("input");
        no.type = "radio";
        no.name = this.rolejson.name;
        div.append(no);
        if (state === 0) {
            no.checked = true;
        }
        no.onclick = _ => {
            this.permissions.setPermission(this.rolejson.name, 0);
            this.owner.changed();
        };
        if (this.permissions.hasDeny) {
            const off = document.createElement("input");
            off.type = "radio";
            off.name = this.rolejson.name;
            div.append(off);
            if (state === -1) {
                off.checked = true;
            }
            off.onclick = _ => {
                this.permissions.setPermission(this.rolejson.name, -1);
                this.owner.changed();
            };
        }
        return div;
    }
    submit() {
    }
}
import { Buttons } from "./settings.js";
class RoleList extends Buttons {
    permissions;
    permission;
    guild;
    channel;
    options;
    onchange;
    curid;
    constructor(permissions, guild, onchange, channel = false) {
        super("Roles");
        this.guild = guild;
        this.permissions = permissions;
        this.channel = channel;
        this.onchange = onchange;
        const options = new Options("", this);
        if (channel) {
            this.permission = new Permissions("0", "0");
        }
        else {
            this.permission = new Permissions("0");
        }
        for (const thing of Permissions.info) {
            options.options.push(new PermissionToggle(thing, this.permission, options));
        }
        for (const i of permissions) {
            console.log(i);
            this.buttons.push([i[0].name, i[0].id]);
        }
        this.options = options;
    }
    handleString(str) {
        this.curid = str;
        const arr = this.permissions.find(_ => _[0].id === str);
        if (arr) {
            const perm = arr[1];
            this.permission.deny = perm.deny;
            this.permission.allow = perm.allow;
            const role = this.permissions.find(e => e[0].id === str);
            if (role) {
                this.options.name = role[0].name;
                this.options.haschanged = false;
            }
        }
        return this.options.generateHTML();
    }
    save() {
        this.onchange(this.curid, this.permission);
    }
}
export { RoleList };
