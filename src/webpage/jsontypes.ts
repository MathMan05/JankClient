type readyjson = {
	op: 0;
	t: "READY";
	s: number;
	d: {
		v: number;
		user: mainuserjson;
		user_settings: {
			index: number;
			afk_timeout: number;
			allow_accessibility_detection: boolean;
			animate_emoji: boolean;
			animate_stickers: number;
			contact_sync_enabled: boolean;
			convert_emoticons: boolean;
			custom_status: string;
			default_guilds_restricted: boolean;
			detect_platform_accounts: boolean;
			developer_mode: boolean;
			disable_games_tab: boolean;
			enable_tts_command: boolean;
			explicit_content_filter: 0;
			friend_discovery_flags: 0;
			friend_source_flags: {
				all: boolean;
			}; //might be missing things here
			gateway_connected: boolean;
			gif_auto_play: boolean;
			guild_folders: []; //need an example of this not empty
			guild_positions: []; //need an example of this not empty
			inline_attachment_media: boolean;
			inline_embed_media: boolean;
			locale: string;
			message_display_compact: boolean;
			native_phone_integration_enabled: boolean;
			render_embeds: boolean;
			render_reactions: boolean;
			restricted_guilds: []; //need an example of this not empty
			show_current_game: boolean;
			status: string;
			stream_notifications_enabled: boolean;
			theme: string;
			timezone_offset: number;
			view_nsfw_guilds: boolean;
		};
		guilds: guildjson[];
		relationships: {
			id: string;
			type: 0 | 1 | 2 | 3 | 4;
			nickname: string | null;
			user: userjson;
		}[];
		read_state: {
			entries: {
				id: string;
				channel_id: string;
				last_message_id: string;
				last_pin_timestamp: string;
				mention_count: number; //in theory, the server doesn't actually send this as far as I'm aware
			}[];
			partial: boolean;
			version: number;
		};
		user_guild_settings: {
			entries: {
				channel_overrides: {message_notifications: number,muted: boolean,mute_config: {selected_time_window: number,end_time: number},channel_id: string}[];
				message_notifications: number;
				flags: number;
				hide_muted_channels: boolean;
				mobile_push: boolean;
				mute_config: null;
				mute_scheduled_events: boolean;
				muted: boolean;
				notify_highlights: number;
				suppress_everyone: boolean;
				suppress_roles: boolean;
				version: number;
				guild_id: string;
			}[];
			partial: boolean;
			version: number;
		};
		private_channels: dirrectjson[];
		session_id: string;
		country_code: string;
		users: userjson[];
		merged_members: [memberjson][];
		sessions: {
			active: boolean;
			activities: []; //will need to find example of this
			client_info: {
				version: number;
			};
			session_id: string;
			status: string;
		}[];
		resume_gateway_url: string;
		consents: {
			personalization: {
				consented: boolean;
			};
		};
		experiments: []; //not sure if I need to do this :P
		guild_join_requests: []; //need to get examples
		connected_accounts: []; //need to get examples
		guild_experiments: []; //need to get examples
		geo_ordered_rtc_regions: []; //need to get examples
		api_code_version: number;
		friend_suggestion_count: number;
		analytics_token: string;
		tutorial: boolean;
		session_type: string;
		auth_session_id_hash: string;
		notification_settings: {
			flags: number;
		};
	};
};
type mainuserjson = userjson & {
	flags: number;
	mfa_enabled?: boolean;
	email?: string;
	phone?: string;
	verified: boolean;
	nsfw_allowed: boolean;
	premium: boolean;
	purchased_flags: number;
	premium_usage_flags: number;
	disabled: boolean;
};
type userjson = {
	username: string;
	discriminator: string;
	id: string;
	public_flags: number;
	avatar: string | null;
	accent_color: number;
	banner?: string;
	bio: string;
	bot: boolean;
	premium_since: string;
	premium_type: number;
	theme_colors: string;
	pronouns: string;
	badge_ids: string[];
};
type memberjson = {
	index?: number;
	id: string;
	user: userjson | null;
	guild_id: string;
	guild: {
		id: string;
	} | null;
	presence?:presencejson
	nick?: string;
	roles: string[];
	joined_at: string;
	premium_since: string;
	deaf: boolean;
	mute: boolean;
	pending: boolean;
	last_message_id?: boolean; //What???
};
type emojijson = {
	name: string;
	id?: string;
	animated?: boolean;
	emoji?:string
};

