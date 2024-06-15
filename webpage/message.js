class cmessage{
    static contextmenu=new contextmenu("message menu");
    static setupcmenu(){
        cmessage.contextmenu.addbutton("Copy raw text",function(){
            console.log(this)
            navigator.clipboard.writeText(this.content);
        });
        cmessage.contextmenu.addbutton("Reply",function(div){
            console.log(this)
            if(replyingto){
                replyingto.classList.remove("replying");
            }
            replyingto=div;
            console.log(div);
            replyingto.classList.add("replying");
        });
        cmessage.contextmenu.addbutton("Copy message id",function(){
            console.log(this)
            navigator.clipboard.writeText(this.id);
        });
        cmessage.contextmenu.addbutton("Copy user id",function(){
            console.log(this)
            navigator.clipboard.writeText(this.author.id);
        });
        cmessage.contextmenu.addbutton("Message user",function(){
            console.log(this)
            fetch(info.api.toString()+"/v9/users/@me/channels",
                {method:"POST",
                    body:JSON.stringify({"recipients":[this.author.id]}),
                    headers: {"Content-type": "application/json; charset=UTF-8",Authorization:token}
                });
        })
        cmessage.contextmenu.addbutton("Edit",function(){
            console.log(this)
            editing=this.id;
            document.getElementById("typebox").value=this.content;
        },null,_=>{return _.author.id==READY.d.user.id});
    }
    constructor(messagejson,owner){
        console.log(owner)
        this.owner=owner;
        this.headers=this.owner.headers;
        for(const thing of Object.keys(messagejson)){
            this[thing]=messagejson[thing];
        }
        this.author=new user(this.author);
        console.log(this.type)
    }
    messageevents(obj){
        cmessage.contextmenu.bind(obj,this)
        obj.classList.add("messagediv")
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
            username.classList.add("username")
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
                username.innerText=author.username;
                profileclick(username,author)
            });
            div.appendChild(replyline);
        }

        this.messageevents(div);
        messagelist.push(div)
        build.classList.add("message");
        div.appendChild(build);
        if({0:true,19:true}[this.type]||this.attachments.length!=0){
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
                username.innerText=this.author.username;
                const userwrap=document.createElement("tr")
                userwrap.appendChild(username)

                const time=document.createElement("span");
                time.innerText="  "+formatTime(new Date(this.timestamp));
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
            if(this.attachments.length!=0){
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
            //
        }else if(this.type===7){

            const text=document.createElement("th");

            const texttxt=document.createElement("table");
            text.appendChild(texttxt);
            build.appendChild(text)

            const messaged=document.createElement("p");
            div.txt=messaged;
            messaged.innerText="welcome: "+this.author.username;
            const messagedwrap=document.createElement("tr")
            messagedwrap.appendChild(messaged);

            const time=document.createElement("span");
            time.innerText="  "+formatTime(new Date(this.timestamp));
            time.classList.add("timestamp");
            messagedwrap.append(time);

            texttxt.appendChild(messagedwrap)
            console.log(div)
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
