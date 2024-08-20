//const usercache={};
import {Member} from "./member.js";
import {MarkDown} from "./markdown.js";
import {Contextmenu} from "./contextmenu.js";
import {Localuser} from "./localuser.js";
import {Guild} from "./guild.js";
import { SnowFlake } from "./snowflake.js";
import { presencejson, userjson } from "./jsontypes.js";

class User{
    static userids={};
    owner:Localuser;
    hypotheticalpfp:boolean;
    snowflake:SnowFlake<User>;
    avatar:string;
    username:string;
    bio:MarkDown;
    discriminator:string;
    pronouns:string;
    bot:boolean;
    public_flags: number;
    accent_color: number;
    banner: string|null|undefined;
    hypotheticalbanner:boolean;
    premium_since: string;
    premium_type: number;
    theme_colors: string;
    badge_ids: string[];
    members: WeakMap<Guild, Member|undefined|Promise<Member|undefined>>=new WeakMap();
    private status:string;
    clone(){
        return new User({
            username:this.username,
            id:this.id+"#clone",
            public_flags:this.public_flags,
            discriminator:this.discriminator,
            avatar:this.avatar,
            accent_color:this.accent_color,
            banner:this.banner,
            bio:this.bio.rawString,
            premium_since:this.premium_since,
            premium_type:this.premium_type,
            bot:this.bot,
            theme_colors:this.theme_colors,
            pronouns:this.pronouns,
            badge_ids:this.badge_ids
        },this.owner)
    }
    public getPresence(presence:presencejson|null){
        if(presence){
            this.setstatus(presence.status);
        }else{
            this.setstatus("offline");
        }
    }
    setstatus(status:string){
        this.status=status;
    }
    async getStatus(){
        if(this.status){
            return this.status;
        }else{
            return "offline";
        }
    }
    get id(){
        return this.snowflake.id;
    }
    static contextmenu:Contextmenu=new Contextmenu("User Menu");
    static setUpContextMenu(){
        this.contextmenu.addbutton("Copy user id",function(this:User){
            navigator.clipboard.writeText(this.id);
        });
        this.contextmenu.addbutton("Message user",function(this:User){
            fetch(this.info.api+"/users/@me/channels",
                {method:"POST",
                    body:JSON.stringify({"recipients":[this.id]}),
                    headers: this.localuser.headers
                });
        });

    }
    static clear(){
        this.userids={};
    }
    static checkuser(user:User|userjson,owner:Localuser):User{
        if(User.userids[user.id]){
            return User.userids[user.id];
        }else{
            const tempuser=new User(user as userjson,owner,true)
            User.userids[user.id]=tempuser;
            return tempuser;
        }
    }
    get info(){
        return this.owner.info;
    }
    get localuser(){
        return this.owner;
    }
    constructor(userjson:userjson,owner:Localuser,dontclone=false){
        this.owner=owner;
        if(!owner){console.error("missing localuser")}
        if(dontclone){
            for(const thing of Object.keys(userjson)){
                if(thing==="bio"){
                    this.bio=new MarkDown(userjson[thing],this.localuser);
                    continue;
                }
                if(thing === "id"){
                    this.snowflake=new SnowFlake(userjson[thing],this);
                    continue;
                }
                this[thing]=userjson[thing];
            }
            this.hypotheticalpfp=false;
        }else{
            return User.checkuser(userjson,owner);
        }
    }
    async resolvemember(guild:Guild){
        return await Member.resolveMember(this,guild);
    }

