class SnowFlake {
    id;
    constructor(id) {
        this.id = id;
    }
    getUnixTime() {
        return SnowFlake.stringToUnixTime(this.id);
    }
    static stringToUnixTime(str) {
        try {
            return Number((BigInt(str) >> 22n) + 1420070400000n);
        }
        catch {
            console.error(`The ID is corrupted, it's ${str} when it should be some number.`);
            return 0;
        }
    }
}
export { SnowFlake };
