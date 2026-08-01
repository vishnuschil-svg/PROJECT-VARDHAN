import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const endpoint = process.env.CDP_ENDPOINT || "http://127.0.0.1:9222";
const app = process.env.APP_URL || "http://127.0.0.1:4173";
const output = path.resolve("artifacts/ai-chit-flow");
const screens = ["", "upload", "analyzing", "summary", "details", "schedule", "rules", "terms", "review", "success"];
const viewports = [{name:"360",width:360,height:800},{name:"390",width:390,height:844},{name:"768",width:768,height:1024},{name:"1366",width:1366,height:900}];

const targets = await fetch(`${endpoint}/json/list`).then(r=>r.json());
const target = targets.find(x=>x.type==="page");
if(!target) throw new Error("No Chrome page target is available.");
const ws = new WebSocket(target.webSocketDebuggerUrl); const pending = new Map(); let id=0;
await new Promise((resolve,reject)=>{ws.onopen=resolve;ws.onerror=reject;});
ws.onmessage=(event)=>{const message=JSON.parse(event.data);if(message.id&&pending.has(message.id)){const {resolve,reject}=pending.get(message.id);pending.delete(message.id);if(message.error)reject(new Error(message.error.message));else resolve(message.result);}};
const send=(method,params={})=>new Promise((resolve,reject)=>{const next=++id;pending.set(next,{resolve,reject});ws.send(JSON.stringify({id:next,method,params}));});
const wait=(ms)=>new Promise(resolve=>setTimeout(resolve,ms));
await send("Page.enable"); await send("Runtime.enable"); await mkdir(output,{recursive:true});

const analysis={id:"visual-review-analysis",status:"Needs Review",originalDocument:{name:"approved-flow-review.json",type:"application/json",size:2048},rawExtractedContent:"Visual verification fixture",documentType:"Month-wise Schedule",chitModel:"Month-wise configured",provider:"deterministic-json",fields:{chitName:field("Lakshmi Monthly Chit",.95,"Verified"),chitValue:field(100000,.92,"Verified"),memberCount:field(20,.88,"Verified"),duration:field(20,.9,"Verified"),monthlyPayment:field(5000,.84,"Probable"),commission:field(5,.65,"Probable")},schedule:[row(1,5000,95000,.95,"Verified"),row(2,5000,90000,.72,"Probable"),row(3,0,0,0,"Missing")],rules:[{type:"LIFTED",originalWording:"Lifted member continues the confirmed due amount.",normalizedMeaning:"Use the confirmed lifted-member schedule.",confidence:.78,status:"Needs Review",confirmed:false}],terms:[{originalWording:"Payment shall be made before the prize date.",normalizedMeaning:"Collection is due before the configured prize date.",confidence:.74,status:"Needs Review",confirmed:false}],relationships:[{field:"standardPayment",type:"Fixed relationship",matchedRows:2,totalRows:3,status:"Probable",confidence:.67,evidence:"Tested 3 applicable rows"}],missingInformation:[],clarificationQuestions:["Confirm whether month three is intentionally blank."],userCorrections:[],auditHistory:[{action:"ANALYSIS_CREATED",at:new Date().toISOString(),details:{provider:"deterministic-json"}}]};
const state={analysis,documentName:"Approved Flow Review",confirmed:false,created:{group:{id:"visual-group",chit_name:"Lakshmi Monthly Chit"}}};

await send("Page.navigate",{url:`${app}/chits/ai-chit`}); await wait(1600);
await send("Runtime.evaluate",{expression:`sessionStorage.setItem(${JSON.stringify("vardhan.ai-chit-flow.v1.own-chit-business.own_business")},${JSON.stringify(JSON.stringify(state))})`});
for(const viewport of viewports){await send("Emulation.setDeviceMetricsOverride",{width:viewport.width,height:viewport.height,deviceScaleFactor:1,mobile:viewport.width<768});for(let index=0;index<screens.length;index++){const suffix=screens[index];await send("Page.navigate",{url:`${app}/chits/ai-chit${suffix?`/${suffix}`:""}`});await waitForRendered();const metrics=await send("Runtime.evaluate",{expression:"JSON.stringify({scrollWidth:document.documentElement.scrollWidth,clientWidth:document.documentElement.clientWidth,path:location.pathname})",returnByValue:true});const contract=JSON.parse(metrics.result.value);if(contract.scrollWidth>contract.clientWidth)throw new Error(`Horizontal overflow at ${contract.path} / ${viewport.name}px`);const shot=await send("Page.captureScreenshot",{format:"png",captureBeyondViewport:false});await writeFile(path.join(output,`${String(index+1).padStart(2,"0")}-${suffix||"welcome"}-${viewport.name}.png`),Buffer.from(shot.data,"base64"));}}
ws.close(); console.log(`Captured ${screens.length*viewports.length} verified screenshots in ${output}`);
async function waitForRendered(){for(let attempt=0;attempt<30;attempt++){await wait(150);const result=await send("Runtime.evaluate",{expression:"Boolean(document.querySelector('.ai-chit-frame')) && !document.body.innerText.includes('Loading...')",returnByValue:true});if(result.result.value)return;}throw new Error("AI Chit screen did not finish rendering.");}
function field(value,confidence,status){return{originalValue:value,normalizedValue:value,userCorrectedValue:null,confidence,status,evidence:"Visual verification fixture evidence"};}
function row(monthNumber,standardPayment,prizeAmount,confidence,status){return{monthNumber,monthLabel:`Month ${monthNumber}`,standardPayment,nonLiftedPayment:standardPayment,liftedPayment:standardPayment,prizeAmount,bidAmount:0,dividendPerMember:0,commissionValue:5,status,confidence,evidence:`Visual verification row ${monthNumber}`,isUserConfirmed:false};}
