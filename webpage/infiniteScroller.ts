class InfiniteScroller{
    readonly getIDFromOffset:(ID:string,offset:number)=>Promise<string>;
    readonly getHTMLFromID:(ID:string)=>HTMLElement;
    readonly destroyFromID:(ID:string)=>Promise<boolean>;
    readonly reachesBottom:()=>void;
    private readonly minDist=3000;
    private readonly maxDist=8000;
    HTMLElements:[HTMLElement,string][]=[];
    div:HTMLDivElement;
    scroll:HTMLDivElement;
    constructor(getIDFromOffset:InfiniteScroller["getIDFromOffset"],getHTMLFromID:InfiniteScroller["getHTMLFromID"],destroyFromID:InfiniteScroller["destroyFromID"],reachesBottom:InfiniteScroller["reachesBottom"]=()=>{}){
        this.getIDFromOffset=getIDFromOffset;
        this.getHTMLFromID=getHTMLFromID;
        this.destroyFromID=destroyFromID;
        this.reachesBottom=reachesBottom;
    }
    interval:NodeJS.Timeout;
    getDiv(initialId:string,bottom=true):HTMLDivElement{
        const div=document.createElement("div");
        div.classList.add("messagecontainer");
        //div.classList.add("flexttb")
        const scroll=document.createElement("div");
        scroll.classList.add("flexttb","scroller")
        div.append(scroll);
        this.div=div;
        this.interval=setInterval(this.updatestuff.bind(this),100);

        this.scroll=scroll;
        this.scroll.addEventListener("scroll",this.watchForChange.bind(this));
        new ResizeObserver(this.watchForChange.bind(this)).observe(div);
        new ResizeObserver(this.watchForChange.bind(this)).observe(scroll);

        this.firstElement(initialId);
        this.updatestuff();
        this.watchForChange().then(_=>{
            this.scroll.scrollTop=this.scroll.scrollHeight;
        })
        return div;
    }
    scrollBottom:number;
    scrollTop:number;
    updatestuff(){
        this.scrollBottom = this.scroll.scrollHeight - this.scroll.scrollTop - this.scroll.clientHeight;
        this.scrollTop=this.scroll.scrollTop;
        if(this.scrollBottom){
            this.reachesBottom();
        }
        //this.watchForChange();
    }
    firstElement(id:string){
        const html=this.getHTMLFromID(id);
        this.scroll.append(html);
        this.HTMLElements.push([html,id]);
    }
    currrunning:boolean=false;
    async addedBottom(){
        this.updatestuff();
        const scrollBottom=this.scrollBottom;
        await this.watchForChange();
        if(scrollBottom<30){
            this.scroll.scrollTop=this.scroll.scrollHeight;
        }
    }
    async watchForChange():Promise<void>{
        if(this.currrunning){
            return;
        }else{
            this.currrunning=true;
        }
        let again=false;
        if(!this.div){this.currrunning=false;return}
        /*
        if(this.scrollTop===0){
            this.scrollTop=10;
        }
        */
        if(this.scrollTop===0){
            this.scrollTop=1;
            this.scroll.scrollTop=1;
        }
        if(this.scrollTop<this.minDist){


            const previd=this.HTMLElements.at(0)[1];
            const nextid=await this.getIDFromOffset(previd,1);
            if(!nextid){

            }else{
                again=true;
                const html=this.getHTMLFromID(nextid);
                this.scroll.prepend(html);
                this.HTMLElements.unshift([html,nextid]);
                this.scrollTop+=60;
            };
        }
        if(this.scrollTop>this.maxDist){

            again=true;
            const html=this.HTMLElements.shift();
            await this.destroyFromID(html[1]);
            this.scrollTop-=60;
        }
        const scrollBottom = this.scrollBottom;
        if(scrollBottom<this.minDist){


            const previd=this.HTMLElements.at(-1)[1];
            const nextid=await this.getIDFromOffset(previd,-1);
            if(!nextid){
            }else{
                again=true;
                const html=this.getHTMLFromID(nextid);
                this.scroll.append(html);
                this.HTMLElements.push([html,nextid]);
                this.scrollBottom+=60;
                if(scrollBottom<30){
                    this.scroll.scrollTop=this.scroll.scrollHeight;
                }
            };
        }
        if(scrollBottom>this.maxDist){

            again=true;
            const html=this.HTMLElements.pop();
            await this.destroyFromID(html[1]);
            this.scrollBottom-=60;
        }

        this.currrunning=false;
        if(again){
            await this.watchForChange();
        }
        this.currrunning=false;
    }
    async delete():Promise<void>{
        for(const thing of this.HTMLElements){
            await this.destroyFromID(thing[1]);
        }
        this.HTMLElements=[];
        clearInterval(this.interval);
        if(this.div){
            this.div.remove();
        }
        this.scroll=null;
        this.div=null;
    }
}
export {InfiniteScroller};