type guildjson = {
	application_command_counts: { [key: string]: number };
	channels: channeljson[];
	data_mode: string;
	emojis: emojijson[];
	guild_scheduled_events: [];
	id: string;
	large: boolean;
	lazy: boolean;
	member_count: number;
	premium_subscription_count: number;
	properties: {
		region: string | null;
		name: string;
		description: string;
		icon: string;
		splash: string;
		banner: string;
		features: string[];
		preferred_locale: string;
		owner_id: string;
		application_id: string;
		afk_channel_id: string;
		afk_timeout: number;
		member_count: number;
		system_channel_id: string;
		verification_level: number;
		explicit_content_filter: number;
		default_message_notifications: number;
		mfa_level: number;
		vanity_url_code: number;
		premium_tier: number;
		premium_progress_bar_enabled: boolean;
		system_channel_flags: number;
		discovery_splash: string;
		rules_channel_id: string;
		public_updates_channel_id: string;
		max_video_channel_users: number;
		max_members: number;
		nsfw_level: number;
		hub_type: null;
		home_header: null;
		id: string;
		latest_onboarding_question_id: string;
		max_stage_video_channel_users: number;
		nsfw: boolean;
		safety_alerts_channel_id: string;
	};
	roles: rolesjson[];
	stage_instances: [];
	stickers: [];
	threads: [];
	version: string;
	guild_hashes: {};
	joined_at: string;
};
type startTypingjson = {
	d: {
		channel_id: string;
		guild_id?: string;
		user_id: string;
		timestamp: number;
		member?: memberjson;
	};
};
type channeljson = {
	id: string;
	created_at: string;
	name: string;
	icon: string;
	type: number;
	last_message_id: string;
	guild_id: string;
	parent_id: string;
	last_pin_timestamp: string;
	default_auto_archive_duration: number;
	permission_overwrites: {
		id: string;
		allow: string;
		deny: string;
	}[];
	video_quality_mode: null;
	nsfw: boolean;
	topic: string;
	retention_policy_id: string;
	flags: number;
	default_thread_rate_limit_per_user: number;
	position: number;
};
type rolesjson = {
	id: string;
	guild_id: string;
	color: number;
	hoist: boolean;
	managed: boolean;
	mentionable: boolean;
	name: string;
	permissions: string;
	position: number;
	icon: string;
	unicode_emoji: string;
	flags: number;
};
type dirrectjson = {
	id: string;
	flags: number;
	last_message_id: string;
	type: number;
	recipients: userjson[];
	is_spam: boolean;
};
type messagejson = {
	id: string;
	channel_id: string;
	guild_id: string;
	author: userjson;
	member?: memberjson;
	content: string;
	timestamp: string;
	edited_timestamp: string;
	tts: boolean;
	mention_everyone: boolean;
	mentions: []; //need examples to fix
	mention_roles: []; //need examples to fix
	attachments: filejson[];
	embeds: embedjson[];
	reactions: {
		count: number;
		emoji: emojijson; //very likely needs expanding
		me: boolean;
	}[];
	nonce: string;
	pinned: boolean;
	type: number;
};
type filejson = {
	id: string;
	filename: string;
	content_type: string;
	width?: number;
	height?: number;
	proxy_url: string | undefined;
	url: string;
	size: number;
};
type embedjson = {
	type: string | null;
	color?: number;
	author: {
		icon_url?: string;
		name?: string;
		url?: string;
		title?: string;
	};
	title?: string;
	url?: string;
	description?: string;
	fields?: {
		name: string;
		value: string;
		inline: boolean;
	}[];
	footer?: {
		icon_url?: string;
		text?: string;
		thumbnail?: string;
	};
	timestamp?: string;
	thumbnail: {
		proxy_url: string;
		url: string;
		width: number;
		height: number;
	};
	provider: {
		name: string;
	};
	video?: {
		url: string;
		width?: number | null;
		height?: number | null;
		proxy_url?: string;
	};
	invite?: {
		url: string;
		code: string;
	};
};
type invitejson = {
	code: string;
	temporary: boolean;
	uses: number;
	max_use: number;
	max_age: number;
	created_at: string;
	expires_at: string;
	guild_id: string;
	channel_id: string;
	inviter_id: string;
	target_user_id: string | null;
	target_user_type: string | null;
	vanity_url: string | null;
	flags: number;
	guild: guildjson["properties"];
	channel: channeljson;
	inviter: userjson;
};
type presencejson = {
	status: string;
	since: number | null;
	activities: any[]; //bit more complicated but not now
	afk: boolean;
	user?: userjson;
};
type messageCreateJson = {
	op: 0;
	d: {
		guild_id?: string;
		channel_id?: string;
	} & messagejson;
	s: number;
	t: "MESSAGE_CREATE";
};
type roleCreate={
    op: 0,
    t: "GUILD_ROLE_CREATE",
    d: {
        guild_id: string,
        role: rolesjson
    },
    s: 6
}
type wsjson =
roleCreate | {
	op: 0;
	d: any;
	s: number;
	t:
		| "TYPING_START"
		| "USER_UPDATE"
		| "CHANNEL_UPDATE"
		| "CHANNEL_CREATE"
		| "CHANNEL_DELETE"
		| "GUILD_DELETE"
		| "GUILD_CREATE"
		| "MESSAGE_REACTION_REMOVE_ALL"
		| "MESSAGE_REACTION_REMOVE_EMOJI";
	}
