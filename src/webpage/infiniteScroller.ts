class InfiniteScroller{
	readonly getIDFromOffset: (
ID: string,
offset: number
) => Promise<string | undefined>;
	readonly getHTMLFromID: (ID: string) => Promise<HTMLElement>;
	readonly destroyFromID: (ID: string) => Promise<boolean>;
	readonly reachesBottom: () => void;
	private readonly minDist = 2000;
	private readonly fillDist = 3000;
	private readonly maxDist = 6000;
	HTMLElements: [HTMLElement, string][] = [];
	div: HTMLDivElement | null = null;
	timeout: ReturnType<typeof setTimeout> | null = null;
	beenloaded = false;
	scrollBottom = 0;
	scrollTop = 0;
	needsupdate = true;
	averageheight = 60;
	watchtime = false;
	changePromise: Promise<boolean> | undefined;
	scollDiv!: { scrollTop: number; scrollHeight: number; clientHeight: number };

	resetVars(){
		this.scrollTop=0;
		this.scrollBottom=0;
		this.averageheight=60;
		this.watchtime=false;
		this.needsupdate=true;
		this.beenloaded=false;
		this.changePromise=undefined;
		if(this.timeout){
			clearTimeout(this.timeout);
			this.timeout=null;
		}
		for(const thing of this.HTMLElements){
			this.destroyFromID(thing[1]);
		}
		this.HTMLElements=[];
		this.div=null;
	}
	constructor(
		getIDFromOffset: InfiniteScroller["getIDFromOffset"],
		getHTMLFromID: InfiniteScroller["getHTMLFromID"],
		destroyFromID: InfiniteScroller["destroyFromID"],
		reachesBottom: InfiniteScroller["reachesBottom"] = ()=>{}
	){
		this.getIDFromOffset = getIDFromOffset;
		this.getHTMLFromID = getHTMLFromID;
		this.destroyFromID = destroyFromID;
		this.reachesBottom = reachesBottom;
	}

	async getDiv(initialId: string): Promise<HTMLDivElement>{
		if(this.div){
			throw new Error("Div already exists, exiting.");
		}
		this.resetVars();
		const scroll = document.createElement("div");
		scroll.classList.add("scroller");
		this.div = scroll;

		this.div.addEventListener("scroll", ()=>{
			this.checkscroll();
			if(this.scrollBottom < 5){
				this.scrollBottom = 5;
			}
			if(this.timeout === null){
				this.timeout = setTimeout(this.updatestuff.bind(this), 300);
			}
			this.watchForChange();
		});

		let oldheight = 0;
		new ResizeObserver(()=>{
			this.checkscroll();
			const func = this.snapBottom();
			this.updatestuff();
			const change = oldheight - scroll.offsetHeight;
			if(change > 0 && this.div){
				this.div.scrollTop += change;
			}
			oldheight = scroll.offsetHeight;
			this.watchForChange();
			func();
		}).observe(scroll);

		new ResizeObserver(this.watchForChange.bind(this)).observe(scroll);

		await this.firstElement(initialId);
		this.updatestuff();
		await this.watchForChange().then(()=>{
			this.updatestuff();
			this.beenloaded = true;
		});

		return scroll;
	}

	checkscroll(): void{
		if(this.beenloaded && this.div && !document.body.contains(this.div)){
			console.warn("not in document");
			this.div = null;
		}
	}

	async updatestuff(): Promise<void>{
		this.timeout = null;
		if(!this.div)return;

		this.scrollBottom =
						this.div.scrollHeight - this.div.scrollTop - this.div.clientHeight;
		this.averageheight = this.div.scrollHeight / this.HTMLElements.length;
		if(this.averageheight < 10){
			this.averageheight = 60;
		}
		this.scrollTop = this.div.scrollTop;

		if(!this.scrollBottom && !(await this.watchForChange())){
			this.reachesBottom();
		}
		if(!this.scrollTop){
			await this.watchForChange();
		}
		this.needsupdate = false;
	}

	async firstElement(id: string): Promise<void>{
		if(!this.div)return;
		const html = await this.getHTMLFromID(id);
		this.div.appendChild(html);
		this.HTMLElements.push([html, id]);
	}

	async addedBottom(): Promise<void>{
		await this.updatestuff();
		const func = this.snapBottom();
		await this.watchForChange();
		func();
	}

	snapBottom(): () => void{
		const scrollBottom = this.scrollBottom;
		return()=>{
			if(this.div && scrollBottom < 4){
				this.div.scrollTop = this.div.scrollHeight;
			}
		};
	}

	private async watchForTop(
		already = false,
		fragment = new DocumentFragment()
	): Promise<boolean>{
		if(!this.div)return false;
		try{
			let again = false;
			if(this.scrollTop < (already ? this.fillDist : this.minDist)){
				let nextid: string | undefined;
				const firstelm = this.HTMLElements.at(0);
				if(firstelm){
					const previd = firstelm[1];
					nextid = await this.getIDFromOffset(previd, 1);
				}

				if(nextid){
					const html = await this.getHTMLFromID(nextid);

					if(!html){
						this.destroyFromID(nextid);
						return false;
					}
					again = true;
					fragment.prepend(html);
					this.HTMLElements.unshift([html, nextid]);
					this.scrollTop += this.averageheight;

				}
			}
			if(this.scrollTop > this.maxDist){
				const html = this.HTMLElements.shift();
				if(html){
					again = true;
					await this.destroyFromID(html[1]);

					this.scrollTop -= this.averageheight;

				}
			}
			if(again){
				await this.watchForTop(true, fragment);
			}
			return again;
		}finally{
			if(!already){
				if(this.div.scrollTop === 0){
					this.scrollTop = 1;
					this.div.scrollTop = 10;
				}
				this.div.prepend(fragment, fragment);
			}
		}
	}

	async watchForBottom(
		already = false,
		fragment = new DocumentFragment()
	): Promise<boolean>{
		let func: Function | undefined;
		if(!already) func = this.snapBottom();
		if(!this.div)return false;
		try{
			let again = false;
			const scrollBottom = this.scrollBottom;
			if(scrollBottom < (already ? this.fillDist : this.minDist)){
				let nextid: string | undefined;
				const lastelm = this.HTMLElements.at(-1);
				if(lastelm){
					const previd = lastelm[1];
					nextid = await this.getIDFromOffset(previd, -1);
				}
				if(nextid){
					again = true;
					const html = await this.getHTMLFromID(nextid);
					fragment.appendChild(html);
					this.HTMLElements.push([html, nextid]);
					this.scrollBottom += this.averageheight;
				}
			}
			if(scrollBottom > this.maxDist){
				const html = this.HTMLElements.pop();
				if(html){
					await this.destroyFromID(html[1]);
					this.scrollBottom -= this.averageheight;
					again = true;
				}
			}
			if(again){
				await this.watchForBottom(true, fragment);
			}
			return again;
		}finally{
			if(!already){
				this.div.append(fragment);
				if(func){
					func();
				}
			}
		}
	}

	async watchForChange(): Promise<boolean>{
		if(this.changePromise){
			this.watchtime = true;
			return await this.changePromise;
		}else{
			this.watchtime = false;
		}

		this.changePromise = new Promise<boolean>(async res=>{
			try{
				if(!this.div){
					res(false);
				}
				const out = (await Promise.allSettled([
					this.watchForTop(),
					this.watchForBottom(),
				])) as { value: boolean }[];
				const changed = out[0].value || out[1].value;
				if(this.timeout === null && changed){
					this.timeout = setTimeout(this.updatestuff.bind(this), 300);
				}
				res(Boolean(changed));
			}catch(e){
				console.error(e);
				res(false);
			}finally{
				setTimeout(()=>{
					this.changePromise = undefined;
					if(this.watchtime){
						this.watchForChange();
					}
				}, 300);
			}
		});

		return await this.changePromise;
	}
	async focus(id: string, flash = true): Promise<void>{
		let element: HTMLElement | undefined;
		for(const thing of this.HTMLElements){
			if(thing[1] === id){
				element = thing[0];
			}
		}
		if(element){
			if(flash){
				element.scrollIntoView({
					behavior: "smooth",
					block: "center",
				});
				await new Promise(resolve=>{
					setTimeout(resolve, 1000);
				});
				element.classList.remove("jumped");
				await new Promise(resolve=>{
					setTimeout(resolve, 100);
				});
				element.classList.add("jumped");
			}else{
				element.scrollIntoView();
			}
		}else{
			this.resetVars();
			//TODO may be a redundant loop, not 100% sure :P
			for(const thing of this.HTMLElements){
				await this.destroyFromID(thing[1]);
			}
			this.HTMLElements = [];
			await this.firstElement(id);
			this.updatestuff();
			await this.watchForChange();
			await new Promise(resolve=>{
				setTimeout(resolve, 100);
			});
			await this.focus(id, true);
		}
	}

	async delete(): Promise<void>{
		if(this.div){
			this.div.remove();
			this.div = null;
		}
		this.resetVars();
		try{
			for(const thing of this.HTMLElements){
				await this.destroyFromID(thing[1]);
			}
		}catch(e){
			console.error(e);
		}
		this.HTMLElements = [];
		if(this.timeout){
			clearTimeout(this.timeout);
		}
	}
}

export{ InfiniteScroller };
