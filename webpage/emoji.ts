import { Contextmenu } from "./contextmenu.js";

class Emoji{
    static emojis:{
        name:string,
        emojis:{
            name:string,
            emoji:string,
        }[]
    }[];
    static decodeEmojiList(buffer:ArrayBuffer){
        const view = new DataView(buffer, 0);
        let i=0;
        function read16(){
            const int=view.getUint16(i);
            i+=2;
            return int;
        }
        function read8(){
            const int=view.getUint8(i);
            i+=1;
            return int;
        }
        function readString8(){
            return readStringNo(read8());
        }
        function readString16(){
            return readStringNo(read16());
        }
        function readStringNo(length:number){
            const array=new Uint8Array(length);

            for(let i=0;i<length;i++){
                array[i]=read8();
            }
            const decoded=new TextDecoder("utf-8").decode(array.buffer);;

            //console.log(array);
            return decoded;
        }
        const build:{name:string,emojis:{name:string,emoji:string}[]}[]=[];
        let cats=read16();

        for(;cats!==0;cats--){
            const name=readString16();
            const emojis=[];
            let emojinumber=read16();
            for(;emojinumber!==0;emojinumber--){
                //console.log(emojis);
                const name=readString8();
                const len=read8();
                const skin_tone_support=len>127;
                const emoji=readStringNo(len-(+skin_tone_support*128));
                emojis.push({
                    name,
                    skin_tone_support,
                    emoji
                })
            }
            build.push({
                name,
                emojis
            })
        }
        this.emojis=build;
        console.log(build);
    }
    static grabEmoji(){
        fetch("/emoji.bin").then(e=>{
            return e.arrayBuffer()
        }).then(e=>{
            Emoji.decodeEmojiList(e);
        })
    }
    static async emojiPicker(x:number,y:number):Promise<Emoji|string>{
        let res:(r:Emoji|string)=>void;
        const promise=new Promise((r)=>{res=r;})
        const menu=document.createElement("div");
        menu.classList.add("flextttb", "emojiPicker")
        menu.style.top=y+"px";
        menu.style.left=x+"px";


        setTimeout(()=>{
            if(Contextmenu.currentmenu!=""){
                Contextmenu.currentmenu.remove();
            }
            document.body.append(menu);
            Contextmenu.currentmenu=menu;
            Contextmenu.keepOnScreen(menu);
        },10)

        const title=document.createElement("h2");
        title.textContent=Emoji.emojis[0].name;
        title.classList.add("emojiTitle");
        menu.append(title);
        console.log("menu :3");
        const selection=document.createElement("div");
        selection.classList.add("flexltr");
        console.log("menu :3");
        const body=document.createElement("div");
        body.classList.add("emojiBody");
        let i=0;
        for(const thing of Emoji.emojis){
            const select=document.createElement("div");
            select.textContent=thing.emojis[0].emoji;
            select.classList.add("emojiSelect");
            selection.append(select);
            const clickEvent=()=>{
                title.textContent=thing.name;
                body.innerHTML="";
                for(const emojit of thing.emojis){
                    const emoji=document.createElement("div");
                    emoji.classList.add("emojiSelect");
                    emoji.textContent=emojit.emoji;
                    body.append(emoji);
                    emoji.onclick=_=>{
                        res(emojit.emoji);
                        Contextmenu.currentmenu.remove();
                    }
                }
            };
            select.onclick=clickEvent
            if(i===0){
               clickEvent();
            }
            i++;
        }
        menu.append(selection);
        menu.append(body);
        console.log("menu :3");
        return promise;
    }
}
Emoji.grabEmoji();
export {Emoji};