| {
	op: 0;
	t: "GUILD_MEMBERS_CHUNK";
	d: memberChunk;
	s: number;
}
| {
	op: 0;
	d: {
		id: string;
		guild_id?: string;
		channel_id: string;
	};
	s: number;
	t: "MESSAGE_DELETE";
}
| {
	op: 0;
	d: {
		guild_id?: string;
		channel_id: string;
	} & messagejson;
	s: number;
	t: "MESSAGE_UPDATE";
}
| messageCreateJson
| readyjson
| {
	op: 11;
	s: undefined;
	d: {};
}
| {
	op: 10;
	s: undefined;
	d: {
		heartbeat_interval: number;
	};
}
| {
	op: 0;
	t: "MESSAGE_REACTION_ADD";
	d: {
		user_id: string;
		channel_id: string;
		message_id: string;
		guild_id?: string;
		emoji: emojijson;
		member?: memberjson;
	};
	s: number;
}
| {
	op: 0;
	t: "MESSAGE_REACTION_REMOVE";
	d: {
		user_id: string;
		channel_id: string;
		message_id: string;
		guild_id: string;
		emoji: emojijson;
	};
	s: number;
}|{
    op: 0,
    t: "GUILD_ROLE_UPDATE",
    d: {
        guild_id: string,
        role: rolesjson
    },
    "s": number
}|{
    op: 0,
    t: "GUILD_ROLE_DELETE",
    d: {
        guild_id: string,
        role_id: string
    },
    s:number
}|{
    op: 0,
    t: "GUILD_MEMBER_UPDATE",
    d: memberjson,
    s: 3
}|{
	op:9,
	d:boolean,
	s:number
}|memberlistupdatejson|voiceupdate|voiceserverupdate|{
    op: 0,
    t: "RELATIONSHIP_ADD",
    d: {
        id: string,
        type: 0|1|2|3|4|5|6,
        user: userjson
    },
    s: number
}|{
    op: 0,
    t: "RELATIONSHIP_REMOVE",
    d: {
        id: string,
        type: number,
        nickname: null
    },
    s: number
}|{
    op: 0,
    t: "PRESENCE_UPDATE",
    d: presencejson,
    s:number
}|{
	op:0,
	t:"GUILD_MEMBER_ADD",
	d:memberjson,
	s:number
}|{
	op:0,
	t:"GUILD_MEMBER_REMOVE",
	d:{
		guild_id:string,
		user:userjson
	},
	s:number
};


type memberChunk = {
	guild_id: string;
	nonce: string;
	members: memberjson[];
	presences: presencejson[];
	chunk_index: number;
	chunk_count: number;
	not_found: string[];
};
type voiceupdate={
	op: 0,
	t: "VOICE_STATE_UPDATE",
	d: {
		guild_id: string,
		channel_id: string,
		user_id: string,
		member: memberjson,
		session_id: string,
		token: string,
		deaf: boolean,
		mute: boolean,
		self_deaf: boolean,
		self_mute: boolean,
		self_video: boolean,
		suppress: boolean
	},
	s: number
};
type voiceserverupdate={
	op: 0,
	t: "VOICE_SERVER_UPDATE",
	d: {
		token: string,
		guild_id: string,
		endpoint: string
	},
	s: 6
};
type memberlistupdatejson={
	op: 0,
	s: number,
	t: "GUILD_MEMBER_LIST_UPDATE",
	d: {
		ops: [
			{
				items:({
					group:{
						count:number,
						id:string
					}
				}|{
					member:memberjson
				})[]
				op: "SYNC",
				range: [
					number,
					number
				]
			}
		],
		online_count: number,
		member_count: number,
		id: string,
		guild_id: string,
		groups: {
			count: number,
			id: string
		}[]
	}
}
type webRTCSocket=	{
	op: 8,
	d: {
		heartbeat_interval: number
	}
}|{
	op:6,
	d:{t: number}
}|{
	op: 2,
	d: {
		ssrc: number,
		"streams": {
				type: "video",//probally more options, but idk
				rid: string,
				quality: number,
				ssrc: number,
				rtx_ssrc:number
			}[],
		ip: number,
		port: number,
		"modes": [],//no clue
		"experiments": []//no clue
	}
}|sdpback|opRTC12|{
    op: 5,
    d: {
        user_id: string,
        speaking: 0,
        ssrc: 940464811
    }
};
type sdpback={
	op: 4,
	d: {
		audioCodec: string,
		videoCodec: string,
		media_session_id: string,
		sdp: string
	}
};
type opRTC12={
	op: 12,
	d: {
		user_id: string,
		audio_ssrc: number,
		video_ssrc: number,
		streams: [
			{
				type: "video",
				rid: "100",
				ssrc: number,
				active: boolean,
				quality: 100,
				rtx_ssrc: number,
				max_bitrate: 2500000,
				max_framerate: number,
				max_resolution: {
					type: "fixed",
					width: number,
					height: number
				}
			}
		]
	}
}
export{
	readyjson,
	dirrectjson,
	startTypingjson,
	channeljson,
	guildjson,
	rolesjson,
	userjson,
	memberjson,
	mainuserjson,
	messagejson,
	filejson,
	embedjson,
	emojijson,
	presencejson,
	wsjson,
	messageCreateJson,
	memberChunk,
	invitejson,
	memberlistupdatejson,
	voiceupdate,
	voiceserverupdate,
	webRTCSocket,
	sdpback,
	opRTC12
};
