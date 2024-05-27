class dirrect extends guild{
    constructor(JSON,owner){
        super(-1);
        console.log(JSON);
        this.owner=owner;
        this.owner??=thisuser;
        this.channels=[];
        this.channelids={};
        this.id="@me";
        this.properties={};
        this.roles=[];
        this.roleids={};
        this.prevchannel=undefined;
        this.properties.name="Dirrect Messages";
        for(const thing of JSON){
            const temp=new group(thing,this);
            this.channels.push(temp);
            this.channelids[temp.id]=temp;
        }
        this.headchannels=this.channels;
    }
    createChannelpac(JSON){
        const thischannel=new group(JSON,owner);
        this.channelids[JSON.id]=thischannel;
        this.channels.push(thischannel);
        this.calculateReorder();
        this.printServers();
    }
    giveMember(member){
        console.error("not a real guild, can't give member object")
    }
    getRole(ID){
        return null;
    }
    hasRole(r){
        return false;
    }
    isAdmin(){
        return false;
    }
}
class group extends channel{
    constructor(JSON,owner){
        super(-1);
        this.owner=owner;
        this.messages=[];
        console.log(JSON.recipients,JSON)
        this.name=JSON.recipients[0]?.username;
        if(JSON.recipients[0]){
            this.user=new user(JSON.recipients[0]);
        }else{
            this.user=this.owner.owner.user;
        }
        this.name??=owner.owner.user.username;
        this.id=JSON.id;
        this.parent_id=null;
        this.parrent=null;
        this.children=[];
        this.guild_id="@me";
        this.messageids={};
        this.permission_overwrites=[];
    }
    createguildHTML(){
        const div=document.createElement("div")
        div.classList.add("channeleffects");
        const myhtml=document.createElement("span");
        myhtml.innerText=this.name;
        div.appendChild(this.user.buildpfp());
        div.appendChild(myhtml);
        div.myinfo=this;
        div.onclick=function(){
            this.myinfo.getHTML();
        }
        return div;
    }
    getHTML(){
        this.owner.prevchannel=this;
        this.owner.owner.channelfocus=this.id;
        this.putmessages();
        history.pushState(null, null,"/channels/"+this.guild_id+"/"+this.id);
        document.getElementById("channelname").innerText="@"+this.name;
    }
}
