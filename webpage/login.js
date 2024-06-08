function getCookie(name) {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop().split(';').shift();
}
async function login(username, password){
    const options={
        method: "POST",
        body:JSON.stringify({
            "login": username,
            "password": password,
            "undelete":false
        }),
        headers: {
            "Content-type": "application/json; charset=UTF-8",
        }}
    try{
        return await fetch('https://spacebar-api.vanillaminigames.net/api/auth/login',options).then(responce=>responce.json())
        .then((response) => {
            console.log(response,response.message)
            if("Invalid Form Body"===response.message){
                return response.errors.login._errors[0].message;
                console.log("test")
            }
            document.cookie = "token="+response.token+"; expires="+new Date(Date.now()+(6.048e+8*2));
            window.location.href = '/channels/@me';
            return response.token;
        })
    }catch(error){
        console.error('Error:', error);
    };
}
function gettoken(){
    const temp=getCookie("token");
    if(temp===undefined){
        window.location.href = '/login.html';
    }
    return temp;
}

async function check(e){

    e.preventDefault();
    let h=await login(e.srcElement[0].value,e.srcElement[1].value);
    document.getElementById("wrong").innerText=h;
    console.log(h);
}
if(document.getElementById("form")){
document.getElementById("form").addEventListener("submit", check);
}