    async getUserProfile(){
        return (await fetch(`${this.info.api}/users/${this.id.replace("#clone","")}/profile?with_mutual_guilds=true&with_mutual_friends=true`,{
            headers:this.localuser.headers
        })).json()
    }
    resolving:false|Promise<any>=false;
    async getBadge(id:string){
        console.log(id,":3")
        if(this.localuser.badges.has(id)){
            return this.localuser.badges.get(id);
        }else{
            if(this.resolving)
            {
                await this.resolving;
                return this.localuser.badges.get(id);
            }

            const prom=await this.getUserProfile();
            this.resolving=prom;
            const badges=prom.badges;
            this.resolving=false;
            for(const thing of badges){
                this.localuser.badges.set(thing.id,thing);
            }
            return this.localuser.badges.get(id);
        }
    }
    buildpfp(){
        const pfp=document.createElement('img');
        pfp.src=this.getpfpsrc();
        pfp.classList.add("pfp");
        pfp.classList.add("userid:"+this.id);
        return pfp;
    }
    async buildstatuspfp(){
        const div=document.createElement("div");
        div.style.position="relative";
        const pfp=this.buildpfp();
        div.append(pfp);
        {
            const status=document.createElement("div");
            status.classList.add("statusDiv");
            switch(await this.getStatus()){
                case "offline":
                    status.classList.add("offlinestatus");
                    break;
                case "online":
                default:
                    status.classList.add("onlinestatus");
                    break;
            }
            div.append(status);
        }
        return div;
    }
    userupdate(json:userjson){
        if(json.avatar!==this.avatar){
            console.log
            this.changepfp(json.avatar);
        }
    }
    bind(html:HTMLElement,guild:Guild=null,error=true){
        if(guild&&guild.id!=="@me"){
            Member.resolveMember(this,guild).then(_=>{
                if(_===undefined&&error){
                    const error=document.createElement("span");
                    error.textContent="!";
                    error.classList.add("membererror");
                    html.after(error);
                    return;
                }
                _.bind(html);
            }).catch(_=>{
                console.log(_)
            });
        }
        this.profileclick(html,guild);
        User.contextmenu.bind(html,this);
    }
    static async resolve(id:string,localuser:Localuser){
        const json=await fetch(localuser.info.api.toString()+"/users/"+id+"/profile",
        {headers:localuser.headers}
        ).then(_=>_.json());
        return new User(json,localuser);
    }
    changepfp(update:string){
        this.avatar=update;
        this.hypotheticalpfp=false;
        const src=this.getpfpsrc();
        console.log(src)
        for(const thing of document.getElementsByClassName("userid:"+this.id)){
            (thing as HTMLImageElement).src=src;
        }
    }
    getpfpsrc(){
        if(this.hypotheticalpfp){
            return this.avatar;
        }
        if(this.avatar!=null){
            return this.info.cdn+"/avatars/"+this.id.replace("#clone","")+"/"+this.avatar+".png";
        }else{
            const int=new Number((BigInt(this.id) >> 22n) % 6n);
            return this.info.cdn+`/embed/avatars/${int}.png`;
        }
    }
    createjankpromises(){
        new Promise(_=>{})
    }
    async buildprofile(x:number,y:number,guild:Guild=null){
        if(Contextmenu.currentmenu!=""){
            Contextmenu.currentmenu.remove();
        }


        const div=document.createElement("div");

        if(this.accent_color){
            div.style.setProperty("--accent_color","#"+this.accent_color.toString(16).padStart(6,"0"));
        }else{
            div.style.setProperty("--accent_color","transparent");
        }
        if(this.banner){
            const banner=document.createElement("img")
            let src:string;
            if(!this.hypotheticalbanner){
                src=this.info.cdn+"/avatars/"+this.id.replace("#clone","")+"/"+this.banner+".png";
            }else{
                src=this.banner;
            }
            console.log(src,this.banner);
            banner.src=src;
            banner.classList.add("banner");
            div.append(banner);
        }
        if(x!==-1){
            div.style.left=x+"px";
            div.style.top=y+"px";
            div.classList.add("profile","flexttb");
        }else{
            this.setstatus("online");
            div.classList.add("hypoprofile","flexttb");
        }
        const badgediv=document.createElement("div");
        badgediv.classList.add("badges");
        (async ()=>{
            console.log(this.badge_ids,":3")
            if(!this.badge_ids) return;
            for(const id of this.badge_ids){
                const badgejson=await this.getBadge(id);
                const badge=document.createElement(badgejson.link?"a":"div");
                badge.classList.add("badge")
                const img=document.createElement("img");
                img.src=badgejson.icon;
                badge.append(img);
                const span=document.createElement("span");
                span.textContent=badgejson.description;
                badge.append(span);
                if(badge instanceof HTMLAnchorElement){
                    badge.href=badgejson.link;
                }
                badgediv.append(badge);
            }
        })()
        {
            const pfp=await this.buildstatuspfp();
            div.appendChild(pfp);
        }
        {
            const userbody=document.createElement("div");
            userbody.classList.add("infosection");
            div.appendChild(userbody);
            const usernamehtml=document.createElement("h2");
            usernamehtml.textContent=this.username;
            userbody.appendChild(usernamehtml);
            userbody.appendChild(badgediv);
            const discrimatorhtml=document.createElement("h3");
            discrimatorhtml.classList.add("tag");
            discrimatorhtml.textContent=this.username+"#"+this.discriminator;
            userbody.appendChild(discrimatorhtml)

            const pronounshtml=document.createElement("p");
            pronounshtml.textContent=this.pronouns;
            pronounshtml.classList.add("pronouns");
            userbody.appendChild(pronounshtml)

            const rule=document.createElement("hr");
            userbody.appendChild(rule);
            const biohtml=this.bio.makeHTML();
            userbody.appendChild(biohtml);
            if(guild){
                Member.resolveMember(this,guild).then(member=>{
                    if(!member) return;
                    const roles=document.createElement("div");
                    roles.classList.add("rolesbox");
                    for(const role of member.roles){
                        const div=document.createElement("div");
                        div.classList.add("rolediv");
                        const color=document.createElement("div");
                        div.append(color);
                        color.style.setProperty("--role-color","#"+role.color.toString(16).padStart(6,"0"))
                        color.classList.add("colorrolediv");
                        const span=document.createElement("span");
                        div.append(span);
                        span.textContent=role.name;
                        roles.append(div);
                    }
                    userbody.append(roles);
                });
            }
        }
        console.log(div);

        if(x!==-1){
            Contextmenu.currentmenu=div;
            document.body.appendChild(div)
            Contextmenu.keepOnScreen(div);
        }
        return div;
    }
    profileclick(obj:HTMLElement,guild:Guild){
        obj.onclick=e=>{
            this.buildprofile(e.clientX,e.clientY,guild);
            e.stopPropagation();
        }
    }
}
User.setUpContextMenu();
export {User};
