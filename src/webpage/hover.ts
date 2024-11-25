import { Contextmenu } from "./contextmenu.js";
import { MarkDown } from "./markdown.js";

class Hover{
    str:string|MarkDown
    constructor(txt:string|MarkDown){
        this.str=txt;
    }
    addEvent(elm:HTMLElement){
        let timeOut=setTimeout(()=>{},0);
        let elm2=document.createElement("div");
        elm.addEventListener("mouseover",()=>{
            timeOut=setTimeout(()=>{
                elm2=this.makeHover(elm);
            },750)
        });
        elm.addEventListener("mouseout",()=>{
            clearTimeout(timeOut);
            elm2.remove();
        })
    }
    makeHover(elm:HTMLElement){
        const div=document.createElement("div");
        if(this.str instanceof MarkDown){
            div.append(this.str.makeHTML({stdsize:true}))
        }else{
            div.append(this.str);
        }
        const box=elm.getBoundingClientRect();
        div.style.top=(box.bottom+4)+"px";
        div.style.left=Math.floor(box.left+box.width/2)+"px";
        div.classList.add("hoverthing");
        div.style.opacity="0";
        setTimeout(()=>{
            div.style.opacity="1";
        },10)
        document.body.append(div);
        Contextmenu.keepOnScreen(div);
        console.log(div,elm);
        return div;
    }
}
export{Hover}
