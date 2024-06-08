const usercache={};
class user{
    static userids={};
    static checkuser(userjson){
        if(user.userids[userjson.id]){
            return user.userids[userjson.id];
        }else{
            const tempuser=new user(userjson,true)
            user.userids[userjson.id]=tempuser;
            return tempuser;
        }
    }
    constructor(userjson,dontclone=false){
        if(dontclone){
            console.log("new user")
            for(const thing of Object.keys(userjson)){
                this[thing]=userjson[thing];
            }
            this.hypotheticalpfp=false;
        }else{
            return user.checkuser(userjson);
        }
    }
    async resolvemember(guild){
        let str;
        if(usercache[this.id+"+"+guild.id]){
            return usercache[this.id+"+"+guild.id];
        }else{
            const tempy=new Promise((resolve, reject) => {
                usercache[this.id+"+"+guild.id]={done:false};
                fetch(info.api.toString()+"/v9/users/"+this.id+"/profile?with_mutual_guilds=true&with_mutual_friends_count=false&guild_id="+guild.id).then(json).then(str=>{
                    return new member(str);
                });
            });
            usercache[this.id+"+"+guild.id]=tempy;
        }
    }
    buildpfp(){
        const pfp=document.createElement('img');
        pfp.src=this.getpfpsrc(this.id,this.avatar);
        pfp.classList.add("pfp");
        pfp.classList.add("userid:"+this.id);
        return pfp;
    }
    userupdate(json){
        if(json.avatar!==this.avatar){
            console.log
            this.changepfp(json.avatar);
        }
    }
    changepfp(update){
        this.avatar=update;
        this.hypotheticalpfp=false;
        const src=this.getpfpsrc();
        console.log(src)
        for(thing of document.getElementsByClassName("userid:"+this.id)){
            thing.src=src;
        }
    }
    getpfpsrc(){
        if(this.hypotheticalpfp){
            return this.avatar;
        }
        if(this.avatar!=null){
            return info.cdn.toString()+"avatars/"+this.id+"/"+this.avatar+".png";
        }else{
            return info.cdn.toString()+"embed/avatars/3.png";
        }
    }
    createjankpromises(){
        new Promise(_=>{})
    }
}
