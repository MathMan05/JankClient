type translation={
    [key:string]:string|{[key:string]:string}
};
let res:()=>unknown=()=>{};
class I18n{
    static lang:string;
    static translations:{[key:string]:string}[]=[];
    static done=new Promise<void>((res2,_reject)=>{
        res=res2;
    });
    static async create(json:translation|string,lang:string){
        if(typeof json === "string"){
            json=await (await fetch(json)).json() as translation;
        }
        const translations:{[key:string]:string}[]=[];
        let translation=json[lang];
        if(!translation){
            translation=json[lang[0]+lang[1]];
            if(!translation){
                console.error(lang+" does not exist in the translations");
                translation=json["en"];
                lang="en";
            }
        }
        translations.push(await this.toTranslation(translation,lang));
        if(lang!=="en"){
            translations.push(await this.toTranslation(json["en"],"en"))
        }
        this.lang=lang;
        this.translations=translations;
        res();
    }
    static getTranslation(msg:string,...params:string[]):string{
        let str:string|undefined;
        for(const json of this.translations){
            str=json[msg];
            if(str){
                break;
            }
        }
        if(str){
            return this.fillInBlanks(str,params);
        }else{
            throw new Error(msg+" not found")
        }
    }
    static fillInBlanks(msg:string,params:string[]):string{
        //thanks to geotale for the regex
        msg=msg.replace(/{{(.+?)}}/g,
            (str, match:string) => {
                const [op,strsSplit]=this.fillInBlanks(match,params).split(":");
                const [first,...strs]=strsSplit.split("|");
                switch(op.toUpperCase()){
                    case "PLURAL":{
                        const numb=Number(first);
                        if(numb===0){
                            return strs[strs.length-1];
                        }
                        return strs[Math.min(strs.length-1,numb-1)];
                    }
                    case "GENDER":{
                        if(first==="male"){
                            return strs[0];
                        }else if(first==="female"){
                            return strs[1];
                        }else if(first==="neutral"){
                            if(strs[2]){
                                return strs[2];
                            }else{
                                return strs[0];
                            }
                        }
                    }
                }
                return str;
            }
        );
        msg=msg.replace(/\$\d+/g,(str, match:string) => {
            const number=Number(match);
            if(params[number-1]){
                return params[number-1];
            }else{
                return str;
            }
        });
        return msg;
    }
    private static async toTranslation(trans:string|{[key:string]:string},lang:string):Promise<{[key:string]:string}>{
        if(typeof trans==='string'){
            return this.toTranslation((await (await fetch(trans)).json() as translation)[lang],lang);
        }else{
            return trans;
        }
    }
}
export{I18n};
