class BinRead {
	private i = 0;
	private view: DataView;
	constructor(buffer: ArrayBuffer) {
		this.view = new DataView(buffer, 0);
	}
	read16() {
		const int = this.view.getUint16(this.i);
		this.i += 2;
		return int;
	}
	read8() {
		const int = this.view.getUint8(this.i);
		this.i += 1;
		return int;
	}
	readString8() {
		return this.readStringNo(this.read8());
	}
	readString16() {
		return this.readStringNo(this.read16());
	}
	readFloat32() {
		const float = this.view.getFloat32(this.i);
		this.i += 4;
		return float;
	}
	readStringNo(length: number) {
		const array = new Uint8Array(length);
		for (let i = 0; i < length; i++) {
			array[i] = this.read8();
		}
		//console.log(array);
		return new TextDecoder("utf8").decode(array.buffer as ArrayBuffer);
	}
}

class BinWrite {
	private view: DataView;
	private buffer: ArrayBuffer;
	private i = 0;
	constructor(maxSize: number = 2 ** 26) {
		this.buffer = new ArrayBuffer(maxSize);
		this.view = new DataView(this.buffer, 0);
	}
	write32Float(numb: number) {
		this.view.setFloat32(this.i, numb);
		this.i += 4;
	}
	write16(numb: number) {
		this.view.setUint16(this.i, numb);
		this.i += 2;
	}
	write8(numb: number) {
		this.view.setUint8(this.i, numb);
		this.i += 1;
	}
	writeString8(str: string) {
		const encode = new TextEncoder().encode(str);
		this.write8(encode.length);
		for (const thing of encode) {
			this.write8(thing);
		}
	}
	writeString16(str: string) {
		const encode = new TextEncoder().encode(str);
		this.write16(encode.length);
		for (const thing of encode) {
			this.write8(thing);
		}
	}
	writeStringNo(str: string) {
		const encode = new TextEncoder().encode(str);
		for (const thing of encode) {
			this.write8(thing);
		}
	}
	getBuffer() {
		const buf = new ArrayBuffer(this.i);
		const ar1 = new Uint8Array(buf);
		const ar2 = new Uint8Array(this.buffer);
		for (const i in ar1) {
			ar1[+i] = ar2[+i];
		}
		return buf;
	}
}
export { BinRead, BinWrite };
