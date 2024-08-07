export { Permissions };
class Permissions {
    allow;
    deny;
    hasDeny;
    constructor(allow, deny = "") {
        this.hasDeny = !!deny;
        try {
            this.allow = BigInt(allow);
            this.deny = BigInt(deny);
        }
        catch (e) {
            this.allow = 0n;
            this.deny = 0n;
            console.error(`Something really stupid happened with a permission with allow being ${allow} and deny being, ${deny}, execution will still happen, but something really stupid happened, please report if you know what caused this.`);
        }
    }
    getPermissionbit(b, big) {
        return Boolean((big >> BigInt(b)) & 1n);
    }
    setPermissionbit(b, state, big) {
        const bit = 1n << BigInt(b);
        return (big & ~bit) | (BigInt(state) << BigInt(b)); //thanks to geotale for this code :3
    }
    static map;
    static info;
    static makeMap() {
        Permissions.info = [
            {
                name: "CREATE_INSTANT_INVITE",
                readableName: "Create instance invite",
                description: "Allows the user to create invites for the guild"
            },
            {
                name: "KICK_MEMBERS",
                readableName: "Kick members",
                description: "Allows the user to kick members from the guild"
            },
            {
                name: "BAN_MEMBERS",
                readableName: "Ban members",
                description: "Allows the user to ban members from the guild"
            },
            {
                name: "ADMINISTRATOR",
                readableName: "Administrator",
                description: "Allows all permissions and bypasses channel permission overwrites"
            },
            {
                name: "MANAGE_CHANNELS",
                readableName: "Manage channels",
                description: "Allows the user to manage and edit channels"
            },
            {
                name: "MANAGE_GUILD",
                readableName: "Manage guild",
                description: "Allows management and editing of the guild"
            },
            {
                name: "ADD_REACTIONS",
                readableName: "Add reactions",
                description: "Allows user to add reactions to messages"
            },
            {
                name: "VIEW_AUDIT_LOG",
                readableName: "View audit log",
                description: "Allows the user to view the audit log"
            },
            {
                name: "PRIORITY_SPEAKER",
                readableName: "Priority speaker",
                description: "Allows for using priority speaker in a voice channel"
            },
            {
                name: "STREAM",
                readableName: "Stream",
                description: "Allows the user to stream"
            },
            {
                name: "VIEW_CHANNEL",
                readableName: "View channel",
                description: "Allows the user to view the channel"
            },
            {
                name: "SEND_MESSAGES",
                readableName: "Send Messages",
                description: "Allows user to send messages"
            },
            {
                name: "SEND_TTS_MESSAGES",
                readableName: "Send text-to-speech messages",
                description: "Allows the user to send text-to-speech messages"
            },
            {
                name: "MANAGE_MESSAGES",
                readableName: "Manage messages",
                description: "Allows the user to delete messages that aren't their own"
            },
            {
                name: "EMBED_LINKS",
                readableName: "Embed links",
                description: "Allow links sent by this user to auto-embed"
            },
            {
                name: "ATTACH_FILES",
                readableName: "Attach files",
                description: "Allows the user to attach files"
            },
            {
                name: "READ_MESSAGE_HISTORY",
                readableName: "Read message history",
                description: "Allows user to read the message history"
            },
            {
                name: "MENTION_EVERYONE",
                readableName: "Mention everyone",
                description: "Allows the user to mention everyone"
            },
            {
                name: "USE_EXTERNAL_EMOJIS",
                readableName: "Use external emojis",
                description: "Allows the user to use external emojis"
            },
            {
                name: "VIEW_GUILD_INSIGHTS",
                readableName: "View guild insights",
                description: "Allows the user to see guild insights"
            },
            {
                name: "CONNECT",
                readableName: "Connect",
                description: "Allows the user to connect to a voice channel"
            },
            {
                name: "SPEAK",
                readableName: "Speak",
                description: "Allows the user to speak in a voice channel"
            },
            {
                name: "MUTE_MEMBERS",
                readableName: "Mute members",
                description: "Allows user to mute other members"
            },
            {
                name: "DEAFEN_MEMBERS",
                readableName: "Deafen members",
                description: "Allows user to deafen other members"
            },
            {
                name: "MOVE_MEMBERS",
                readableName: "Move members",
                description: "Allows the user to move members between voice channels"
            },
            {
                name: "USE_VAD",
                readableName: "use voice-activity-detection",
                description: "Allows user to use voice-activity-detection"
            },
            {
                name: "CHANGE_NICKNAME",
                readableName: "Change nickname",
                description: "Allows the user to change their own nickname"
            },
            {
                name: "MANAGE_NICKNAMES",
                readableName: "Manage nicknames",
                description: "Allows user to change nicknames of other members"
            },
            {
                name: "MANAGE_ROLES",
                readableName: "Manage roles",
                description: "Allows user to edit and manage roles"
            },
            {
                name: "MANAGE_WEBHOOKS",
                readableName: "Manage webhooks",
                description: "Allows management and editing of webhooks"
            },
            {
                name: "MANAGE_GUILD_EXPRESSIONS",
                readableName: "Manage guild expressions",
                description: "Allows for managing emoji, stickers, and soundboards"
            },
            {
                name: "USE_APPLICATION_COMMANDS",
                readableName: "Use application commands",
                description: "Allows the user to use application commands"
            },
            {
                name: "REQUEST_TO_SPEAK",
                readableName: "Request to speak",
                description: "Allows user to request to speak in stage channel"
            },
            {
                name: "MANAGE_EVENTS",
                readableName: "Manage events",
                description: "Allows user to edit and manage events"
            },
            {
                name: "MANAGE_THREADS",
                readableName: "Manage threads",
                description: "Allows the user to delete and archive threads and view all private threads"
            },
            {
                name: "CREATE_PUBLIC_THREADS",
                readableName: "Create public threads",
                description: "Allows the user to create public threads"
            },
            {
                name: "CREATE_PRIVATE_THREADS",
                readableName: "Create private threads",
                description: "Allows the user to create private threads"
            },
            {
                name: "USE_EXTERNAL_STICKERS",
                readableName: "Use external stickers",
                description: "Allows user to use external stickers"
            },
            {
                name: "SEND_MESSAGES_IN_THREADS",
                readableName: "Send messages in threads",
                description: "Allows the user to send messages in threads"
            },
            {
                name: "USE_EMBEDDED_ACTIVITIES",
                readableName: "Use embedded activities",
                description: "Allows the user to use embedded activities"
            },
            {
                name: "MODERATE_MEMBERS",
                readableName: "Moderate members",
                description: "Allows the user to time out other users to prevent them from sending or reacting to messages in chat and threads, and from speaking in voice and stage channels"
            },
        ];
        Permissions.map = {};
        let i = 0;
        for (const thing of Permissions.info) {
            Permissions.map[i] = thing;
            Permissions.map[thing.name] = i;
            i++;
        }
    }
    getPermission(name) {
        if (this.getPermissionbit(Permissions.map[name], this.allow)) {
            return 1;
        }
        else if (this.getPermissionbit(Permissions.map[name], this.deny)) {
            return -1;
        }
        else {
            return 0;
        }
    }
    setPermission(name, setto) {
        const bit = Permissions.map[name];
        if (setto === 0) {
            this.deny = this.setPermissionbit(bit, false, this.deny);
            this.allow = this.setPermissionbit(bit, false, this.allow);
        }
        else if (setto === 1) {
            this.deny = this.setPermissionbit(bit, false, this.deny);
            this.allow = this.setPermissionbit(bit, true, this.allow);
        }
        else if (setto === -1) {
            this.deny = this.setPermissionbit(bit, true, this.deny);
            this.allow = this.setPermissionbit(bit, false, this.allow);
        }
        else {
            console.error("invalid number entered:" + setto);
        }
    }
}
Permissions.makeMap();
