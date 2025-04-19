import {I18n} from "./i18n.js";

class Rights {
	allow!: bigint;
	constructor(allow: string | number) {
		this.update(allow);
	}
	update(allow: string | number) {
		try {
			this.allow = BigInt(allow);
		} catch {
			this.allow = 875069521787904n;
			console.error(
				`Something really stupid happened with a permission with allow being ${allow}, execution will still happen, but something really stupid happened, please report if you know what caused this.`,
			);
		}
	}
	getPermissionbit(b: number, big: bigint): boolean {
		return Boolean((big >> BigInt(b)) & 1n);
	}
	setPermissionbit(b: number, state: boolean, big: bigint): bigint {
		const bit = 1n << BigInt(b);
		return (big & ~bit) | (BigInt(state) << BigInt(b)); //thanks to geotale for this code :3
	}
	static *info(): Generator<{name: string; readableName: string; description: string}> {
		throw new Error("Isn't implemented");
		for (const thing of Rights.permisions) {
			yield {
				name: thing,
				readableName: I18n.getTranslation(`permissions.readableNames.${thing}`),
				description: I18n.getTranslation(`permissions.descriptions.${thing}`),
			};
		}
	}
	static readonly permisions = [
		"OPERATOR",
		"MANAGE_APPLICATIONS",
		"MANAGE_GUILDS",
		"MANAGE_MESSAGES",
		"MANAGE_RATE_LIMITS",
		"MANAGE_ROUTING",
		"MANAGE_TICKETS",
		"MANAGE_USERS",
		"ADD_MEMBERS",
		"BYPASS_RATE_LIMITS",
		"CREATE_APPLICATIONS",
		"CREATE_CHANNELS",
		"CREATE_DMS",
		"CREATE_DM_GROUPS",
		"CREATE_GUILDS",
		"CREATE_INVITES",
		"CREATE_ROLES",
		"CREATE_TEMPLATES",
		"CREATE_WEBHOOKS",
		"JOIN_GUILDS",
		"PIN_MESSAGES",
		"SELF_ADD_REACTIONS",
		"SELF_DELETE_MESSAGES",
		"SELF_EDIT_MESSAGES",
		"SELF_EDIT_NAME",
		"SEND_MESSAGES",
		"USE_ACTIVITIES",
		"USE_VIDEO",
		"USE_VOICE",
		"INVITE_USERS",
		"SELF_DELETE_DISABLE",
		"DEBTABLE",
		"CREDITABLE",
		"KICK_BAN_MEMBERS",
		"SELF_LEAVE_GROUPS",
		"PRESENCE",
		"SELF_ADD_DISCOVERABLE",
		"MANAGE_GUILD_DIRECTORY",
		"POGGERS",
		"USE_ACHIEVEMENTS",
		"INITIATE_INTERACTIONS",
		"RESPOND_TO_INTERACTIONS",
		"SEND_BACKDATED_EVENTS",
		"USE_MASS_INVITES",
		"ACCEPT_INVITES",
		"SELF_EDIT_FLAGS",
		"EDIT_FLAGS",
		"MANAGE_GROUPS",
		"VIEW_SERVER_STATS",
		"RESEND_VERIFICATION_EMAIL",
		"CREATE_REGISTRATION_TOKENS",
	];
	getPermission(name: string): boolean {
		if (undefined === Rights.permisions.indexOf(name)) {
			console.error(`${name} is not found in map`, Rights.permisions);
		}
		return this.getPermissionbit(Rights.permisions.indexOf(name), this.allow);
	}
	hasPermission(name: string, adminOverride = true): boolean {
		if (this.getPermissionbit(Rights.permisions.indexOf(name), this.allow)) return true;
		if (name !== "OPERATOR" && adminOverride) return this.hasPermission("OPERATOR");
		return false;
	}
	setPermission(name: string, setto: number): void {
		const bit = Rights.permisions.indexOf(name);
		if (bit === undefined) {
			return console.error(
				`Tried to set permission to ${setto} for ${name} but it doesn't exist`,
			);
		}

		if (setto === 0) {
			this.allow = this.setPermissionbit(bit, false, this.allow);
		} else if (setto === 1) {
			this.allow = this.setPermissionbit(bit, true, this.allow);
		} else {
			console.error(`invalid number entered:${setto}`);
		}
	}
}
export {Rights};
