import { Contextmenu } from "./contextmenu.js";

class Search<E>{
    options:Map<string,E>;
    readonly keys:string[];
    constructor(options:[E,string[]][]){
        const map=options.flatMap(e=>{
            const val=e[1].map(f=>[f,e[0]]);
            return val as [string,E][];
        })
        this.options=new Map(map);
        this.keys=[...this.options.keys()];
    }
    generateList(str:string,max:number,res:(e:E)=>void){
        str=str.toLowerCase();
        const options=this.keys.filter(e=>{
            return e.toLowerCase().includes(str)
        });
        const div=document.createElement("div");
        div.classList.add("OptionList","flexttb");
        for(const option of options.slice(0, max)){
            const hoption=document.createElement("span");
            hoption.textContent=option;
            hoption.onclick=()=>{
                if(!this.options.has(option)) return;
                res(this.options.get(option) as E)
            }
            div.append(hoption);
        }
        return div;
    }
    async find(x:number,y:number,max=4):Promise<E|undefined>{
        return new Promise<E|undefined>((res)=>{

            const container=document.createElement("div");
            container.classList.add("fixedsearch");
            console.log((x^0)+"",(y^0)+"");
            container.style.left=(x^0)+"px";
            container.style.top=(y^0)+"px";
            const remove=container.remove;
            container.remove=()=>{
                remove.call(container);
                res(undefined);
            }

            function resolve(e:E){
                res(e);
                container.remove();
            }
            const bar=document.createElement("input");
            const options=document.createElement("div");
            const keydown=()=>{
                const html=this.generateList(bar.value,max,resolve);
                options.innerHTML="";
                options.append(html);
            }
            bar.oninput=keydown;
            keydown();
            bar.type="text";
            container.append(bar);
            container.append(options);
            document.body.append(container);
            if(Contextmenu.currentmenu != ""){
                Contextmenu.currentmenu.remove();
            }
            Contextmenu.currentmenu=container;
            Contextmenu.keepOnScreen(container);

        })
    }
}
export {Search};
