import { Channel } from "./channel.js";
import { Localuser } from "./localuser.js";
import {Contextmenu} from "./contextmenu.js";
import {Role} from "./role.js";
import {Fullscreen} from "./fullscreen.js";
import {Member} from "./member.js";

class Guild{
    owner:Localuser;
    headers:Localuser["headers"];
    channels:Channel[];
    channelids:{[key:string]:Channel};
    id:string;
    properties
    roles:Role[];
    roleids:{[key:string]:Role};
    prevchannel:Channel;
    message_notifications:number;
    headchannels:Channel[];
    position:number;
    parent_id:string;
    member:Member;
    html:HTMLElement;
    static contextmenu=new Contextmenu("guild menu");
    static setupcontextmenu(){
        Guild.contextmenu.addbutton("Copy Guild id",function(){
            console.log(this)
            navigator.clipboard.writeText(this.id);
        });

        Guild.contextmenu.addbutton("Mark as read",function(){
            console.log(this)
            this.markAsRead();
        });

        Guild.contextmenu.addbutton("Notifications",function(){
            console.log(this)
            this.setnotifcation();
        });

        Guild.contextmenu.addbutton("Leave guild",function(){
            this.confirmleave();
        },null,function(_){return _.properties.owner_id!==_.member.user.id});

        Guild.contextmenu.addbutton("Delete guild",function(){
            this.confirmDelete();
        },null,function(_){return _.properties.owner_id===_.member.user.id});

        Guild.contextmenu.addbutton("Create invite",function(){
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
    constructor(JSON,owner:Localuser,member){

        if(JSON===-1){
            return;
        }
        this.owner=owner;
        this.headers=this.owner.headers;
        this.channels=[];
        this.channelids={};
        this.id=JSON.id;
        this.properties=JSON.properties;
        this.roles=[];
        this.roleids={};
        this.prevchannel=undefined;
        this.message_notifications=0;
        for(const roley of JSON.roles){
            const roleh=new Role(roley,this);
            this.roles.push(roleh)
            this.roleids[roleh.id]=roleh;
        }
        Member.resolve(member,this).then(_=>this.member=_);
        for(const thing of JSON.channels){
            const temp=new Channel(thing,this);
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
    const notiselect=new Fullscreen(
    ["vdiv",
        ["radio","select notifications type",
            ["all","only mentions","none"],
            function(e){
                noti=["all","only mentions","none"].indexOf(e);
            },
            noti
        ],
        ["button","","submit",_=>{
            fetch(this.info.api.toString()+"/v9/users/@me/guilds/settings",{
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
        const full= new Fullscreen([
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
        return fetch(this.info.api.toString()+"/users/@me/guilds/"+this.id,{
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
            const thisthing={id:thing.id,position:undefined,parent_id:undefined}
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
                fetch(this.info.api.toString()+"/v9/guilds/"+this.id+"/channels",{
                    method:"PATCH",
                    headers:this.headers,
                    body:JSON.stringify([thing])
                });
            }
        }else{
            fetch(this.info.api.toString()+"/v9/guilds/"+this.id+"/channels",{
                method:"PATCH",
                headers:this.headers,
                body:JSON.stringify(build)
            });
        }

    }
    get localuser(){
        return this.owner;
    }
    get info(){
        return this.owner.info;
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
            img.src=this.info.cdn.toString()+"icons/"+this.properties.id+"/"+this.properties.icon+".png";
            divy.appendChild(img)
            img.onclick=()=>{
                console.log(this.loadGuild)
                this.loadGuild();
                this.loadChannel();
            }
            Guild.contextmenu.bind(img,this);
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
            Guild.contextmenu.bind(div,this)
        }
        return divy;
    }
    confirmDelete(){
        let confirmname="";
        const full= new Fullscreen([
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
        return fetch(this.info.api.toString()+"/guilds/"+this.id+"/delete",{
            method:"POST",
            headers:this.headers,
        })
    }
    unreads(html=undefined){
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
        fetch(this.info.api.toString()+"/v9/read-states/ack-bulk",{
            method:"POST",
            headers:this.headers,
            body:JSON.stringify(build)
        })
    }
    getRole(ID:string):Role{
        if(!this.roleids[ID]){console.error(`role id ${ID} does not exist`,this.roleids)}
        return this.roleids[ID];
    }
    hasRole(r:Role|string){
        console.log("this should run");
        if((typeof r)!==(typeof "")){
            r=(r as Role).id;
        }
        return this.member.hasRole(r as string);
    }
    loadChannel(ID:string=undefined){
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
        const thischannel=new Channel(JSON,this);
        this.channelids[JSON.id]=thischannel;
        this.channels.push(thischannel);
        thischannel.resolveparent(this);
        if(!thischannel.parrent){
            this.headchannels.push(thischannel);
        }
        this.calculateReorder();
        this.printServers();
    }
    createchannels(func=this.createChannel){
        let name="";
        let category=0;
        const channelselect=new Fullscreen(
        ["vdiv",
            ["radio","select channel type",
                ["voice","text","announcement"],
                function(e){
                    console.log(e)
                    category={"text":0,"voice":2,"announcement":5,"category":4}[e]
                },
                1
            ],
            ["textbox","Name of channel","",function(){
                console.log(this)
                name=this.value
            }],
            ["button","","submit",function(){
                console.log(name,category)
                func(name,category);
                channelselect.hide();
            }.bind(this)]
        ]);
        channelselect.show();
    }
    createcategory(){
        let name="";
        let category=4;
        const channelselect=new Fullscreen(
        ["vdiv",
            ["textbox","Name of category","",function(){
                console.log(this);
                name=this.value;
            }],
            ["button","","submit",function(){
                console.log(name,category)
                this.createChannel(name,category);
                channelselect.hide();
            }]
        ]);
        channelselect.show();
    }
    delChannel(JSON){
        const channel=this.channelids[JSON.id];
        delete this.channelids[JSON.id];

        this.channels.splice(this.channels.indexOf(channel),1);
        const indexy=this.headchannels.indexOf(channel);
        if(indexy!==-1){
            this.headchannels.splice(indexy,1);
        }

        /*
        const build=[];
        for(const thing of this.channels){
            console.log(thing.id);
            if(thing!==channel){
                build.push(thing)
            }else{
                console.log("fail");
                if(thing.parrent){
                    thing.parrent.delChannel(JSON);
                }
            }
        }
        this.channels=build;
        */
        this.printServers();
    }
    createChannel(name:string,type:number){
        fetch(this.info.api.toString()+"/guilds/"+this.id+"/channels",{
            method:"Post",
            headers:this.headers,
            body:JSON.stringify({name: name, type: type})
        })
    }
}
Guild.setupcontextmenu();
export { Guild };
