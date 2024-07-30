class SnowFlake {
    id;
    static SnowFlakes = new Map();
    static FinalizationRegistry = new FinalizationRegistry((a) => {
        SnowFlake.SnowFlakes.get(a[1]).delete(a[0]);
    });
    obj;
    constructor(id, obj) {
        if (!obj) {
            this.id = id;
            return;
        }
        if (!SnowFlake.SnowFlakes.get(obj.constructor)) {
            SnowFlake.SnowFlakes.set(obj.constructor, new Map());
        }
        if (SnowFlake.SnowFlakes.get(obj.constructor).get(id)) {
            const snowflake = SnowFlake.SnowFlakes.get(obj.constructor).get(id).deref();
            if (snowflake) {
                snowflake.obj = obj;
                return snowflake;
            }
            else {
                SnowFlake.SnowFlakes.get(obj.constructor).delete(id);
            }
        }
        this.id = id;
        SnowFlake.SnowFlakes.get(obj.constructor).set(id, new WeakRef(this));
        SnowFlake.FinalizationRegistry.register(this, [id, obj.constructor]);
        this.obj = obj;
    }
    static clear() {
        this.SnowFlakes = new Map();
    }
    /**
     *  Just to clarify bc TS, it returns a SnowFlake\<type> which is what you entered with the type parameter
     *
     **/
    static getSnowFlakeFromID(id, type) {
        if (!SnowFlake.SnowFlakes.get(type)) {
            SnowFlake.SnowFlakes.set(type, new Map());
        }
        const snowflake = SnowFlake.SnowFlakes.get(type).get(id);
        if (snowflake) {
            const obj = snowflake.deref();
            if (obj) {
                return obj;
            }
            else {
                SnowFlake.SnowFlakes.get(type).delete(id);
            }
        }
        {
            const snowflake = new SnowFlake(id, undefined);
            SnowFlake.SnowFlakes.get(type).set(id, new WeakRef(snowflake));
            SnowFlake.FinalizationRegistry.register(this, [id, type]);
            return snowflake;
        }
    }
    static hasSnowFlakeFromID(id, type) {
        if (!SnowFlake.SnowFlakes.get(type)) {
            return false;
        }
        const flake = SnowFlake.SnowFlakes.get(type).get(id);
        if (flake) {
            const flake2 = flake.deref()?.getObject();
            if (flake2) {
                return true;
            }
            else {
                return false;
            }
        }
        else {
            return false;
        }
    }
    getUnixTime() {
        try {
            return Number((BigInt(this.id) >> 22n) + 1420070400000n);
        }
        catch {
            console.error(`The ID is corrupted, it's ${this.id} when it should be some number.`);
            return 0;
        }
    }
    toString() {
        return this.id;
    }
    getObject() {
        return this.obj;
    }
}
export { SnowFlake };
