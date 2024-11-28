class ImagesDisplay{
	images:string[];
	index=0;
	constructor(srcs:string[],index=0){
		this.images=srcs;
		this.index=index;
	}
	weakbg=new WeakRef<HTMLElement>(document.createElement("div"));
	get background():HTMLElement|undefined{
		return this.weakbg.deref();
	}
	set background(e:HTMLElement){
		this.weakbg=new WeakRef(e);
	}
	makeHTML():HTMLElement{
		//TODO this should be able to display more than one image at a time lol
		const image= document.createElement("img");
		image.src=this.images[this.index];
		image.classList.add("imgfit","centeritem");
		return image;
	}
	show(){
		this.background = document.createElement("div");
		this.background.classList.add("background");
		this.background.appendChild(this.makeHTML());
		this.background.onclick = _=>{
			this.hide();
		};
		document.body.append(this.background);
	}
	hide(){
		if(this.background){
			this.background.remove();
		}
	}
}
export{ImagesDisplay}
