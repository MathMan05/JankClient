class guild{
    static contextmenu=new contextmenu("guild menu");
    static setupcontextmenu(){
        guild.contextmenu.addbutton("Copy Guild id",function(){
            console.log(this)
            navigator.clipboard.writeText(this.id);
        });

        guild.contextmenu.addbutton("Mark as read",function(){
            console.log(this)
            this.markAsRead();
        });

        guild.contextmenu.addbutton("Notifications",function(){
            console.log(this)
            this.setnotifcation();
        });

        guild.contextmenu.addbutton("Leave guild",function(){
            this.confirmleave();
        },null,function(_){return _.properties.owner_id!==_.member.user.id});

        guild.contextmenu.addbutton("Delete guild",function(){
            this.confirmDelete();
        },null,function(_){return _.properties.owner_id===_.member.user.id});

        guild.contextmenu.addbutton("Create invite",function(){
            console.log(this);
        },null,_=>true,_=>false);
        /* -----things left for later-----
        guild.contextmenu.addbutton("Leave Guild",function(){
            console.log(this)
            this.deleteChannel();
        },null,_=>{return thisuser.isAdmin()})

        guild.contextmenu.addbutton("Mute Guild",function(){
            editchannelf(this);
        },null,_=>{return thisuser.isAdmin()})
        */
    }
    constructor(JSON,owner){

        if(JSON===-1){
            return;
        }
        this.owner=owner;
        this.headers=this.owner.headers;
        if(!this.owner){
            console.error("localuser was not included, please fix")
        }
        this.channels=[];
        this.channelids={};
        this.id=JSON.id;
        this.properties=JSON.properties;
        this.roles=[];
        this.roleids={};
        this.prevchannel=undefined;
        this.message_notifications=0;
        for(const roley of JSON.roles){
            const roleh=new role(roley);
            this.roles.push(roleh)
            this.roleids[roleh.id]=roleh;
        }
        for(const thing of JSON.channels){
            const temp=new channel(thing,this);
            this.channels.push(temp);
            this.channelids[temp.id]=temp;
        }
        this.headchannels=[];
        for(const thing of this.channels){
            if(thing.resolveparent(this)){
                this.headchannels.push(thing);
            }
        }
    }
    notisetting(settings){
        this.message_notifications=settings.message_notifications;
    }
    setnotifcation(){
    let noti=this.message_notifications
    const notiselect=new fullscreen(
    ["vdiv",
        ["radio","select notifications type",
            ["all","only mentions","none"],
            function(e){
                noti=["all","only mentions","none"].indexOf(e);
            },
            noti
        ],
        ["button","","submit",_=>{
            fetch(info.api.toString()+"/v9/users/@me/guilds/settings",{
                method:"PATCH",
                headers:this.headers,
                body:JSON.stringify({
                    "guilds":{
                        [this.id]:{
                            "message_notifications": noti
                        }
                    }
                })
            })
            this.message_notifications=noti;
        }]
    ]);
    notiselect.show();
    }
    confirmleave(){
        const full= new fullscreen([
            "vdiv",
            ["title",
                "Are you sure you want to leave?"
            ],
            ["hdiv",
                ["button",
                "",
                "Yes, I'm sure",
                _=>{
                    this.leave().then(_=>{
                        full.hide();
                    });
                }
                ],
                ["button",
                "",
                "Nevermind",
                _=>{
                    full.hide();
                }
                ]

            ]
        ]);
        full.show();
    }
    async leave(){
        return fetch(info.api.toString()+"/users/@me/guilds/"+this.id,{
            method:"DELETE",
            headers:this.headers
        })
    }
    printServers(){
        let build=""
        for(const thing of this.headchannels){
            build+=(thing.name+":"+thing.position)+"\n";
            for(const thingy of thing.children){
                build+=("   "+thingy.name+":"+thingy.position)+"\n";
            }
        }
        console.log(build);
    }
    calculateReorder(){
        let position=-1;
        let build=[];
        for(const thing of this.headchannels){
            const thisthing={id:thing.id}
            if(thing.position<=position){
                thing.position=(thisthing.position=position+1);
            }
            position=thing.position;
            console.log(position);
            if(thing.move_id&&thing.move_id!==thing.parent_id){
                thing.parent_id=thing.move_id;
                thisthing.parent_id=thing.parent_id;
                thing.move_id=undefined;
            }
            if(thisthing.position||thisthing.parent_id){
                build.push(thisthing);
                console.log(this.channelids[thisthing.parent_id]);
            }
            if(thing.children.length>0){
                const things=thing.calculateReorder()
                for(const thing of things){
                    build.push(thing);
                }
            }
        }
        console.log(build)
        this.printServers();
        if(build.length===0){return}
        const serverbug=false;
        if(serverbug){
            for(const thing of build){
                console.log(build,thing)
                fetch(info.api.toString()+"/v9/guilds/"+this.id+"/channels",{
                    method:"PATCH",
                    headers:this.headers,
                    body:JSON.stringify([thing])
                });
            }
        }else{
            fetch(info.api.toString()+"/v9/guilds/"+this.id+"/channels",{
                method:"PATCH",
                headers:this.headers,
                body:JSON.stringify(build)
            });
        }

    }
    get localuser(){
        return this.owner;
    }
    loadChannel(id){
        this.localuser.channelfocus=this.channelids[id];
        this.channelids[id].getHTML();
    }
    sortchannels(){
        this.headchannels.sort((a,b)=>{return a.position-b.position;});
    }
    generateGuildIcon(){
        const divy=document.createElement("div");
        divy.classList.add("servernoti");

        const noti=document.createElement("div");
        noti.classList.add("unread");
        divy.append(noti);
        this.localuser.guildhtml[this.id]=divy;
        if(this.properties.icon!=null){
            const img=document.createElement("img");
            img.classList.add("pfp","servericon");
            img.src=info.cdn.toString()+"icons/"+this.properties.id+"/"+this.properties.icon+".png";
            divy.appendChild(img)
            img.onclick=()=>{
                console.log(this.loadGuild)
                this.loadGuild();
                this.loadChannel();
            }
            guild.contextmenu.bind(img,this);
        }else{
            const div=document.createElement("div");
            let build="";
            for(const char of this.properties.name.split(" ")){
                build+=char[0];
            }
            div.textContent=build;
            div.classList.add("blankserver","servericon")
            divy.appendChild(div)
            div.onclick=()=>{
                this.loadGuild();
                this.loadChannel();
            }
            guild.contextmenu.bind(div,this)
        }
        return divy;
    }
    confirmDelete(){
        let confirmname="";
        const full= new fullscreen([
            "vdiv",
            ["title",
                "Are you sure you want to delete "+this.properties.name+"?"
            ],
            ["textbox",
                "Name of server:",
                "",
                function(){
                    confirmname=this.value;
                }
            ]
            ,
            ["hdiv",
                ["button",
                "",
                "Yes, I'm sure",
                _=>{
                    console.log(confirmname)
                    if(confirmname!==this.properties.name){
                        return;
                    }
                    this.delete().then(_=>{
                        full.hide();
                    });
                }
                ],
                ["button",
                "",
                "Nevermind",
                _=>{
                    full.hide();
                }
                ]

            ]
        ]);
        full.show();
    }
    async delete(){
        return fetch(info.api.toString()+"/guilds/"+this.id+"/delete",{
            method:"POST",
            headers:this.headers,
        })
    }
    unreads(html){
        if(html){
            this.html=html;
        }else{
            html=this.html;
        }
        let read=true;
        for(const thing of this.channels){
            if(thing.hasunreads){
                console.log(thing)
                read=false;
                break;
            }
        }
        if(!html){return;}
        if(read){
            html.children[0].classList.remove("notiunread");
        }else{
            html.children[0].classList.add("notiunread");
        }
    }
    getHTML(){
        //this.printServers();
        this.sortchannels();
        this.printServers();
        const build=document.createElement("div");
        for(const thing of this.headchannels){
            build.appendChild(thing.createguildHTML(this.isAdmin()));
        }
        return build;
    }
    isAdmin(){
        return this.member.isAdmin()
    }
    async markAsRead(){
        const build={read_states:[]};
        for(const thing of this.channels){
            if(thing.hasunreads){
                build.read_states.push({channel_id:thing.id,message_id:thing.lastmessageid,read_state_type:0});
                thing.lastreadmessageid=thing.lastmessageid;
                thing.myhtml.classList.remove("cunread");
            }
        }
        this.unreads();
        fetch(info.api.toString()+"/v9/read-states/ack-bulk",{
            method:"POST",
            headers:this.headers,
            body:JSON.stringify(build)
        })
    }
    fillMember(member){
        const realroles=[];
        for(const thing of member.roles){
            realroles.push(this.getRole(thing));
        }
        member.roles=realroles;
        return member;
    }
    giveMember(member){
        this.fillMember(member);
        this.member=member;
    }
    getRole(ID){
        return this.roleids[ID];
    }
    hasRole(r){
        if((typeof r)!==(typeof "")){
            r=r.id;
        }
        return this.member.hasRole(r);
    }
    loadChannel(ID){
        if(ID&&this.channelids[ID]){
            this.channelids[ID].getHTML();
            return;
        }
        if(this.prevchannel){
            console.log(this.prevchannel)
            this.prevchannel.getHTML();
            return;
        }
        for(const thing of this.channels){
            if(thing.children.length===0){
                thing.getHTML();
                return
            }
        }
    }
    loadGuild(){
        this.localuser.loadGuild(this.id);
    }
    updateChannel(JSON){
        this.channelids[JSON.id].updateChannel(JSON);
        this.headchannels=[];
        for(const thing of this.channels){
            thing.children=[];
        }
        for(const thing of this.channels){
            if(thing.resolveparent(this)){
                this.headchannels.push(thing);
            }
        }
        this.printServers();
    }
    createChannelpac(JSON){
        const thischannel=new channel(JSON,this);
        this.channelids[JSON.id]=thischannel;
        this.channels.push(thischannel);
        thischannel.resolveparent(this);
        if(!thischannel.parrent){
            this.headchannels.push(thischannel);
        }
        this.calculateReorder();
        this.printServers();
    }
    delChannel(JSON){
        delete this.channelids[JSON.id];
        const build=[];
        for(const thing of this.channels){
            if(thing.id!==JSON.id){
                build.push(thing)
            }else{
                if(thing.parrent){
                    thing.parrent.delChannel(JSON);
                }
            }
        }
        this.channels=build;
    }
    createChannel(name,type){
        fetch(info.api.toString()+"/guilds/"+this.id+"/channels",{
            method:"Post",
            headers:this.headers,
            body:JSON.stringify({name: name, type: type})
        })
    }
}
guild.setupcontextmenu();
