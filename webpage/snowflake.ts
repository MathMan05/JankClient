class SnowFlake<x>{
    public readonly id:string;
    private static readonly SnowFlakes:Map<any,Map<string,WeakRef<SnowFlake<any>>>>=new Map();
    private static readonly FinalizationRegistry=new FinalizationRegistry((a:[string,any])=>{
        SnowFlake.SnowFlakes.get(a[1]).delete(a[0]);
    });
    private obj:x;
    constructor(id:string,obj:x){
        if(!obj){
           this.id=id;
           return;
        }
        if(!SnowFlake.SnowFlakes.get(obj.constructor)){
           SnowFlake.SnowFlakes.set(obj.constructor,new Map());
        }
        if(SnowFlake.SnowFlakes.get(obj.constructor).get(id)){
            const snowflake=SnowFlake.SnowFlakes.get(obj.constructor).get(id).deref();
            snowflake.obj=obj;
            return snowflake;
        }
        this.id=id;
        SnowFlake.SnowFlakes.get(obj.constructor).set(id,new WeakRef(this));
        SnowFlake.FinalizationRegistry.register(this,[id,obj.constructor]);
        this.obj=obj;
    }
    static getSnowFlakeFromID(id:string,type:any):SnowFlake<any>{
        if(!SnowFlake.SnowFlakes.get(type)){
            SnowFlake.SnowFlakes.set(type,new Map());
        }
        const snowflake=SnowFlake.SnowFlakes.get(type).get(id);
        if(snowflake){
            return snowflake.deref();
        }
        {
            const snowflake=new SnowFlake(id,undefined);

            SnowFlake.SnowFlakes.get(type).set(id,new WeakRef(snowflake));
            SnowFlake.FinalizationRegistry.register(this,[id,type]);

            return snowflake;
        }
    }
    getUnixTime():number{
        return Number((BigInt(this.id)>>22n)+1420070400000n);
    }
    toString(){
        return this.id;
    }
    getObject():x{
        return this.obj;
    }
}
export {SnowFlake};
