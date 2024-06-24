class cmessage{
    static contextmenu=new contextmenu("message menu");
    static setupcmenu(){
        cmessage.contextmenu.addbutton("Copy raw text",function(){
            navigator.clipboard.writeText(this.content);
        });
        cmessage.contextmenu.addbutton("Reply",function(div){
            if(replyingto){
                replyingto.classList.remove("replying");
            }
            replyingto=div;
            console.log(div);
            replyingto.classList.add("replying");
        });
        cmessage.contextmenu.addbutton("Copy message id",function(){
            navigator.clipboard.writeText(this.id);
        });
        cmessage.contextmenu.addbutton("Copy user id",function(){
            navigator.clipboard.writeText(this.author.id);
        });
        cmessage.contextmenu.addbutton("Message user",function(){
            fetch(info.api.toString()+"/v9/users/@me/channels",
                {method:"POST",
                    body:JSON.stringify({"recipients":[this.author.id]}),
                    headers: {"Content-type": "application/json; charset=UTF-8",Authorization:token}
                });
        })
        cmessage.contextmenu.addbutton("Edit",function(){
            editing=this;
            document.getElementById("typebox").value=this.content;
        },null,_=>{return _.author.id==READY.d.user.id});
    }
    constructor(messagejson,owner){
        this.owner=owner;
        this.headers=this.owner.headers;
        for(const thing of Object.keys(messagejson)){
            this[thing]=messagejson[thing];
        }
        for(const thing in this.embeds){
            console.log(thing,this.embeds)
            this.embeds[thing]=new embed(this.embeds[thing],this);
        }
        this.author=new user(this.author);
        for(const thing in this.mentions){
            this.mentions[thing]=new user(this.mentions[thing]);
        }
        if(this.mentions.length||this.mention_roles.length){//currently mention_roles isn't implemented on the spacebar servers
            console.log(this.mentions,this.mention_roles)
        }
        if(this.mentionsuser(this.localuser.user)){
            console.log(this);
        }
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
    messageevents(obj){
        cmessage.contextmenu.bind(obj,this)
        obj.classList.add("messagediv")
    }
    mentionsuser(userd){
        if(userd instanceof user){
            return this.mentions.includes(userd);
        }else if(userd instanceof member){
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
        return await fetch(info.api.toString()+"/channels/"+this.channel.id+"/messages/"+this.id,{
            method: "PATCH",
            headers: this.headers,
            body:JSON.stringify({content:content})
        });
    }
    buildhtml(premessage){
        //premessage??=messages.lastChild;
        const build = document.createElement('table');
        const div=document.createElement("div");

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

            member.resolve(this.author,this.guild).then(_=>{
                username.style.color=_.getColor();
            });

            reply.classList.add("replytext");
            replyline.appendChild(reply);
            const line2=document.createElement("hr");
            replyline.appendChild(line2);
            line2.classList.add("reply");
            line.classList.add("startreply");
            replyline.classList.add("replyflex")
            fetch(info.api.toString()+"/v9/channels/"+this.message_reference.channel_id+"/messages?limit=1&around="+this.message_reference.message_id,{headers:this.headers}).then(responce=>responce.json()).then(responce=>{
                const author=new user(responce[0].author);

                reply.appendChild(markdown(responce[0].content));

                minipfp.src=author.getpfpsrc()
                profileclick(minipfp,author)
                username.textContent=author.username;
                profileclick(username,author)
            });
            div.appendChild(replyline);
        }

        this.messageevents(div);
        messagelist.push(div)
        build.classList.add("message");
        div.appendChild(build);
        if({0:true,19:true}[this.type]||this.attachments.length!==0){
            const pfpRow = document.createElement('th');

            let pfpparent, current
            if(premessage!=null){
                pfpparent=premessage.pfpparent;
                pfpparent??=premessage;
                let pfpparent2=pfpparent.all;
                pfpparent2??=pfpparent;
                const old=(new Date(pfpparent2.timestamp).getTime())/1000;
                const newt=(new Date(this.timestamp).getTime())/1000;
                current=(newt-old)>600;
            }
            const combine=(premessage?.userid!=this.author.id&premessage?.author?.id!=this.author.id)||(current)||this.message_reference
            if(combine){
                const pfp=this.author.buildpfp();
                profileclick(pfp,this.author);
                pfpRow.appendChild(pfp);
            }else{
                div.pfpparent=pfpparent;
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
                profileclick(username,this.author);
                    member.resolve(this.author,this.guild).then(_=>{
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
            div.txt=messaged;
            const messagedwrap=document.createElement("tr")
            messagedwrap.appendChild(messaged)
            texttxt.appendChild(messagedwrap)

            build.appendChild(text)
            if(this.attachments.length){
                const attatch = document.createElement("tr")
                for(const thing of this.attachments){
                    const array=thing.url.split("/");array.shift();array.shift();array.shift();
                    const src=info.cdn.toString()+array.join("/");
                    if(thing.content_type.startsWith('image/')){
                        const img=document.createElement("img");
                        img.classList.add("messageimg")
                        img.onclick=function(){
                            const full=new fullscreen(["img",img.src,["fit"]]);
                            full.show();
                        }
                        img.src=src;
                        attatch.appendChild(img)
                    }else{
                        attatch.appendChild(createunknown(thing.filename,thing.size,src))
                    }

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
            div.txt=messaged;
            messaged.textContent="welcome: "+this.author.username;
            const messagedwrap=document.createElement("tr")
            messagedwrap.appendChild(messaged);

            const time=document.createElement("span");
            time.textContent="  "+formatTime(new Date(this.timestamp));
            time.classList.add("timestamp");
            messagedwrap.append(time);

            texttxt.appendChild(messagedwrap)
        }
        div.userid=this.author.id;
        div.all=this;
        return(div)
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
cmessage.setupcmenu();
