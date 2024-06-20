class contextmenu{
    constructor(name){
        this.name=name;
        this.buttons=[]

    }
    addbutton(text,onclick,img=null,shown=_=>true,enabled=_=>true){
        this.buttons.push([text,onclick,img,shown,enabled])
        return {};
    }
    makemenu(x,y,addinfo,obj){
        const div=document.createElement("table");
        div.classList.add("contextmenu");
        for(const thing of this.buttons){
            if(!thing[3](addinfo)){continue;}
            const textb=document.createElement("tr");
            const intext=document.createElement("button")
            intext.disabled=!thing[4]();
            textb.button=intext;
            intext.classList.add("contextbutton")
            intext.textContent=thing[0]
            textb.appendChild(intext)
            console.log(thing)
            intext.onclick=thing[1].bind(addinfo,obj);
            div.appendChild(textb);
        }
        if(currentmenu!=""){
            currentmenu.remove();
        }
        div.style.top = y+'px';
        div.style.left = x+'px';
        document.body.appendChild(div);
        console.log(div)
        currentmenu=div;
        return this.div;
    }
    bind(obj,addinfo){
        obj.addEventListener("contextmenu", (event) => {
            event.preventDefault();
            event.stopImmediatePropagation();
            this.makemenu(event.clientX,event.clientY,addinfo,obj)
        });
    }
}
