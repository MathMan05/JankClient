class InfiniteScroller {
    getIDFromOffset;
    getHTMLFromID;
    destroyFromID;
    reachesBottom;
    minDist = 2000;
    fillDist = 3000;
    maxDist = 6000;
    HTMLElements = [];
    div;
    scroll;
    constructor(getIDFromOffset, getHTMLFromID, destroyFromID, reachesBottom = () => { }) {
        this.getIDFromOffset = getIDFromOffset;
        this.getHTMLFromID = getHTMLFromID;
        this.destroyFromID = destroyFromID;
        this.reachesBottom = reachesBottom;
    }
    timeout;
    async getDiv(initialId, bottom = true) {
        const div = document.createElement("div");
        div.classList.add("messagecontainer");
        //div.classList.add("flexttb")
        const scroll = document.createElement("div");
        scroll.classList.add("flexttb", "scroller");
        div.appendChild(scroll);
        this.div = div;
        //this.interval=setInterval(this.updatestuff.bind(this,true),100);
        this.scroll = scroll;
        this.div.addEventListener("scroll", _ => {
            if (this.scroll)
                this.scrollTop = this.scroll.scrollTop;
            this.watchForChange();
        });
        this.scroll.addEventListener("scroll", _ => {
            if (this.timeout === null) {
                this.timeout = setTimeout(this.updatestuff.bind(this), 300);
            }
            this.watchForChange();
        });
        {
            let oldheight = 0;
            new ResizeObserver(_ => {
                this.updatestuff();
                const change = oldheight - div.offsetHeight;
                if (change > 0 && this.scroll) {
                    this.scroll.scrollTop += change;
                }
                oldheight = div.offsetHeight;
                this.watchForChange();
            }).observe(div);
        }
        new ResizeObserver(this.watchForChange.bind(this)).observe(scroll);
        await this.firstElement(initialId);
        this.updatestuff();
        await this.watchForChange().then(_ => {
            this.updatestuff();
        });
        return div;
    }
    scrollBottom;
    scrollTop;
    needsupdate = true;
    averageheight = 60;
    async updatestuff() {
        this.timeout = null;
        if (!this.scroll)
            return;
        this.scrollBottom = this.scroll.scrollHeight - this.scroll.scrollTop - this.scroll.clientHeight;
        this.averageheight = this.scroll.scrollHeight / this.HTMLElements.length;
        if (this.averageheight < 10) {
            this.averageheight = 60;
        }
        this.scrollTop = this.scroll.scrollTop;
        if (!this.scrollBottom && !await this.watchForChange()) {
            this.reachesBottom();
        }
        if (!this.scrollTop) {
            await this.watchForChange();
        }
        this.needsupdate = false;
        //this.watchForChange();
    }
    async firstElement(id) {
        if (!this.scroll)
            return;
        const html = await this.getHTMLFromID(id);
        this.scroll.appendChild(html);
        this.HTMLElements.push([html, id]);
    }
    currrunning = false;
    async addedBottom() {
        this.updatestuff();
        const func = this.snapBottom();
        await this.watchForChange();
        func();
    }
    snapBottom() {
        const scrollBottom = this.scrollBottom;
        return () => {
            if (this.scroll && scrollBottom < 30) {
                this.scroll.scrollTop = this.scroll.scrollHeight + 20;
            }
        };
    }
    async watchForTop(already = false, fragement = new DocumentFragment()) {
        if (!this.scroll)
            return false;
        try {
            let again = false;
            if (this.scrollTop < (already ? this.fillDist : this.minDist)) {
                let nextid;
                const firstelm = this.HTMLElements.at(0);
                if (firstelm) {
                    const previd = firstelm[1];
                    nextid = await this.getIDFromOffset(previd, 1);
                }
                if (!nextid) {
                }
                else {
                    const html = await this.getHTMLFromID(nextid);
                    if (!html) {
                        this.destroyFromID(nextid);
                        return false;
                    }
                    again = true;
                    fragement.prepend(html);
                    this.HTMLElements.unshift([html, nextid]);
                    this.scrollTop += this.averageheight;
                }
            }
            if (this.scrollTop > this.maxDist) {
                const html = this.HTMLElements.shift();
                if (html) {
                    again = true;
                    await this.destroyFromID(html[1]);
                    this.scrollTop -= this.averageheight;
                }
            }
            if (again) {
                await this.watchForTop(true, fragement);
            }
            return again;
        }
        finally {
            if (!already) {
                if (this.scroll.scrollTop === 0) {
                    this.scrollTop = 1;
                    this.scroll.scrollTop = 10;
                }
                this.scroll.prepend(fragement, fragement);
            }
        }
    }
    async watchForBottom(already = false, fragement = new DocumentFragment()) {
        if (!this.scroll)
            return false;
        try {
            let again = false;
            const scrollBottom = this.scrollBottom;
            if (scrollBottom < (already ? this.fillDist : this.minDist)) {
                let nextid;
                const lastelm = this.HTMLElements.at(-1);
                if (lastelm) {
                    const previd = lastelm[1];
                    nextid = await this.getIDFromOffset(previd, -1);
                }
                if (!nextid) {
                }
                else {
                    again = true;
                    const html = await this.getHTMLFromID(nextid);
                    fragement.appendChild(html);
                    this.HTMLElements.push([html, nextid]);
                    this.scrollBottom += this.averageheight;
                }
            }
            if (scrollBottom > this.maxDist) {
                const html = this.HTMLElements.pop();
                if (html) {
                    await this.destroyFromID(html[1]);
                    this.scrollBottom -= this.averageheight;
                    again = true;
                }
            }
            if (again) {
                await this.watchForBottom(true, fragement);
            }
            return again;
        }
        finally {
            if (!already) {
                this.scroll.append(fragement);
                if (this.scrollBottom < 30) {
                    this.scroll.scrollTop = this.scroll.scrollHeight;
                }
            }
        }
    }
    watchtime = false;
    changePromise;
    async watchForChange() {
        if (this.currrunning) {
            this.watchtime = true;
            if (this.changePromise) {
                return await this.changePromise;
            }
            else {
                return false;
            }
        }
        else {
            this.watchtime = false;
            this.currrunning = true;
        }
        this.changePromise = new Promise(async (res) => {
            try {
                try {
                    if (!this.div) {
                        res(false);
                        return false;
                    }
                    const out = await Promise.allSettled([this.watchForTop(), this.watchForBottom()]);
                    const changed = (out[0].value || out[1].value);
                    if (this.timeout === null && changed) {
                        this.timeout = setTimeout(this.updatestuff.bind(this), 300);
                    }
                    if (!this.currrunning) {
                        console.error("something really bad happened");
                    }
                    res(Boolean(changed));
                    return Boolean(changed);
                }
                catch (e) {
                    console.error(e);
                }
                res(false);
                return false;
            }
            catch (e) {
                throw e;
            }
            finally {
                setTimeout(_ => {
                    this.changePromise = undefined;
                    this.currrunning = false;
                    if (this.watchtime) {
                        this.watchForChange();
                    }
                }, 300);
            }
        });
        return await this.changePromise;
    }
    async focus(id, flash = true) {
        let element;
        for (const thing of this.HTMLElements) {
            if (thing[1] === id) {
                element = thing[0];
            }
        }
        console.log(id, element, this.HTMLElements.length, ":3");
        if (element) {
            if (flash) {
                element.scrollIntoView({
                    behavior: "smooth",
                    block: "center"
                });
                await new Promise(resolve => setTimeout(resolve, 1000));
                element.classList.remove("jumped");
                await new Promise(resolve => setTimeout(resolve, 100));
                element.classList.add("jumped");
            }
            else {
                element.scrollIntoView();
            }
        }
        else {
            for (const thing of this.HTMLElements) {
                await this.destroyFromID(thing[1]);
            }
            this.HTMLElements = [];
            await this.firstElement(id);
            this.updatestuff();
            await this.watchForChange();
            await new Promise(resolve => setTimeout(resolve, 100));
            await this.focus(id, true);
        }
    }
    async delete() {
        for (const thing of this.HTMLElements) {
            await this.destroyFromID(thing[1]);
        }
        this.HTMLElements = [];
        if (this.timeout) {
            clearTimeout(this.timeout);
        }
        if (this.div) {
            this.div.remove();
        }
        this.scroll = null;
        this.div = null;
    }
}
export { InfiniteScroller };
