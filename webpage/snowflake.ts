class SnowFlake{
	public readonly id:string;
	constructor(id:string){
		this.id=id;
	}
	getUnixTime():number{
		try{
			return Number((BigInt(this.id)>>22n)+1420070400000n);
		}catch{
			console.error(`The ID is corrupted, it's ${this.id} when it should be some number.`);
			return 0;
		}
	}
	toString(){
		return this.id;
	}
}
export{SnowFlake};
