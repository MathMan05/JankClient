class embed{
    constructor(json, owner){

        this.type=this.getType(json);
        this.owner=owner;
        this.json=json;
    }
    getType(json){
        return json.type||"form";
    }
    generateHTML(){
        switch(this.type){
            case "form":
                return this.generateForm();
            case "image":
                return this.generateImage();
            case "link":
                return this.generateLink();
            case "article":
                return this.generateArticle();
            default:
                console.warn(`unsupported embed type ${this.type}, please add support dev :3`,this.json);
                return document.createElement("div");//prevent errors by giving blank div
        }
    }
    generateForm(){
        const div=document.createElement("div");
        div.style.backgroundColor="#"+this.json.color.toString(16);
        div.classList.add("embed-color");

        const embed=document.createElement("div");
        embed.classList.add("embed");
        div.append(embed);
        const title=document.createElement("h3");
        title.innerText=this.json.title;
        embed.append(title);
        embed.append(document.createElement("br"));
        for(const thing of this.json.fields){
            const b=document.createElement("b");
            b.innerText=thing.name;
            embed.append(b);
            embed.append(document.createElement("br"));
            const p=document.createElement("p")
            p.innerText=thing.value;
            p.classList.add("embedp")
            embed.append(p);
        }
        const footer=document.createElement("div");
        if(this.json.footer.icon_url){
            const img=document.createElement("img");
            img.src=this.json.footer.icon_url;
            img.classList.add("embedicon");
            footer.append(img);
        }
        if(this.json.footer.text){
            footer.append(this.json.footer.text);
        }
        embed.append(footer);
        return div;
    }
    generateImage(){
        const img=document.createElement("img");
        img.classList.add("messageimg")
        img.onclick=function(){
            const full=new fullscreen(["img",img.src,["fit"]]);
            full.show();
        }
        img.src=this.json.thumbnail.proxy_url;
        return img;
    }
    generateLink(){
        const table=document.createElement("table");
        table.classList.add("embed","linkembed");
        const trtop=document.createElement("tr");
        table.append(trtop);
        {
            const td=document.createElement("td");
            const a=document.createElement("a");
            a.href=this.json.url;
            a.innerText=this.json.title;
            td.append(a);
            trtop.append(td);
        }
        {
            const td=document.createElement("td");
            const img=document.createElement("img");
            img.classList.add("embedimg");
            img.onclick=function(){
                const full=new fullscreen(["img",img.src,["fit"]]);
                full.show();
            }
            img.src=this.json.thumbnail.proxy_url;
            td.append(img);
            trtop.append(td);
        }
        const bottomtr=document.createElement("tr");
        const td=document.createElement("td");
        const span=document.createElement("span");
        span.innerText=this.json.description;
        td.append(span);
        bottomtr.append(td);
        table.append(bottomtr)
        return table;
    }
    generateArticle(){
        const colordiv=document.createElement("div");
        colordiv.style.backgroundColor="#000000";
        colordiv.classList.add("embed-color");

        console.log(this.json,":3")
        const div=document.createElement("div");
        div.classList.add("embed");
        const providor=document.createElement("p");
        providor.classList.add("provider");
        providor.innerText=this.json.provider.name;
        div.append(providor);
        const a=document.createElement("a");
        a.href=this.json.url;
        a.innerText=this.json.title;
        div.append(a);

        const description=document.createElement("p");
        description.innerText=this.json.description;
        div.append(description);

        {
            const img=document.createElement("img");
            img.classList.add("bigembedimg");
            img.onclick=function(){
                const full=new fullscreen(["img",img.src,["fit"]]);
                full.show();
            }
            img.src=this.json.thumbnail.proxy_url;
            div.append(img);
        }
        colordiv.append(div);
        return colordiv;
    }
}
