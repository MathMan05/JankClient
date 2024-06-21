if(document.getElementById("register")){
document.getElementById("register").addEventListener("submit", registertry);
}
async function registertry(e){

    e.preventDefault();
    const elements=e.srcElement;
    const email=elements[1].value;
    const username=elements[2].value;
    if(elements[3].value!==elements[4].value){
        document.getElementById("wrong").textContent="Passwords don't match";
        return;
    }
    const password=elements[3].value;
    const dateofbirth=elements[5].value;
    const apiurl=new URL(JSON.parse(localStorage.getItem("instanceinfo")).api)

    fetch(apiurl+"/auth/register",{
        body:JSON.stringify({
            date_of_birth:dateofbirth,
            email:email,
            username:username,
            password:password,
            consent:elements[6].checked,
        }),
        headers:{
            "content-type": "application/json"
        },
        method:"POST"
    }).then(e=>{
        e.json().then(e=>{
            if(!e.token){
                console.log(e);
                document.getElementById("wrong").textContent=e.errors[Object.keys(e.errors)[0]]._errors[0].message;
            }else{
                localStorage.setItem("token",e.token);
                window.location.href = '/channels/@me';
            }
        })
    })
    //document.getElementById("wrong").textContent=h;
    // console.log(h);
}
let TOSa=document.getElementById("TOSa");
async function tosLogic(){
    const apiurl=new URL(JSON.parse(localStorage.getItem("instanceinfo")).api)
    const tosPage=(await (await fetch(apiurl.toString()+"/ping")).json()).instance.tosPage;
    if(tosPage){
        document.getElementById("TOSbox").innerHTML="I agree to the <a href=\"\" id=\"TOSa\">TOS</a>:";
        TOSa=document.getElementById("TOSa");
        TOSa.href=tosPage;
    }else{
        document.getElementById("TOSbox").textContent="This instance has no TOS, accept TOS anyways:";
        TOSa=null;
    }
    console.log(tosPage);
}
tosLogic();

checkInstance.alt=tosLogic;
