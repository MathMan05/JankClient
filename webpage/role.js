class role{
    constructor(JSON, owner){
        for(const thing of Object.keys(JSON)){
            this[thing]=JSON[thing];
        }
    }
}
