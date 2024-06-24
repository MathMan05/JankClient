"use strict";
function markdown(txt,keep=false){
    if((typeof txt)===(typeof "")){
        return markdown(txt.split(""),keep);
    }
    const span=document.createElement("span");
    let current=document.createElement("span");
    function appendcurrent(){
        if(current.innerHTML!==""){
            span.append(current);
            current=document.createElement("span");
        }

    }
    for(let i=0;i<txt.length;i++){
        if(txt[i]==="\n"||i===0){
            const first=i===0;
            if(first){
                i--;
            }
            let element=null;
            let keepys=false;

            if(txt[i+1]==="#"){
                console.log("test");
                if(txt[i+2]==="#"){
                    if(txt[i+3]==="#"&&txt[i+4]===" "){
                        element=document.createElement("h3");
                        keepys="### ";
                        i+=5;
                    }else if(txt[i+3]===" "){
                        element=document.createElement("h2");
                        element.classList.add("h2md");
                        keepys="## ";
                        i+=4;
                    }
                }else if(txt[i+2]===" "){
                    element=document.createElement("h1");
                    keepys="# ";
                    i+=3;
                }
            }else if(txt[i+1]===">"&&txt[i+2]===" "){
                element=document.createElement("div");
                const line=document.createElement("div");
                line.classList.add("quoteline");
                element.append(line);
                element.classList.add("quote");
                keepys="> ";
                i+=3;
            }
            if(keepys){
                appendcurrent();
                if(!first){
                    span.appendChild(document.createElement("br"));
                }
                const build=[];
                for(;txt[i]!=="\n"&&txt[i]!==undefined;i++){
                    build.push(txt[i]);
                }
                if(keep){
                    element.append(keepys);
                }
                element.appendChild(markdown(build,keep));
                span.append(element);
                i--;
                continue;
            }
            if(first){
                i++;
            }
        }
        if(txt[i]==="\n"){
            appendcurrent();
            span.append(document.createElement("br"));
            continue;
        }
        if(txt[i]==="`"){
            let count=1;
            if(txt[i+1]==="`"){
                count++;
                if(txt[i+2]==="`"){
                    count++;
                }
            }
            let build="";
            if(keep){
              build+="`".repeat(count);
            }
            let find=0;
            let j=i+count;
            let init=true;
            for(;txt[j]!==undefined&&(txt[j]!=="\n"||count===3)&&find!==count;j++){
                if(txt[j]==="`"){
                    find++;
                }else{
                    if(find!==0){
                        build+="`".repeat(find);
                        find=0;
                    }
                    if(init&&count===3){
                        if(txt[j]===" "||txt[j]==="\n"){
                            init=false;
                        }
                        if(keep){
                            build+=txt[j];
                        }
                        continue;
                    }
                    build+=txt[j];
                }
            }
            if(find===count){
                appendcurrent();
                i=j;
                if(keep){
                    build+="`".repeat(find);
                }
                if(count!==3){
                    const samp=document.createElement("samp");
                    samp.textContent=build;
                    span.appendChild(samp);
                }else{
                    const pre=document.createElement("pre");
                    if(build[build.length-1]==="\n"){
                        build=build.substring(0,build.length-1);
                    }
                    if(txt[i]==="\n"){
                        i++
                    }
                    pre.textContent=build;
                    span.appendChild(pre);
                }
                i--;
                continue;
            }
        }

        if(txt[i]==="*"){
            let count=1;
            if(txt[i+1]==="*"){
                count++;
                if(txt[i+2]==="*"){
                    count++;
                }
            }
            let build=[];
            let find=0;
            let j=i+count;
            for(;txt[j]!==undefined&&find!==count;j++){

                if(txt[j]==="*"){
                    find++;
                }else{
                    build+=txt[j];
                    if(find!==0){
                        build=build.concat(new Array(find).fill("*"));
                        find=0;
                    }
                }
            }
            if(find===count&&(count!=1||txt[i+1]!==" ")){
                appendcurrent();
                i=j;

                const stars="*".repeat(count);
                if(count===1){
                    const i=document.createElement("i");
                    if(keep){i.append(stars)}
                    i.appendChild(markdown(build,keep));
                    if(keep){i.append(stars)}
                    span.appendChild(i);
                }else if(count===2){
                    const b=document.createElement("b");
                    if(keep){b.append(stars)}
                    b.appendChild(markdown(build,keep));
                    if(keep){b.append(stars)}
                    span.appendChild(b);
                }else{
                    const b=document.createElement("b");
                    const i=document.createElement("i");
                    if(keep){b.append(stars)}
                    b.appendChild(markdown(build,keep));
                    if(keep){b.append(stars)}
                    i.appendChild(b);
                    span.appendChild(i);
                }
                i--
                continue;
            }
        }

        if(txt[i]==="_"){
            let count=1;
            if(txt[i+1]==="_"){
                count++;
                if(txt[i+2]==="_"){
                    count++;
                }
            }
            let build=[];
            let find=0;
            let j=i+count;
            for(;txt[j]!==undefined&&find!==count;j++){

                if(txt[j]==="_"){
                    find++;
                }else{
                    build+=txt[j];
                    if(find!==0){
                        build=build.concat(new Array(find).fill("_"));
                        find=0;
                    }
                }
            }
            if(find===count&&(count!=1||(txt[j+1]===" "||txt[j+1]==="\n"||txt[j+1]===undefined))){
                appendcurrent();
                i=j;
                const underscores="_".repeat(count);
                if(count===1){
                    const i=document.createElement("i");
                    if(keep){i.append(underscores)}
                    i.appendChild(markdown(build,keep));
                    if(keep){i.append(underscores)}
                    span.appendChild(i);
                }else if(count===2){
                    const u=document.createElement("u");
                    if(keep){u.append(underscores)}
                    u.appendChild(markdown(build,keep));
                    if(keep){u.append(underscores)}
                    span.appendChild(u);
                }else{
                    const u=document.createElement("u");
                    const i=document.createElement("i");
                    if(keep){i.append(underscores)}
                    i.appendChild(markdown(build,keep));
                    if(keep){i.append(underscores)}
                    u.appendChild(i)
                    span.appendChild(u);
                }
                i--;
                continue;
            }
        }

        if(txt[i]==="~"&&txt[i+1]==="~"){
            let count=2;
            let build=[];
            let find=0;
            let j=i+2;
            for(;txt[j]!==undefined&&find!==count;j++){
                if(txt[j]==="~"){
                    find++;
                }else{
                    build+=txt[j];
                    if(find!==0){
                        build=build.concat(new Array(find).fill("~"));
                        find=0;
                    }
                }
            }
            if(find===count){
                appendcurrent();
                i=j;
                const underscores="~~";
                if(count===2){
                    const s=document.createElement("s");
                    if(keep){s.append(underscores)}
                    s.appendChild(markdown(build,keep));
                    if(keep){s.append(underscores)}
                    span.appendChild(s);
                }
                continue;
            }
        }
        if(txt[i]==="|"&&txt[i+1]==="|"){
            let count=2;
            let build=[];
            let find=0;
            let j=i+2;
            for(;txt[j]!==undefined&&find!==count;j++){
                if(txt[j]==="|"){
                    find++;
                }else{
                    build+=txt[j];
                    if(find!==0){
                        build=build.concat(new Array(find).fill("~"));
                        find=0;
                    }
                }
            }
            if(find===count){
                appendcurrent();
                i=j;
                const underscores="||";
                if(count===2){
                    const j=document.createElement("j");
                    if(keep){j.append(underscores)}
                    j.appendChild(markdown(build,keep));
                    j.classList.add("spoiler");
                    j.onclick=markdown.unspoil;
                    if(keep){j.append(underscores)}
                    span.appendChild(j);
                }
                continue;
            }
        }
        current.textContent+=txt[i];
    }
    appendcurrent();
    return span;
}
markdown.unspoil=function(e){
    //console.log("undone")
    e.target.classList.remove("spoiler")
    e.target.classList.add("unspoiled")
}
