class InfiniteScroller{
    readonly getIDFromOffset:(ID:string,offset:number)=>Promise<string|undefined>;
    readonly getHTMLFromID:(ID:string)=>Promise<HTMLElement>;
    readonly destroyFromID:(ID:string)=>Promise<boolean>;
    readonly reachesBottom:()=>void;
    private readonly minDist=3000;
    private readonly maxDist=8000;
    HTMLElements:[HTMLElement,string][]=[];
    div:HTMLDivElement|null;
    scroll:HTMLDivElement|null;
    constructor(getIDFromOffset:InfiniteScroller["getIDFromOffset"],getHTMLFromID:InfiniteScroller["getHTMLFromID"],destroyFromID:InfiniteScroller["destroyFromID"],reachesBottom:InfiniteScroller["reachesBottom"]=()=>{}){
        this.getIDFromOffset=getIDFromOffset;
        this.getHTMLFromID=getHTMLFromID;
        this.destroyFromID=destroyFromID;
        this.reachesBottom=reachesBottom;
    }
    timeout:NodeJS.Timeout|null;
    async getDiv(initialId:string,bottom=true):Promise<HTMLDivElement>{
        const div=document.createElement("div");
        div.classList.add("messagecontainer");
        //div.classList.add("flexttb")
        const scroll=document.createElement("div");
        scroll.classList.add("flexttb","scroller")
        div.appendChild(scroll);
        this.div=div;
        //this.interval=setInterval(this.updatestuff.bind(this,true),100);

        this.scroll=scroll;
        this.div.addEventListener("scroll",this.watchForChange.bind(this));
        this.scroll.addEventListener("scroll",this.watchForChange.bind(this));
        {
            let oldheight=0;
            new ResizeObserver(_=>{
                const change=oldheight-div.offsetHeight;
                if(change>0&&this.scroll){
                    this.scroll.scrollTop+=change;
                }
                oldheight=div.offsetHeight;
                this.watchForChange();
            }).observe(div);
        }
        new ResizeObserver(this.watchForChange.bind(this)).observe(scroll);

        await this.firstElement(initialId)
        this.updatestuff();
        await this.watchForChange().then(_=>{
            this.updatestuff();
        })
        return div;
    }
    scrollBottom:number;
    scrollTop:number;
    needsupdate=true;
    async updatestuff(){
        if(!this.scroll) return;
        this.timeout=null;
        this.scrollBottom = this.scroll.scrollHeight - this.scroll.scrollTop - this.scroll.clientHeight;
        this.scrollTop=this.scroll.scrollTop;
        if(!this.scrollBottom){
            if(!await this.watchForChange()){
                this.reachesBottom();
            }
        }
        if(!this.scrollTop){
            await this.watchForChange()
        }
        this.needsupdate=false;
        //this.watchForChange();
    }
    async firstElement(id:string){
        if(!this.scroll) return;
        const html=await this.getHTMLFromID(id);
        this.scroll.appendChild(html);
        this.HTMLElements.push([html,id]);
    }
    currrunning:boolean=false;
    async addedBottom(){
        this.updatestuff();
        const func=this.snapBottom();
        await this.watchForChange();
        func();
    }
    snapBottom(){
        const scrollBottom=this.scrollBottom;
        return ()=>{
            if(this.scroll&&scrollBottom<30){
                this.scroll.scrollTop=this.scroll.scrollHeight;
            }
        }
    }
    private async watchForTop():Promise<boolean>{
        if(!this.scroll) return false;
        let again=false;
        if(this.scrollTop===0){
            this.scrollTop=1;
            this.scroll.scrollTop=1;
        }
        if(this.scrollTop<this.minDist){
            let nextid:string|undefined;
            const firstelm=this.HTMLElements.at(0);
            if(firstelm){
                const previd=firstelm[1];
                nextid=await this.getIDFromOffset(previd,1);
            }


            if(!nextid){

            }else{
                again=true;
                const html=await this.getHTMLFromID(nextid);
                if(!html){
                    this.destroyFromID(nextid);
                    console.error("html isn't defined");
                    throw Error("html isn't defined");
                }
                this.scroll.prepend(html);
                this.HTMLElements.unshift([html,nextid]);
                this.scrollTop+=60;
            };
        }
        if(this.scrollTop>this.maxDist){


            const html=this.HTMLElements.shift();
            if(html){
                again=true;
                await this.destroyFromID(html[1]);
                this.scrollTop-=60;
            }
        }
        if(again){
            await this.watchForTop();
        }
        return again;
    }
    async watchForBottom():Promise<boolean>{
        if(!this.scroll) return false;
        let again=false;
        const scrollBottom = this.scrollBottom;
        if(scrollBottom<this.minDist){

            let nextid:string|undefined;
            const lastelm=this.HTMLElements.at(-1);
            if(lastelm){
                const previd=lastelm[1];
                nextid=await this.getIDFromOffset(previd,-1);
            }
            if(!nextid){
            }else{
                again=true;
                const html=await this.getHTMLFromID(nextid);
                this.scroll.appendChild(html);
                this.HTMLElements.push([html,nextid]);
                this.scrollBottom+=60;
                if(scrollBottom<30){
                    this.scroll.scrollTop=this.scroll.scrollHeight;
                }
            };
        }
        if(scrollBottom>this.maxDist){


            const html=this.HTMLElements.pop();
            if(html){
                await this.destroyFromID(html[1]);
                this.scrollBottom-=60;
                again=true;
            }
        }
        if(again){
            await this.watchForBottom();
        }
        return again;
    }
    async watchForChange():Promise<boolean>{

        try{
        if(this.currrunning){
            return false;
        }else{
            this.currrunning=true;
        }
        if(!this.div){this.currrunning=false;return false}
        const out=await Promise.allSettled([this.watchForTop(),this.watchForBottom()]) as {value:boolean}[];
        const changed=(out[0].value||out[1].value);
        if(null===this.timeout&&changed){
            this.timeout=setTimeout(this.updatestuff.bind(this),300);
        }
        if(!this.currrunning){console.error("something really bad happened")}
        this.currrunning=false;
        return !!changed;
        }catch(e){
            console.error(e);
        }
        return false;
    }
    async focus(id:string,flash=true){
        let element:HTMLElement|undefined;
        for(const thing of this.HTMLElements){
            if(thing[1]===id){
                element=thing[0];
            }
        }
        if(element){

            if(flash){
                element.scrollIntoView({
                    behavior:"smooth",
                    block:"center"
                });
                await new Promise(resolve => setTimeout(resolve, 1000));
                element.classList.remove("jumped");
                await new Promise(resolve => setTimeout(resolve, 100));
                element.classList.add("jumped");
            }else{
                element.scrollIntoView();
            }
        }else{
            for(const thing of this.HTMLElements){
                await this.destroyFromID(thing[1]);
            }
            this.HTMLElements=[];
            await this.firstElement(id);
            this.updatestuff();
            await this.watchForChange();
            await new Promise(resolve => setTimeout(resolve, 100));
            await this.focus(id,true);
        }
    }
    async delete():Promise<void>{
        for(const thing of this.HTMLElements){
            await this.destroyFromID(thing[1]);
        }
        this.HTMLElements=[];
        if(this.timeout){
            clearTimeout(this.timeout);
        }
        if(this.div){
            this.div.remove();
        }
        this.scroll=null;
        this.div=null;
    }
}
export {InfiniteScroller};
