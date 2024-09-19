abstract class SnowFlake{
	public readonly id: string;
	constructor(id: string){
		this.id = id;
	}
	getUnixTime(): number{
		return SnowFlake.stringToUnixTime(this.id);
	}
	static stringToUnixTime(str: string){
		try{
			return Number((BigInt(str) >> 22n) + 1420070400000n);
		}catch{
			console.error(
				`The ID is corrupted, it's ${str} when it should be some number.`
			);
			return 0;
		}
	}
}
export{ SnowFlake };
