const index = require("./index.js");
const fs=require("node:fs");
let uptimeObject={};
if(fs.existsSync("./uptime.json")){
	try{
		uptimeObject=JSON.parse(fs.readFileSync("./uptime.json", "utf8"));
	}catch{
		uptimeObject={};
	}
}
if(uptimeObject.undefined){
	delete uptimeObject.undefined;
	updatejson();
}
async function observe(instances){
	const active=new Set();
	async function resolveinstance(instance){
		try{
			calcStats(instance);
		}catch(e){
			console.error(e);
		}
		let api;
		if(instance.urls){
			api=instance.urls.api;
		}else if(instance.url){
			const urls=await index.getapiurls(instance.url);
			if(urls){
				api=urls.api;
			}
		}
		if(!api||api===""){
			setStatus(instance,false);
			console.warn(instance.name+" does not resolve api URL");
			setTimeout(_=>{
				resolveinstance(instance);
			},1000*60*30,);
			return;
		}
		active.add(instance.name);
		api+=api.endsWith("/")?"":"/";
		function check(){
			fetch(api+"ping",{method: "HEAD"}).then(_=>{
				setStatus(instance,_.ok);
			});
		}
		setTimeout(
			_=>{
				check();
				setInterval(_=>{
					check();
				},1000*60*30);
			},Math.random()*1000*60*10
		);
	}
	const promlist=[];
	for(const instance of instances){
		promlist.push(resolveinstance(instance));
	}
	await Promise.allSettled(promlist);
	for(const key of Object.keys(uptimeObject)){
		if(!active.has(key)){
			setStatus(key,false);
		}
	}
}
function calcStats(instance){
	const obj=uptimeObject[instance.name];
	if(!obj)return;
	const day=Date.now()-1000*60*60*24;
	const week=Date.now()-1000*60*60*24*7;
	let alltime=-1;
	let totalTimePassed=0;
	let daytime=-1;
	let weektime=-1;
	let online=false;
	let i=0;
	for(const thing of obj){
		online=thing.online;
		let stamp=thing.time;
		if(alltime===-1){
			alltime=0;
		}
		let timepassed;
		if(obj[i+1]){
			timepassed=obj[i+1].time-stamp;
		}else{
			timepassed=Date.now()-stamp;
		}
		totalTimePassed+=timepassed;
		alltime+=online*timepassed;
		if(stamp+timepassed>week){
			if(stamp<week){
				timepassed-=week-stamp;
				stamp=week;
			}
			weektime+=online*timepassed;
			if(stamp+timepassed>day){
				if(stamp<day){
					timepassed-=day-stamp;
					stamp=day;
				}
				daytime+=online*timepassed;
			}
		}

		i++;
	}
	console.log(daytime);
	instance.online=online;
	alltime/=totalTimePassed;
	if(totalTimePassed>1000*60*60*24){
		if(daytime===-1){
			daytime=online*1000*60*60*24;
		}
		daytime/=1000*60*60*24;
		if(totalTimePassed>1000*60*60*24*7){
			if(weektime===-1){
				weektime=online*1000*60*60*24*7;
			}
			weektime/=1000*60*60*24*7;
		}else{
			weektime=alltime;
		}
	}else{
		weektime=alltime;
		daytime=alltime;
	}
	instance.uptime={daytime,weektime,alltime};
}
/**
 * @param {string|Object} instance
 * @param {boolean} status
 */
function setStatus(instance,status){
	let name=instance.name;
	if(typeof instance==="string"){
		name=instance;
	}

	let obj=uptimeObject[name];
	let needSetting=false;
	if(!obj){
		obj=[];
		uptimeObject[name]=obj;
		needSetting=true;
	}else{
		if(obj.at(-1).online!==status){
			needSetting=true;
		}
	}
	if(needSetting){
		obj.push({time: Date.now(),online: status});
		updatejson();
	}
	if(typeof instance!=="string"){
		calcStats(instance);
	}
}
function updatejson(){
	fs.writeFile("./uptime.json",JSON.stringify(uptimeObject),_=>{});
}
exports.observe=observe;
exports.uptime=uptimeObject;
