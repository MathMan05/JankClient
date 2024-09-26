class Permissions{
	allow: bigint;
	deny: bigint;
	readonly hasDeny: boolean;
	constructor(allow: string, deny: string = ""){
		this.hasDeny = Boolean(deny);
		try{
			this.allow = BigInt(allow);
			this.deny = BigInt(deny);
		}catch{
			this.allow = 0n;
			this.deny = 0n;
			console.error(
				`Something really stupid happened with a permission with allow being ${allow} and deny being, ${deny}, execution will still happen, but something really stupid happened, please report if you know what caused this.`
			);
		}
	}
	getPermissionbit(b: number, big: bigint): boolean{
		return Boolean((big >> BigInt(b)) & 1n);
	}
	setPermissionbit(b: number, state: boolean, big: bigint): bigint{
		const bit = 1n << BigInt(b);
		return(big & ~bit) | (BigInt(state) << BigInt(b)); //thanks to geotale for this code :3
	}
	static map: {
[key: number | string]:
| { name: string; readableName: string; description: string }
| number;
};
	static info: { name: string; readableName: string; description: string }[];
	static makeMap(){
		Permissions.info = [
			//for people in the future, do not reorder these, the creation of the map realize on the order
			{
				name: "CREATE_INSTANT_INVITE",
				readableName: "Create invite",
				description: "Allows the user to create invites for the guild",
			},
			{
				name: "KICK_MEMBERS",
				readableName: "Kick members",
				description: "Allows the user to kick members from the guild",
			},
			{
				name: "BAN_MEMBERS",
				readableName: "Ban members",
				description: "Allows the user to ban members from the guild",
			},
			{
				name: "ADMINISTRATOR",
				readableName: "Administrator",
				description:
"Allows all permissions and bypasses channel permission overwrites. This is a dangerous permission!",
			},
			{
				name: "MANAGE_CHANNELS",
				readableName: "Manage channels",
				description: "Allows the user to manage and edit channels",
			},
			{
				name: "MANAGE_GUILD",
				readableName: "Manage guild",
				description: "Allows management and editing of the guild",
			},
			{
				name: "ADD_REACTIONS",
				readableName: "Add reactions",
				description: "Allows user to add reactions to messages",
			},
			{
				name: "VIEW_AUDIT_LOG",
				readableName: "View audit log",
				description: "Allows the user to view the audit log",
			},
			{
				name: "PRIORITY_SPEAKER",
				readableName: "Priority speaker",
				description: "Allows for using priority speaker in a voice channel",
			},
			{
				name: "STREAM",
				readableName: "Video",
				description: "Allows the user to stream",
			},
			{
				name: "VIEW_CHANNEL",
				readableName: "View channels",
				description: "Allows the user to view the channel",
			},
			{
				name: "SEND_MESSAGES",
				readableName: "Send messages",
				description: "Allows user to send messages",
			},
			{
				name: "SEND_TTS_MESSAGES",
				readableName: "Send text-to-speech messages",
				description: "Allows the user to send text-to-speech messages",
			},
			{
				name: "MANAGE_MESSAGES",
				readableName: "Manage messages",
				description: "Allows the user to delete messages that aren't their own",
			},
			{
				name: "EMBED_LINKS",
				readableName: "Embed links",
				description: "Allow links sent by this user to auto-embed",
			},
			{
				name: "ATTACH_FILES",
				readableName: "Attach files",
				description: "Allows the user to attach files",
			},
			{
				name: "READ_MESSAGE_HISTORY",
				readableName: "Read message history",
				description: "Allows user to read the message history",
			},
			{
				name: "MENTION_EVERYONE",
				readableName: "Mention @everyone, @here and all roles",
				description: "Allows the user to mention everyone",
			},
			{
				name: "USE_EXTERNAL_EMOJIS",
				readableName: "Use external emojis",
				description: "Allows the user to use external emojis",
			},
			{
				name: "VIEW_GUILD_INSIGHTS",
				readableName: "View guild insights",
				description: "Allows the user to see guild insights",
			},
			{
				name: "CONNECT",
				readableName: "Connect",
				description: "Allows the user to connect to a voice channel",
			},
			{
				name: "SPEAK",
				readableName: "Speak",
				description: "Allows the user to speak in a voice channel",
			},
			{
				name: "MUTE_MEMBERS",
				readableName: "Mute members",
				description: "Allows user to mute other members",
			},
			{
				name: "DEAFEN_MEMBERS",
				readableName: "Deafen members",
				description: "Allows user to deafen other members",
			},
			{
				name: "MOVE_MEMBERS",
				readableName: "Move members",
				description: "Allows the user to move members between voice channels",
			},
			{
				name: "USE_VAD",
				readableName: "Use voice activity detection",
				description:
"Allows users to speak in a voice channel by simply talking",
			},
			{
				name: "CHANGE_NICKNAME",
				readableName: "Change nickname",
				description: "Allows the user to change their own nickname",
			},
			{
				name: "MANAGE_NICKNAMES",
				readableName: "Manage nicknames",
				description: "Allows user to change nicknames of other members",
			},
			{
				name: "MANAGE_ROLES",
				readableName: "Manage roles",
				description: "Allows user to edit and manage roles",
			},
			{
				name: "MANAGE_WEBHOOKS",
				readableName: "Manage webhooks",
				description: "Allows management and editing of webhooks",
			},
			{
				name: "MANAGE_GUILD_EXPRESSIONS",
				readableName: "Manage expressions",
				description: "Allows for managing emoji, stickers, and soundboards",
			},
			{
				name: "USE_APPLICATION_COMMANDS",
				readableName: "Use application commands",
				description: "Allows the user to use application commands",
			},
			{
				name: "REQUEST_TO_SPEAK",
				readableName: "Request to speak",
				description: "Allows user to request to speak in stage channel",
			},
			{
				name: "MANAGE_EVENTS",
				readableName: "Manage events",
				description: "Allows user to edit and manage events",
			},
			{
				name: "MANAGE_THREADS",
				readableName: "Manage threads",
				description:
"Allows the user to delete and archive threads and view all private threads",
			},
			{
				name: "CREATE_PUBLIC_THREADS",
				readableName: "Create public threads",
				description: "Allows the user to create public threads",
			},
			{
				name: "CREATE_PRIVATE_THREADS",
				readableName: "Create private threads",
				description: "Allows the user to create private threads",
			},
			{
				name: "USE_EXTERNAL_STICKERS",
				readableName: "Use external stickers",
				description: "Allows user to use external stickers",
			},
			{
				name: "SEND_MESSAGES_IN_THREADS",
				readableName: "Send messages in threads",
				description: "Allows the user to send messages in threads",
			},
			{
				name: "USE_EMBEDDED_ACTIVITIES",
				readableName: "Use activities",
				description: "Allows the user to use embedded activities",
			},
			{
				name: "MODERATE_MEMBERS",
				readableName: "Timeout members",
				description:
"Allows the user to time out other users to prevent them from sending or reacting to messages in chat and threads, and from speaking in voice and stage channels",
			},
			{
				name: "VIEW_CREATOR_MONETIZATION_ANALYTICS",
				readableName: "View creator monetization analytics",
				description: "Allows for viewing role subscription insights",
			},
			{
				name: "USE_SOUNDBOARD",
				readableName: "Use soundboard",
				description: "Allows for using soundboard in a voice channel",
			},
			{
				name: "CREATE_GUILD_EXPRESSIONS",
				readableName: "Create expressions",
				description:
"Allows for creating emojis, stickers, and soundboard sounds, and editing and deleting those created by the current user.",
			},
			{
				name: "CREATE_EVENTS",
				readableName: "Create events",
				description:
"Allows for creating scheduled events, and editing and deleting those created by the current user.",
			},
			{
				name: "USE_EXTERNAL_SOUNDS",
				readableName: "Use external sounds",
				description:
"Allows the usage of custom soundboard sounds from other servers",
			},
			{
				name: "SEND_VOICE_MESSAGES",
				readableName: "Send voice messages",
				description: "Allows sending voice messages",
			},
			{
				name: "SEND_POLLS",
				readableName: "Create polls",
				description: "Allows sending polls",
			},
			{
				name: "USE_EXTERNAL_APPS",
				readableName: "Use external apps",
				description:
"Allows user-installed apps to send public responses. " +
"When disabled, users will still be allowed to use their apps but the responses will be ephemeral. " +
"This only applies to apps not also installed to the server.",
			},
		];
		Permissions.map = {};
		let i = 0;
		for(const thing of Permissions.info){
			Permissions.map[i] = thing;
			Permissions.map[thing.name] = i;
			i++;
		}
	}
	getPermission(name: string): number{
		if(undefined===Permissions.map[name]){
			console.error(name +" is not found in map",Permissions.map);
		}
		if(this.getPermissionbit(Permissions.map[name] as number, this.allow)){
			return 1;
		}else if(
			this.getPermissionbit(Permissions.map[name] as number, this.deny)
		){
			return-1;
		}else{
			return 0;
		}
	}
	hasPermission(name: string,adminOverride=true): boolean{
		if(this.deny){
			console.warn(
				"This function may of been used in error, think about using getPermision instead"
			);
		}
		if(this.getPermissionbit(Permissions.map[name] as number, this.allow))
			return true;
		if(name != "ADMINISTRATOR"&&adminOverride)return this.hasPermission("ADMINISTRATOR");
		return false;
	}
	setPermission(name: string, setto: number): void{
		const bit = Permissions.map[name] as number;
		if(bit===undefined){
			return console.error(
				"Tried to set permission to " +
setto +
" for " +
name +
" but it doesn't exist"
			);
		}

		if(setto === 0){
			this.deny = this.setPermissionbit(bit, false, this.deny);
			this.allow = this.setPermissionbit(bit, false, this.allow);
		}else if(setto === 1){
			this.deny = this.setPermissionbit(bit, false, this.deny);
			this.allow = this.setPermissionbit(bit, true, this.allow);
		}else if(setto === -1){
			this.deny = this.setPermissionbit(bit, true, this.deny);
			this.allow = this.setPermissionbit(bit, false, this.allow);
		}else{
			console.error("invalid number entered:" + setto);
		}
	}
}
Permissions.makeMap();
export{ Permissions };
