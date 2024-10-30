import{ Permissions }from"./permissions.js";
import{ Localuser }from"./localuser.js";
import{ Guild }from"./guild.js";
import{ SnowFlake }from"./snowflake.js";
import{ rolesjson }from"./jsontypes.js";
import{ Search }from"./search.js";
class Role extends SnowFlake{
	permissions: Permissions;
	owner: Guild;
	color!: number;
	name!: string;
	info: Guild["info"];
	hoist!: boolean;
	icon!: string;
	mentionable!: boolean;
	unicode_emoji!: string;
	position!:number;
	headers: Guild["headers"];
	constructor(json: rolesjson, owner: Guild){
		super(json.id);
		this.headers = owner.headers;
		this.info = owner.info;
		for(const thing of Object.keys(json)){
			if(thing === "id"){
				continue;
			}
			(this as any)[thing] = (json as any)[thing];
		}
		this.permissions = new Permissions(json.permissions);
		this.owner = owner;
	}
	newJson(json: rolesjson){
		for(const thing of Object.keys(json)){
			if(thing === "id"||thing==="permissions"){
				continue;
			}
			(this as any)[thing] = (json as any)[thing];
		}
		this.permissions.allow=BigInt(json.permissions);
	}
	get guild(): Guild{
		return this.owner;
	}
	get localuser(): Localuser{
		return this.guild.localuser;
	}
	getColor(): string | null{
		if(this.color === 0){
			return null;
		}
		return`#${this.color.toString(16)}`;
	}
	canManage(){
		if(this.guild.member.hasPermission("MANAGE_ROLES")){
			let max=-Infinity;
			this.guild.member.roles.forEach(r=>max=Math.max(max,r.position))
			return this.position<=max||this.guild.properties.owner_id===this.guild.member.id;
		}
		return false;
	}
}
export{ Role };
import{ Options }from"./settings.js";
class PermissionToggle implements OptionsElement<number>{
	readonly rolejson: {
		name: string;
		readableName: string;
		description: string;
	};
	permissions: Permissions;
	owner: Options;
	value!: number;
	constructor(
		roleJSON: PermissionToggle["rolejson"],
		permissions: Permissions,
		owner: Options
	){
		this.rolejson = roleJSON;
		this.permissions = permissions;
		this.owner = owner;
	}
	watchForChange(){}
	generateHTML(): HTMLElement{
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
	generateCheckbox(): HTMLElement{
		const div = document.createElement("div");
		div.classList.add("tritoggle");
		const state = this.permissions.getPermission(this.rolejson.name);

		const on = document.createElement("input");
		on.type = "radio";
		on.name = this.rolejson.name;
		div.append(on);
		if(state === 1){
			on.checked = true;
		}
		on.onclick = _=>{
			this.permissions.setPermission(this.rolejson.name, 1);
			this.owner.changed();
		};

		const no = document.createElement("input");
		no.type = "radio";
		no.name = this.rolejson.name;
		div.append(no);
		if(state === 0){
			no.checked = true;
		}
		no.onclick = _=>{
			this.permissions.setPermission(this.rolejson.name, 0);
			this.owner.changed();
		};
		if(this.permissions.hasDeny){
			const off = document.createElement("input");
			off.type = "radio";
			off.name = this.rolejson.name;
			div.append(off);
			if(state === -1){
				off.checked = true;
			}
			off.onclick = _=>{
				this.permissions.setPermission(this.rolejson.name, -1);
				this.owner.changed();
			};
		}
		return div;
	}
	submit(){}
}
import{ OptionsElement, Buttons }from"./settings.js";
import { Contextmenu } from "./contextmenu.js";
import { Channel } from "./channel.js";
class RoleList extends Buttons{
	permissions: [Role, Permissions][];
	permission: Permissions;
	readonly guild: Guild;
	readonly channel: false|Channel;
	declare buttons: [string, string][];
	readonly options: Options;
	onchange: Function;
	curid?: string;
	get info(){
		return this.guild.info;
	}
	get headers(){
		return this.guild.headers;
	}
	constructor(permissions:[Role, Permissions][], guild:Guild, onchange:Function, channel:false|Channel){
		super("");
		this.guild = guild;
		this.permissions = permissions;
		this.channel = channel;
		this.onchange = onchange;
		const options = new Options("", this);
		if(channel){
			this.permission = new Permissions("0", "0");
		}else{
			this.permission = new Permissions("0");
		}
		this.makeguildmenus(options);
		for(const thing of Permissions.info){
			options.options.push(
				new PermissionToggle(thing, this.permission, options)
			);
		}
		for(const i of permissions){
			this.buttons.push([i[0].name, i[0].id]);
		}
		this.options = options;
		guild.roleUpdate=this.groleUpdate.bind(this);
		if(channel){
			channel.croleUpdate=this.croleUpdate.bind(this);
		}
	}
	private groleUpdate(role:Role,added:1|0|-1){
		if(!this.channel){
			if(added===1){
				this.permissions.push([role,role.permissions]);
			}
		}
		if(added===-1){
			this.permissions=this.permissions.filter(r=>r[0]!==role);
		}
		this.redoButtons();
	}
	private croleUpdate(role:Role,perm:Permissions,added:boolean){
		if(added){
			this.permissions.push([role,perm])
		}else{
			this.permissions=this.permissions.filter(r=>r[0]!==role);
		}
		this.redoButtons();
	}
	makeguildmenus(option:Options){
		option.addButtonInput("","Display settings",()=>{
			const role=this.guild.roleids.get(this.curid as string);
			if(!role) return;
			const form=option.addSubForm("Display settings",()=>{},{
				fetchURL:this.info.api+"/guilds/"+this.guild.id+"/roles/"+this.curid,
				method:"PATCH",
				headers:this.headers,
				traditionalSubmit:true
			});
			form.addTextInput("Role Name:","name",{
				initText:role.name
			});
			form.addCheckboxInput("Hoisted:","hoist",{
				initState:role.hoist
			});
			form.addCheckboxInput("Allow anyone to ping this role:","mentionable",{
				initState:role.mentionable
			});
			const color="#"+role.color.toString(16).padStart(6,"0");
			form.addColorInput("Color","color",{
				initColor:color
			});
			form.addPreprocessor((obj:any)=>{
				obj.color=Number("0x"+obj.color.substring(1));
				console.log(obj.color);
			})
		})
	}
	static channelrolemenu=this.ChannelRoleMenu();
	static guildrolemenu=this.GuildRoleMenu();
	private static ChannelRoleMenu(){
		const menu=new Contextmenu<RoleList,Role>("role settings");
		menu.addbutton("Remove role",function(role){
			if(!this.channel) return;
			console.log(role);
			fetch(this.info.api+"/channels/"+this.channel.id+"/permissions/"+role.id,{
				method:"DELETE",
				headers:this.headers
			})
		},null);
		return menu;
	}
	private static GuildRoleMenu(){
		const menu=new Contextmenu<RoleList,Role>("role settings");
		menu.addbutton("Delete Role",function(role){
			if(!confirm("Are you sure you want to delete "+role.name+"?")) return;
			console.log(role);
			fetch(this.info.api+"/guilds/"+this.guild.id+"/roles/"+role.id,{
				method:"DELETE",
				headers:this.headers
			})
		},null);
		return menu;
	}
	redoButtons(){
		this.buttons=[];
		this.permissions.sort(([a],[b])=>b.position-a.position);
		for(const i of this.permissions){
			this.buttons.push([i[0].name, i[0].id]);
		}
		console.log("in here :P")
		if(!this.buttonList)return;
		console.log("in here :P");
		const elms=Array.from(this.buttonList.children);
		const div=elms[0] as HTMLDivElement;
		const div2=elms[1] as HTMLDivElement;
		console.log(div);
		div.innerHTML="";
		div.append(this.buttonListGen(div2));//not actually sure why the html is needed
	}
	buttonMap=new WeakMap<HTMLButtonElement,Role>();
	dragged?:HTMLButtonElement;
	buttonDragEvents(button:HTMLButtonElement,role:Role){
		this.buttonMap.set(button,role);
		button.addEventListener("dragstart", e=>{
			this.dragged = button;
			e.stopImmediatePropagation();
		});

		button.addEventListener("dragend", ()=>{
			this.dragged = undefined;
		});

		button.addEventListener("dragenter", event=>{
			console.log("enter");
			event.preventDefault();
			return true;
		});

		button.addEventListener("dragover", event=>{
			event.preventDefault();
			return true;
		});

		button.addEventListener("drop", _=>{
			const role2=this.buttonMap.get(this.dragged as HTMLButtonElement);
			if(!role2) return;
			const index2=this.guild.roles.indexOf(role2);
			this.guild.roles.splice(index2,1);
			const index=this.guild.roles.indexOf(role);
			this.guild.roles.splice(index+1,0,role2);
			this.guild.recalcRoles();
			console.log(role);
		});
	}
	buttonListGen(html:HTMLElement){
		const buttonTable=document.createElement("div");
		buttonTable.classList.add("flexttb");

		const roleRow=document.createElement("div");
		roleRow.classList.add("flexltr");
		roleRow.append("Roles");
		const add=document.createElement("span");
		add.classList.add("svg-plus","svgicon","addrole");
		add.onclick=async (e)=>{
			const box=add.getBoundingClientRect();
			e.stopPropagation();
			if(this.channel){
				const roles:[Role,string[]][]=[];
				for(const role of this.guild.roles){
					if(this.permissions.find(r=>r[0]==role)){
						continue;
					}
					roles.push([role,[role.name]]);
				}
				const search=new Search(roles);

				const found=await search.find(box.left,box.top);


				if(!found) return;
				console.log(found);
				this.onchange(found.id,new Permissions("0","0"));
			}else{
				const bar=document.createElement("input");
				bar.classList.add("fixedsearch");
				bar.style.left=(box.left^0)+"px";
				bar.style.top=(box.top^0)+"px";
				document.body.append(bar);
				if(Contextmenu.currentmenu != ""){
					Contextmenu.currentmenu.remove();
				}
				Contextmenu.currentmenu=bar;
				Contextmenu.keepOnScreen(bar);
				bar.onchange=()=>{
					bar.remove();
					console.log(bar.value)
					if(bar.value==="") return;
					fetch(this.info.api+`/guilds/${this.guild.id}/roles`,{
						method:"POST",
						headers:this.headers,
						body:JSON.stringify({
							color:0,
							name:bar.value,
							permissions:""
						})
					})
				}
			}
		}
		roleRow.append(add);

		buttonTable.append(roleRow);
		for(const thing of this.buttons){
			const button = document.createElement("button");
			button.classList.add("SettingsButton");
			button.textContent = thing[0];
			const role=this.guild.roleids.get(thing[1]);
			if(role){
				if(!this.channel){
					if(role.canManage()){
						this.buttonDragEvents(button,role);
						button.draggable=true;
						RoleList.guildrolemenu.bindContextmenu(button,this,role)
					}
				}else{
					if(role.canManage()){
						RoleList.channelrolemenu.bindContextmenu(button,this,role)
					}
				}
			}
			button.onclick = _=>{
				this.generateHTMLArea(thing[1], html);
				if(this.warndiv){
					this.warndiv.remove();
				}
			};
			buttonTable.append(button);
		}
		return buttonTable;
	}

	generateButtons(html:HTMLElement):HTMLDivElement{
		const div = document.createElement("div");
		div.classList.add("settingbuttons");
		div.append(this.buttonListGen(html));
		return div;
	}
	handleString(str: string): HTMLElement{
		this.curid = str;
		const arr = this.permissions.find(_=>_[0].id === str);
		if(arr){
			const perm = arr[1];
			this.permission.deny = perm.deny;
			this.permission.allow = perm.allow;
			const role = this.permissions.find(e=>e[0].id === str);
			if(role){
				this.options.name = role[0].name;
				this.options.haschanged = false;
			}
		}
		return this.options.generateHTML();
	}
	save(){
		this.onchange(this.curid, this.permission);
	}
}
export{ RoleList, PermissionToggle };
