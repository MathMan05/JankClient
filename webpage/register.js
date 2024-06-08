if(document.getElementById("register")){
document.getElementById("register").addEventListener("submit", registertry);
}
async function registertry(e){

    e.preventDefault();
    const elements=e.srcElement;
    const email=elements[1].value;
    const username=elements[2].value;
    if(elements[3].value!==elements[4].value){
        document.getElementById("wrong").innerText="Passwords don't match";
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
            consent:true,
        }),
        headers:{
            "content-type": "application/json"
        },
        method:"POST"
    }).then(e=>{
        e.json().then(e=>{
            if(!e.token){
                console.log(e);
                document.getElementById("wrong").innerText=e.errors[Object.keys(e.errors)[0]]._errors[0].message;
            }else{
                localStorage.setItem("token",e.token);
                window.location.href = '/channels/@me';
            }
        })
    })
    //document.getElementById("wrong").innerText=h;
    // console.log(h);
}
