import {Contextmenu} from "./contextmenu.js";
import {User} from "./user.js";
import {Member} from "./member.js";
import {markdown} from "./markdown.js";
import {Embed} from "./embed.js";
import {Fullscreen} from "./fullscreen.js";
import { Channel } from "./channel.js";
import {Localuser} from "./localuser.js";
import { Role } from "./role.js";
import {File} from "./file.js";

class Message{
    static contextmenu=new Contextmenu("message menu");
    owner:Channel;
    headers:Localuser["headers"];
    embeds:Embed[];
    author:User;
    mentions:User[];
    mention_roles:Role[];
    attachments:File[];//probably should be its own class tbh, should be Attachments[]
    id:string;
    message_reference;
    type:number;
    timestamp:number;
    content:string;
    static del:Promise<void>;
    static resolve:Function;
    div:HTMLDivElement;
    static setup(){
        this.del=new Promise(_=>{this.resolve=_});
        Message.setupcmenu();
    }
    static async wipeChanel(){
        this.resolve();
        document.getElementById("messages").innerHTML="";
        await Promise.allSettled([this.resolve]);
        this.del=new Promise(_=>{this.resolve=_})
    }
    static setupcmenu(){
        Message.contextmenu.addbutton("Copy raw text",function(){
            navigator.clipboard.writeText(this.content);
        });
        Message.contextmenu.addbutton("Reply",function(this:Message,div:HTMLDivElement){
            this.channel.setReplying(this);
        });
        Message.contextmenu.addbutton("Copy message id",function(){
            navigator.clipboard.writeText(this.id);
        });
        Message.contextmenu.addbutton("Copy user id",function(){
            navigator.clipboard.writeText(this.author.id);
        });
        Message.contextmenu.addbutton("Message user",function(){
            fetch(this.info.api.toString()+"/v9/users/@me/channels",
                {method:"POST",
                    body:JSON.stringify({"recipients":[this.author.id]}),
                    headers: this.headers
                });
        })
        Message.contextmenu.addbutton("Edit",function(){
            this.channel.editing=this;
            (document.getElementById("typebox") as HTMLInputElement).value=this.content;
        },null,_=>{return _.author.id===_.localuser.user.id});
        Message.contextmenu.addbutton("Delete message",function(){
            this.delete();
        },null,_=>{return _.canDelete()})
    }
    constructor(messagejson,owner:Channel){
        this.owner=owner;
        this.headers=this.owner.headers;
        for(const thing of Object.keys(messagejson)){
            if(thing==="attachments"){
                this.attachments=[];
                for(const thing of messagejson.attachments){
                    this.attachments.push(new File(thing,this));
                }
                continue;
            }
            this[thing]=messagejson[thing];
        }
        for(const thing in this.embeds){
            console.log(thing,this.embeds)
            this.embeds[thing]=new Embed(this.embeds[thing],this);
        }
        this.author=new User(this.author,this.localuser);
        for(const thing in this.mentions){
            this.mentions[thing]=new User(this.mentions[thing],this.localuser);
        }
        if(this.mentions.length||this.mention_roles.length){//currently mention_roles isn't implemented on the spacebar servers
            console.log(this.mentions,this.mention_roles)
        }
        if(this.mentionsuser(this.localuser.user)){
            console.log(this);
        }
    }
    canDelete(){
        return this.channel.hasPermission("MANAGE_MESSAGES")||this.author.id===this.localuser.user.id;
    }
    get channel(){
        return this.owner;
    }
    get guild(){
        return this.owner.guild;
    }
    get localuser(){
        return this.owner.localuser;
    }
    get info(){
        return this.owner.info;
    }
    messageevents(obj:HTMLDivElement){
        const func=Message.contextmenu.bind(obj,this);
        this.div=obj;
        Message.del.then(_=>{
            obj.removeEventListener("click",func);
            this.div=null;
        })
        obj.classList.add("messagediv");
    }
    mentionsuser(userd:User|Member){
        if(userd instanceof User){
            return this.mentions.includes(userd);
        }else if(userd instanceof Member){
            return this.mentions.includes(userd.user);
        }
    }
    getimages(){
        const build=[];
        for(const thing of this.attachments){
            if(thing.content_type.startsWith('image/')){
                build.push(thing);
            }
        }
        return build;
    }
    async edit(content){
        return await fetch(this.info.api.toString()+"/channels/"+this.channel.id+"/messages/"+this.id,{
            method: "PATCH",
            headers: this.headers,
            body:JSON.stringify({content:content})
        });
    }
    delete(){
        fetch(`${this.info.api.toString()}/channels/${this.channel.id}/messages/${this.id}`,{
            headers:this.headers,
            method:"DELETE",
        })
    }
    deleteEvent(){
        if(this.div){
            this.div.innerHTML="";
            this.div=null;
        }
        const index=this.channel.messages.indexOf(this);
        this.channel.messages.splice(this.channel.messages.indexOf(this),1);
        delete this.channel.messageids[this.id];
        const regen=this.channel.messages[index-1]
        if(regen){
            regen.generateMessage();
        }
    }
    generateMessage(premessage:Message=null){
        if(!premessage){
            premessage=this.channel.messages[this.channel.messages.indexOf(this)+1];
        }
        const div=this.div;
        if(this===this.channel.replyingto){
            div.classList.add("replying");
        }
        div.innerHTML="";
        const build = document.createElement('table');
        if(this.message_reference){
            const replyline=document.createElement("div");
            const line=document.createElement("hr");
            const minipfp=document.createElement("img")
            minipfp.classList.add("replypfp");
            replyline.appendChild(line);
            replyline.appendChild(minipfp);
            const username=document.createElement("span");
            replyline.appendChild(username);
            const reply=document.createElement("div");
            username.classList.add("username");

            Member.resolve(this.author,this.guild).then(_=>{
                if(!_) {return};
                console.log(_.error);
                if(_.error){
                    username.textContent+="Error";
                    alert("Should've gotten here")
                    const error=document.createElement("span");
                    error.textContent="!";
                    error.classList.add("membererror");
                    username.after(error);

                    return;
                }
                username.style.color=_.getColor();
            }).catch(_=>{
                console.log(_)
            });

            reply.classList.add("replytext");
            replyline.appendChild(reply);
            const line2=document.createElement("hr");
            replyline.appendChild(line2);
            line2.classList.add("reply");
            line.classList.add("startreply");
            replyline.classList.add("replyflex")
            this.channel.getmessage(this.message_reference.message_id).then(message=>{
                const author=message.author;
                reply.appendChild(markdown(message.content,{stdsize:true}));
                minipfp.src=author.getpfpsrc()
                author.profileclick(minipfp)
                username.textContent=author.username;
                author.profileclick(username)
            });
            div.appendChild(replyline);
        }

        this.messageevents(div);
        build.classList.add("message");
        div.appendChild(build);
        if({0:true,19:true}[this.type]||this.attachments.length!==0){
            const pfpRow = document.createElement('th');

            let pfpparent, current
            if(premessage!=null){
                pfpparent??=premessage;
                let pfpparent2=pfpparent.all;
                pfpparent2??=pfpparent;
                const old=(new Date(pfpparent2.timestamp).getTime())/1000;
                const newt=(new Date(this.timestamp).getTime())/1000;
                current=(newt-old)>600;
            }
            const combine=(premessage?.author?.id!=this.author.id)||(current)||this.message_reference
            if(combine){
                const pfp=this.author.buildpfp();
                this.author.profileclick(pfp);
                pfpRow.appendChild(pfp);
            }else{
                div["pfpparent"]=pfpparent;
            }
            pfpRow.classList.add("pfprow")
            build.appendChild(pfpRow);
            const text=document.createElement("th");

            const texttxt=document.createElement("table");
            texttxt.classList.add("commentrow")
            text.appendChild(texttxt);
            if(combine){
                const username=document.createElement("span");
                username.classList.add("username")
                this.author.profileclick(username);
                Member.resolve(this.author,this.guild).then(_=>{
                    if(!_) {return};
                    if(_.error){
                        const error=document.createElement("span");
                        error.textContent="!";
                        error.classList.add("membererror");
                        username.after(error);

                        return;
                    }
                    username.style.color=_.getColor();
                })
                username.textContent=this.author.username;
                const userwrap=document.createElement("tr")
                userwrap.appendChild(username)
                if(this.author.bot){
                    const username=document.createElement("span");
                    username.classList.add("bot")
                    username.textContent="BOT";
                    userwrap.appendChild(username)
                }
                const time=document.createElement("span");
                time.textContent="  "+formatTime(new Date(this.timestamp));
                time.classList.add("timestamp")
                userwrap.appendChild(time);

                texttxt.appendChild(userwrap)
            }
            const messaged=markdown(this.content);
            div["txt"]=messaged;
            const messagedwrap=document.createElement("tr")
            messagedwrap.appendChild(messaged)
            texttxt.appendChild(messagedwrap)

            build.appendChild(text)
            if(this.attachments.length){
                console.log(this.attachments)
                const attatch = document.createElement("tr")
                for(const thing of this.attachments){
                    attatch.appendChild(thing.getHTML())
                }
                messagedwrap.appendChild(attatch)
            }
            if(this.embeds.length){
                const embeds = document.createElement("tr")
                for(const thing of this.embeds){
                    embeds.appendChild(thing.generateHTML());
                }
                messagedwrap.appendChild(embeds)
            }
            //
        }else if(this.type===7){

            const text=document.createElement("th");

            const texttxt=document.createElement("table");
            text.appendChild(texttxt);
            build.appendChild(text)

            const messaged=document.createElement("p");
            div["txt"]=messaged;
            messaged.textContent="welcome: "+this.author.username;
            const messagedwrap=document.createElement("tr")
            messagedwrap.appendChild(messaged);

            const time=document.createElement("span");
            time.textContent="  "+formatTime(new Date(this.timestamp));
            time.classList.add("timestamp");
            messagedwrap.append(time);

            texttxt.appendChild(messagedwrap)
        }
        div["all"]=this;
        return(div)
    }
    buildhtml(premessage:Message){
        if(this.div){console.error(`HTML for ${this} already exists, aborting`);return;}
        //premessage??=messages.lastChild;
        const div=document.createElement("div");
        this.div=div;
        return this.generateMessage(premessage);
    }
    createunknown(fname,fsize,src){
        const div=document.createElement("table");
        div.classList.add("unknownfile");
        const nametr=document.createElement("tr");
        div.append(nametr);
        const fileicon=document.createElement("td");
        nametr.append(fileicon);
        fileicon.append("🗎");
        fileicon.classList.add("fileicon");
        fileicon.rowSpan=2;
        const nametd=document.createElement("td");
        if(src){
            const a=document.createElement("a");
            a.href=src;
            a.textContent=fname;
            nametd.append(a);
        }else{
            nametd.textContent=fname;
        }

        nametd.classList.add("filename");
        nametr.append(nametd);
        const sizetr=document.createElement("tr");
        const size=document.createElement("td");
        sizetr.append(size);
        size.textContent="Size:"+this.filesizehuman(fsize);
        size.classList.add("filesize");
        div.appendChild(sizetr)
        return div;
    }
    filesizehuman(fsize){
        var i = fsize == 0 ? 0 : Math.floor(Math.log(fsize) / Math.log(1024));
        return +((fsize / Math.pow(1024, i)).toFixed(2)) * 1 + ' ' + ['Bytes', 'Kilobytes', 'Megabytes', 'Gigabytes', 'Terabytes'][i];
    }
}

function formatTime(date) {
    const now = new Date();
    const sameDay = date.getDate() === now.getDate() &&
        date.getMonth() === now.getMonth() &&
        date.getFullYear() === now.getFullYear();

    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    const isYesterday = date.getDate() === yesterday.getDate() &&
        date.getMonth() === yesterday.getMonth() &&
        date.getFullYear() === yesterday.getFullYear();

    const formatTime = date => date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    if (sameDay) {
        return `Today at ${formatTime(date)}`;
    } else if (isYesterday) {
        return `Yesterday at ${formatTime(date)}`;
    } else {
        return `${date.toLocaleDateString()} at ${formatTime(date)}`;
    }
}
Message.setup();
export { Message };
