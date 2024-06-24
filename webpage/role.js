class role{
    constructor(JSON, owner){
        for(const thing of Object.keys(JSON)){
            this[thing]=JSON[thing];
        }
        this.permissions=new permissions(JSON.permissions);
        this.owner=owner;
    }
    get guild(){
        return this.owner;
    }
    get localuser(){
        return this.guild.localuser;
    }
    getColor(){
        if(this.color===0){return null};
        return `#${this.color.toString(16)}`;
    }

}
