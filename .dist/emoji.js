class Emoji {
    static emojis;
    static decodeEmojiList(buffer) {
        const view = new DataView(buffer, 0);
        let i = 0;
        function read16() {
            const int = view.getUint16(i);
            i += 2;
            return int;
        }
        function read8() {
            const int = view.getUint8(i);
            i += 1;
            return int;
        }
        function readString8() {
            return readStringNo(read8());
        }
        function readString16() {
            return readStringNo(read16());
        }
        function readStringNo(length) {
            const array = new Uint8Array(length);
            for (let i = 0; i < length; i++) {
                array[i] = read8();
            }
            const decoded = new TextDecoder("utf-8").decode(array.buffer);
            ;
            //console.log(array);
            return decoded;
        }
        const build = [];
        let cats = read16();
        for (; cats !== 0; cats--) {
            const name = readString16();
            const emojis = [];
            let emojinumber = read16();
            for (; emojinumber !== 0; emojinumber--) {
                //console.log(emojis);
                const name = readString8();
                const len = read8();
                const skin_tone_support = len > 127;
                const emoji = readStringNo(len - (+skin_tone_support * 128));
                emojis.push({
                    name,
                    skin_tone_support,
                    emoji
                });
            }
            build.push({
                name,
                emojis
            });
        }
        this.emojis = build;
        console.log(build);
    }
    static grabEmoji() {
        fetch("/emoji.bin").then(e => {
            return e.arrayBuffer();
        }).then(e => {
            Emoji.decodeEmojiList(e);
        });
    }
}
Emoji.grabEmoji();
export { Emoji };
