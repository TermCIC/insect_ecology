import {spawn} from 'node:child_process';
import {mkdir,writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {resolve,join} from 'node:path';
import {pathToFileURL} from 'node:url';
const tag=process.argv[2]||'after',out=resolve('artifacts/biocontrol-visual'),port=19000+Math.floor(Math.random()*10000);
await mkdir(out,{recursive:true});
const browser=spawn('C:/Program Files/Google/Chrome/Application/chrome.exe',['--headless=new','--use-angle=swiftshader','--enable-unsafe-swiftshader','--disable-gpu-sandbox','--disable-gpu-shader-disk-cache','--disable-features=SkiaGraphite,DawnGraphite,WebGPU','--no-first-run','--no-default-browser-check',`--remote-debugging-port=${port}`,`--user-data-dir=${join(tmpdir(),'bcf-visual-'+Date.now())}`,'about:blank'],{stdio:'ignore',windowsHide:true});
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
let ws,id=0;const pending=new Map(),errors=[];
try{
 let pages;for(let n=0;n<60;n++){try{pages=await(await fetch(`http://127.0.0.1:${port}/json`)).json();break}catch{await sleep(200)}}
 ws=new WebSocket(pages.find(p=>p.type==='page').webSocketDebuggerUrl);await new Promise(r=>ws.onopen=r);
 ws.onmessage=e=>{const m=JSON.parse(e.data);if(m.id)pending.get(m.id)?.(m);if(m.method==='Runtime.exceptionThrown')errors.push(m.params.exceptionDetails);if(m.method==='Runtime.consoleAPICalled'&&m.params.type==='error')errors.push(m.params.args)};
 const send=(method,params={})=>new Promise((r,j)=>{const n=++id,t=setTimeout(()=>j(Error(method+' timeout')),20000);pending.set(n,m=>{clearTimeout(t);pending.delete(n);r(m)});ws.send(JSON.stringify({id:n,method,params}))});
 const ev=async expression=>{const m=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(m.result.exceptionDetails)throw Error(JSON.stringify(m.result.exceptionDetails));return m.result.result.value};
 const shot=async name=>{const m=await send('Page.captureScreenshot',{format:'png'});await writeFile(join(out,tag+'-'+name+'.png'),Buffer.from(m.result.data,'base64'))};
 await send('Runtime.enable');await send('Page.enable');await send('Emulation.setDeviceMetricsOverride',{width:1440,height:900,deviceScaleFactor:1,mobile:false});
 await send('Page.navigate',{url:pathToFileURL(resolve('biocontrol_farm_game.html')).href+'?debug'});
 for(let n=0;n<80;n++){if(await ev('!!window.__bcf'))break;await sleep(250)}
 await shot('menu');await ev("document.querySelector('#startBtn').click();document.querySelector('[data-speed=\"0\"]').click()");
 // Use actual game actions to populate a representative farm, then inspect growth stages.
 await ev(`document.querySelector('[data-group="crops"] > summary').click()`);
 const dragPoints=await ev(`(()=>{const h=window.__bcf,b=document.querySelector('[data-tool="cabbage"]').getBoundingClientRect(),p=h.tiles[27].mesh.position.clone().project(h.camera);return {from:[b.x+b.width/2,b.y+b.height/2],to:[(p.x+1)*innerWidth/2,(1-p.y)*innerHeight/2]}})()`);
 for(const [type,p,buttons] of [['mousePressed',dragPoints.from,1],['mouseMoved',dragPoints.to,1],['mouseReleased',dragPoints.to,0]])await send('Input.dispatchMouseEvent',{type,x:p[0],y:p[1],button:'left',buttons,clickCount:1});
 if(!await ev("__bcf.tiles[27].kind==='crop'"))throw Error('Real pointer planting failed');
 const click=async(selector,tile)=>{
  if(selector)await ev(`(()=>{const e=document.querySelector(${JSON.stringify(selector)}),d=e.closest('details');if(d&&!d.open&&!e.matches('summary'))d.querySelector('summary').click()})()`);
  const p=await ev(tile===undefined?`(()=>{const r=document.querySelector(${JSON.stringify(selector)}).getBoundingClientRect();return [r.x+r.width/2,r.y+r.height/2]})()`:`(()=>{const p=__bcf.tiles[${tile}].mesh.position.clone().project(__bcf.camera);return [(p.x+1)*innerWidth/2,(1-p.y)*innerHeight/2]})()`);
  for(const type of ['mousePressed','mouseReleased'])await send('Input.dispatchMouseEvent',{type,x:p[0],y:p[1],button:'left',buttons:type==='mousePressed'?1:0,clickCount:1});
 };
 await click('[data-tool="cabbage"]');await click(null,28);
 if(!await ev(`__bcf.tiles[28].kind==='crop' && !document.querySelector('#placementModal').classList.contains('show') && __bcf.armed==='cabbage'`))throw Error('Click planting failed');
 const beforeConfirmation=await ev('__bcf.G.money');
 await click('[data-tool="flower"]');await click(null,27);
 if(!await ev(`document.querySelector('#placementModal').classList.contains('show') && __bcf.tiles[27].kind==='crop' && __bcf.G.money===${beforeConfirmation}`))throw Error('Placement changed before confirmation');
 await shot('placement-confirm');await click('#placementCancel');
 if(!await ev(`__bcf.tiles[27].kind==='crop' && __bcf.G.money===${beforeConfirmation}`))throw Error('Cancel spent money or replaced crop');
 await click(null,27);await click('#placementConfirm');
 if(!await ev(`__bcf.tiles[27].kind==='flower' && __bcf.G.money===${beforeConfirmation-15}`))throw Error('Confirmation did not charge exactly once');
 await click('[data-tool="flower"]'); // deselect
 await ev(`(()=>{const h=window.__bcf;h.G.goalReached=true;h.G.money=5000;for(let z=1;z<7;z++)for(let x=1;x<7;x++){const t=h.tiles[z*8+x];if(t.kind==='empty')h.apply(x===1?'flower':x===6?'bank':x<4?'cabbage':'tomato',t);if(t.kind==='crop'){t.grow=(x===2?1:0.75)* (t.crop==='cabbage'?40:70);t.health=z===6?0.5:1;}}h.apply('trap',h.tiles[27]);h.G.money=320;document.querySelectorAll('.toast').forEach(e=>e.remove());})()`);
 await sleep(1700);await shot('desktop');
 const prices=await ev(`(()=>{const t=__bcf.tiles[18],el=document.querySelector('[data-tile="18"] .crop-value');return {text:el?.textContent,value:Math.round(45*t.health),count:document.querySelectorAll('.crop-value').length,crops:__bcf.tiles.filter(t=>t.kind==='crop').length}})()`);
 if(prices.text!=='$'+prices.value || prices.count!==prices.crops)throw Error('Crop sale labels do not match simulation');
 const moneyBeforeDamage=await ev('__bcf.G.money');await ev('__bcf.tiles[18].health=0.6');await sleep(150);
 if(!await ev(`document.querySelector('[data-tile="18"] .crop-value').textContent==='$27' && document.querySelector('[data-tile="18"] .crop-loss').textContent==='−$18' && __bcf.G.money===${moneyBeforeDamage}`))throw Error('Damage loss display incorrect');
 await shot('value-loss');await sleep(1500);
 if(await ev(`!!document.querySelector('[data-tile="18"] .crop-loss')`))throw Error('Loss flash did not expire');
 await ev(`__bcf.apply('sickle',__bcf.tiles[18])`);await sleep(50);
 if(!await ev(`!document.querySelector('[data-tile="18"]') && __bcf.G.money===${moneyBeforeDamage+27}`))throw Error('Harvest label cleanup or actual sale value incorrect');
 const diagnostics=await ev('window.__bcf.diagnostics?.() || null');
 const pixels=await ev('window.__bcf.sampleCanvas?.() || null');if(pixels&&pixels.colors<10)throw Error('Canvas lacks visual variation');
 const overlap=await ev("document.querySelector('#panel').getBoundingClientRect().top < document.querySelector('#topbar').getBoundingClientRect().bottom");if(overlap)throw Error('HUD overlaps inspector');
 await send('Emulation.setDeviceMetricsOverride',{width:1024,height:768,deviceScaleFactor:1,mobile:false});await sleep(300);await shot('laptop');
 await send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});await sleep(500);await shot('mobile');
 await click('[data-group="enemies"] > summary');await shot('tools-expanded-mobile');
 await click('#speed > summary');
 if(!await ev(`document.querySelectorAll('.dropdown[open]').length===1`))throw Error('Multiple menus remain open');
 await shot('speed-expanded-mobile');await click('[data-speed="0"]');
 const tap=async(selector,tile)=>{
  if(selector)await ev(`(()=>{const e=document.querySelector(${JSON.stringify(selector)}),d=e.closest('details');if(d&&!d.open&&!e.matches('summary'))d.querySelector('summary').click()})()`);
  const p=await ev(tile===undefined?`(()=>{const r=document.querySelector(${JSON.stringify(selector)}).getBoundingClientRect();return [r.x+r.width/2,r.y+r.height/2]})()`:`(()=>{const p=__bcf.tiles[${tile}].mesh.position.clone().project(__bcf.camera);return [(p.x+1)*innerWidth/2,(1-p.y)*innerHeight/2]})()`);
  await send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:p[0],y:p[1]}]});await send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
 };
 await tap('[data-tool="cabbage"]');await tap(null,3);
 if(!await ev(`__bcf.tiles[3].kind==='crop' && !document.querySelector('#placementModal').classList.contains('show')`))throw Error('Touch planting failed');
 const touchMoney=await ev('__bcf.G.money');await tap('[data-tool="bank"]');await tap(null,3);
 if(!await ev(`document.querySelector('#placementModal').classList.contains('show') && __bcf.G.money===${touchMoney}`))throw Error('Touch confirmation failed');
 await shot('placement-confirm-mobile');await tap('#placementCancel');
 if(!await ev(`__bcf.G.money===${touchMoney} && __bcf.tiles[3].kind==='crop'`))throw Error('Touch cancellation failed');
 await tap('[data-tool="bank"]');
 const fit=await ev(`({overflow:document.documentElement.scrollWidth>innerWidth,tools:[...document.querySelectorAll('.tool')].map(e=>({w:e.getBoundingClientRect().width,h:e.getBoundingClientRect().height}))})`);
 await ev(`document.querySelector('[data-view="threshold"]').click()`);await sleep(200);await shot('threshold-mobile');
 const phoneLayouts=[];
 for(const width of [320,375,390,430]){
  await send('Emulation.setDeviceMetricsOverride',{width,height:650,deviceScaleFactor:1,mobile:true});
  await ev(`__bcf.G.day=114;__bcf.G.money=123456;document.querySelector('#panel').classList.add('open');__bcf.apply('lens',__bcf.tiles[47]);`);await sleep(400);
  const layout=await ev(`(()=>{const rect=e=>e.getBoundingClientRect(),ids=['day','money'],overflow=ids.some(id=>{const e=document.getElementById(id),range=document.createRange();range.selectNodeContents(e);const r=range.getBoundingClientRect(),p=rect(e.parentElement);return r.right>p.right+1||r.left<p.left-1});const panel=rect(document.querySelector('#panel')),dock=rect(document.querySelector('#dock')),hud=rect(document.querySelector('#topbar'));return {width:innerWidth,overflow,panelClear:panel.bottom<=dock.top-4&&panel.top>=hud.bottom,scrollable:document.querySelector('#panel').scrollHeight>document.querySelector('#panel').clientHeight}})()`);
  if(layout.overflow||!layout.panelClear)throw Error('Phone layout failed: '+JSON.stringify(layout));phoneLayouts.push(layout);await shot('phone-fit-'+width);
 }
 await ev(`document.querySelector('#guideBtn').click()`);await sleep(200);await shot('guide-mobile');
 const report={errors,diagnostics,pixels,fit,phoneLayouts,realPointerPlanting:true,clickPlanting:true,confirmationBeforeSpending:true,cancelPreservesCrop:true,confirmChargesOnce:true,touchPlanting:true,touchConfirmation:true,hudOverlap:overlap};await writeFile(join(out,tag+'-report.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report));if(errors.length)process.exitCode=1;
}finally{ws?.close();browser.kill();}
