
'use strict';var plantScenario=1,plantDispatched=0;const NS='http://www.w3.org/2000/svg',PX=20;let nodes=[],links=[],tool='select',selected=null,connectStart=null,drag=null,running=false,simTime=0,completed=0,leadTotal=0,leadCount=0,transit=[],clockId=null,nextId=1,sourceRemainders={};const $=id=>document.getElementById(id);function node(type,name,x,y,extra={}){return{id:nextId++,type,name,x,y,w:type==='conveyor'?120:100,h:type==='conveyor'?24:62,count:1,ct:60,delay:0,initial:0,qty:0,processed:0,capacity:0,batches:[],accum:0,...extra}}function seed(){nodes=[node('machine','Boarding',95,100,{count:6,ct:60}),node('wip','Boarded WIP',360,100,{initial:120}),node('station','Packing',620,100,{count:4,ct:90}),node('wip','Finished WIP',870,100,{initial:0})];links=[{from:nodes[0].id,to:nodes[1].id},{from:nodes[1].id,to:nodes[2].id},{from:nodes[2].id,to:nodes[3].id}];resetSim()};function setTool(t){tool=t;connectStart=null;document.querySelectorAll('[data-tool]').forEach(b=>b.classList.toggle('active',b.dataset.tool===t))}function el(tag,attrs={},parent){const o=document.createElementNS(NS,tag);for(const[k,v]of Object.entries(attrs))o.setAttribute(k,v);parent.appendChild(o);return o}function xy(n){return{x:n.x+n.w/2,y:n.y+n.h/2}}function dist(a,b){if(isPlant4())return pathLength(plantRoutePoints(a,b))/PX;const p=xy(a),q=xy(b);return Math.hypot(p.x-q.x,p.y-q.y)/PX}function fmt(n,d=1){return Number(n||0).toFixed(d)}function renderLegacy(){drawBuilding();const eg=$('edges'),og=$('objects');eg.replaceChildren();og.replaceChildren();links.forEach((l,i)=>{const a=nodes.find(n=>n.id===l.from),b=nodes.find(n=>n.id===l.to);if(!a||!b)return;const p=xy(a),q=xy(b),mid=(p.x+q.x)/2;el('path',{d:`M${p.x} ${p.y} C${mid} ${p.y},${mid} ${q.y},${q.x} ${q.y}`,stroke:'#269c88','stroke-width':3,fill:'none','stroke-dasharray':'8 5'},eg);el('circle',{cx:q.x,cy:q.y,r:5,fill:'#269c88'},eg);const text=el('text',{x:mid,y:(p.y+q.y)/2-9,'font-size':11,'text-anchor':'middle',fill:'#5c7d86'},eg);text.textContent=fmt(dist(a,b))+' m'});nodes.forEach(n=>{const g=el('g',{class:'node'+(selected===n.id?' selected':''),transform:`translate(${n.x},${n.y})`,'data-id':n.id},og);const fill={machine:'#e8f1fc',wip:'#fff4df',station:'#eaf8f1',conveyor:'#e9eafc'}[n.type];const stroke={machine:'#538abf',wip:'#d9a046',station:'#43a27b',conveyor:'#7c81c9'}[n.type];drawEquipment(g,n,fill,stroke);g.addEventListener('pointerdown',e=>{e.stopPropagation();if(tool==='connect'){if(connectStart===null){connectStart=n.id;selected=n.id}else if(connectStart!==n.id){if(!links.some(l=>l.from===connectStart&&l.to===n.id)){links.push({from:connectStart,to:n.id});resetSim();persist()}connectStart=null;selected=n.id}render();properties();return}selected=n.id;properties();if(tool==='select'){drag={id:n.id,startX:e.clientX,startY:e.clientY,x:n.x,y:n.y};$('floor').setPointerCapture(e.pointerId)}render()});});$('flowlist').textContent=links.map(l=>{let a=nodes.find(n=>n.id===l.from),b=nodes.find(n=>n.id===l.to);return a&&b?`${a.name} → ${b.name}`:''}).filter(Boolean).join(' · ')||'No flow links yet';updateMetrics()}$('floor').addEventListener('pointermove',e=>{if(!drag)return;const n=nodes.find(n=>n.id===drag.id);if(!n)return;const r=$('floor').getBoundingClientRect();n.x=Math.max(0,Math.min(1100-n.w,Math.round((drag.x+(e.clientX-drag.startX)*1100/r.width)/10)*10));n.y=Math.max(0,Math.min(700-n.h,Math.round((drag.y+(e.clientY-drag.startY)*700/r.height)/10)*10));render()});
function endDrag(){if(!drag)return;drag=null;properties();render();persist()}
$('floor').addEventListener('pointerup',endDrag);$('floor').addEventListener('pointercancel',endDrag);
function properties(){document.body?.classList.toggle("inspecting",selected!==null);let n=nodes.find(n=>n.id===selected);if(!n){$('properties').innerHTML='Select an object to edit its engineering parameters.';return}let html=`<div class="field"><label for="prop-name">Name</label><input id="prop-name" data-k="name" value="${escapeHtml(n.name)}"></div><div class="fieldrow"><div class="field"><label for="prop-x">X (meters)</label><input id="prop-x" data-k="x" type="number" value="${fmt(n.x/PX)}" step="0.5"></div><div class="field"><label for="prop-y">Y (meters)</label><input id="prop-y" data-k="y" type="number" value="${fmt(n.y/PX)}" step="0.5"></div></div><div class="fieldrow"><div class="field"><label for="prop-w">Width (m)</label><input id="prop-w" data-k="w" type="number" min="0.5" value="${fmt(n.w/PX)}" step="0.5"></div><div class="field"><label for="prop-h">Depth (m)</label><input id="prop-h" data-k="h" type="number" min="0.5" value="${fmt(n.h/PX)}" step="0.5"></div></div><div class="fieldrow"><div class="field"><label for="prop-count">Parallel machines</label><input id="prop-count" data-k="count" type="number" min="1" value="${n.count}"></div><div class="field"><label for="prop-ct">Cycle time (sec/unit)</label><input id="prop-ct" data-k="ct" type="number" min="1" value="${n.ct}"></div></div><div class="fieldrow"><div class="field"><label for="prop-delay">Hold / lag (minutes)</label><input id="prop-delay" data-k="delay" type="number" min="0" value="${n.delay}"></div><div class="field"><label for="prop-initial">Initial WIP (units)</label><input id="prop-initial" data-k="initial" type="number" min="0" value="${n.initial}"></div></div><div class="field"><label for="prop-capacity">Buffer capacity (0 = unlimited)</label><input id="prop-capacity" data-k="capacity" type="number" min="0" value="${n.capacity||0}"></div><div class="actions"><button onclick="duplicateSelected()">Duplicate</button><button onclick="deleteSelected()" style="color:#b83b3b">Delete</button></div><div class="section">Connected routes</div><div id="route-controls"></div><div class="hint" style="margin-top:10px">Changes update the layout immediately. Reset simulation to apply initial WIP changes.</div>`;$('properties').innerHTML=html;links.forEach((l,index)=>{if(l.from!==n.id&&l.to!==n.id)return;const a=nodes.find(x=>x.id===l.from),b=nodes.find(x=>x.id===l.to);const button=document.createElement('button');button.type='button';button.textContent='Remove '+a.name+' → '+b.name;button.style.marginBottom='6px';button.onclick=()=>removeRoute(index);$('route-controls').appendChild(button)});document.querySelectorAll('#properties [data-k]').forEach(i=>i.addEventListener('change',()=>{const k=i.dataset.k;let v=k==='name'?i.value.slice(0,100):Number(i.value);if(k!=='name'&&!Number.isFinite(v)){properties();return}if(k==='x'||k==='y')v*=PX;if(k==='w'||k==='h')v=Math.max(10,v*PX);if(k==='count'||k==='ct')v=Math.max(1,v);if(k==='delay'||k==='initial'||k==='capacity')v=Math.max(0,v);if(k==='count')v=Math.min(10000,Math.round(v));if(k==='ct')v=Math.min(86400,v);if(k==='delay')v=Math.min(100000,v);if(k==='capacity'||k==='initial')v=Math.min(1e9,v);n[k]=v;n.w=Math.min(1100,n.w);n.h=Math.min(700,n.h);n.x=Math.max(0,Math.min(1100-n.w,n.x));n.y=Math.max(0,Math.min(700-n.h,n.y));if(n.capacity)n.initial=Math.min(n.initial,n.capacity);resetSim();properties();persist()}))}function escapeHtml(s){return String(s).replace(/[&"<>]/g,c=>({'&':'&amp;','"':'&quot;','<':'&lt;','>':'&gt;'}[c]))}function duplicateSelected(){let n=nodes.find(n=>n.id===selected);if(!n)return;let o={...n,id:nextId++,x:Math.min(1100-n.w,n.x+30),y:Math.min(700-n.h,n.y+95),qty:0,processed:0,batches:[],accum:0};nodes.push(o);selected=o.id;resetSim();properties();persist()}function removeRoute(index){links.splice(index,1);resetSim();properties();persist()}
function deleteSelected(){nodes=nodes.filter(n=>n.id!==selected);links=links.filter(l=>l.from!==selected&&l.to!==selected);selected=null;resetSim();properties();persist()}$('floor').addEventListener('pointerdown',e=>{if(e.target.closest('.node'))return;if(!['machine','wip','station','conveyor'].includes(tool)){selected=null;properties();render();return}const svg=$('floor'),pt=svg.createSVGPoint();pt.x=e.clientX;pt.y=e.clientY;const p=pt.matrixTransform(svg.getScreenCTM().inverse());let x=Math.max(0,Math.round(p.x/10)*10),y=Math.max(0,Math.round(p.y/10)*10);let n=node(tool,({machine:'Machine',wip:'WIP Buffer',station:'Workstation',conveyor:'Conveyor'})[tool],x,y);n.x=Math.min(1100-n.w,n.x);n.y=Math.min(700-n.h,n.y);nodes.push(n);selected=n.id;setTool('select');resetSim();properties();persist()});function resetSim(){plantDispatched=0;running=false;clearInterval(clockId);$('play').textContent='▶ Run';$('state').textContent='Ready';simTime=0;completed=0;leadTotal=0;leadCount=0;transit=[];sourceRemainders={};nodes.forEach(n=>{n.qty=n.initial||0;n.processed=0;n.batches=[];if(n.qty)n.batches=[{qty:n.qty,born:0,ready:(n.delay||0)+(n.type==='machine'||n.type==='station'?n.ct/60:0)}];n.accum=0});render();drawParticles()}function toggleSim(){if(running){running=false;clearInterval(clockId);$('play').textContent='▶ Resume';$('state').textContent='Paused';return}if(simTime>=Number($('shift').value)*60)resetSim();running=true;$('play').textContent='Ⅱ Pause';$('state').textContent='Running';clockId=setInterval(()=>{const speed=Number($('speed').value)||6;for(let i=0;i<Math.max(1,Math.round(speed*10));i++)step(0.1);render();drawParticles();if(simTime>=Number($('shift').value)*60){toggleSim();$('state').textContent='Shift complete'}},110)}function addBatch(n,qty,born,ready){if(qty<=1e-9)return;n.batches.push({qty,born,ready});n.qty+=qty}function takeBatches(n,max,now){let remaining=max,out=[];for(const b of n.batches){if(remaining<=1e-9)break;if(b.ready>now)continue;const q=Math.min(remaining,b.qty);if(q>0){b.qty-=q;n.qty-=q;remaining-=q;out.push({qty:q,born:b.born})}}n.batches=n.batches.filter(b=>b.qty>1e-8);return out}function step(dt){
 const limit=Number($('shift').value)*60;if(simTime>=limit)return;dt=Math.min(dt,limit-simTime);const now=simTime+dt;
 const arrived=transit.filter(t=>t.arrive<=now+1e-9);transit=transit.filter(t=>t.arrive>now+1e-9);
 for(const t of arrived){const n=nodes.find(n=>n.id===t.to);if(n){addBatch(n,t.qty,t.born,t.arrive+(n.delay||0));if(isPlant4()&&n.type==='wip'&&!links.some(l=>l.from===n.id)){completed+=t.qty;leadTotal+=t.qty*(now-t.born);leadCount+=t.qty}}}
 function free(n){return n.capacity?Math.max(0,n.capacity-n.qty-transit.filter(t=>t.to===n.id).reduce((s,t)=>s+t.qty,0)):Infinity}
 for(const n of nodes){if(isPlant4()&&(!links.some(l=>l.from===n.id||l.to===n.id)||(n.type==='wip'&&!links.some(l=>l.from===n.id))))continue;
  const incoming=links.some(l=>l.to===n.id),outgoing=links.filter(l=>l.from===n.id);
  const rate=n.count*60/Math.max(1,n.ct);const passive=n.type==='wip'||n.type==='conveyor';
  if(!incoming&&!passive){const amount=Math.min(rate*dt,free(n));addBatch(n,amount,simTime,simTime+n.ct/60+(n.delay||0))}
  let max=passive?Infinity:rate*dt;
  for(const l of outgoing){const target=nodes.find(a=>a.id===l.to);if(target)max=Math.min(max,free(target)*outgoing.length)}
  const taken=takeBatches(n,max,now);
  for(const batch of taken){n.processed+=batch.qty;if(!outgoing.length){completed+=batch.qty;leadTotal+=batch.qty*(now-batch.born);leadCount+=batch.qty}
   else for(const l of outgoing){const target=nodes.find(a=>a.id===l.to);if(!target)continue;transit.push({from:n.id,to:l.to,qty:batch.qty/outgoing.length,born:batch.born,start:now,arrive:now+dist(n,target)/Math.max(1,Number($('transport').value)||30)+(target.type==='machine'||target.type==='station'?target.ct/60:0)})}}
 }
 simTime=now;
}
function drawParticles(){if(isPlant4()){drawPlantParticles();return;}const pg=$('particles');pg.replaceChildren();for(const t of transit){const a=nodes.find(n=>n.id===t.from),b=nodes.find(n=>n.id===t.to);if(!a||!b)continue;const p=xy(a),q=xy(b),f=Math.max(0,Math.min(1,(simTime-t.start)/Math.max(.01,t.arrive-t.start)));el('circle',{cx:p.x+(q.x-p.x)*f,cy:p.y+(q.y-p.y)*f,r:5,fill:'#e08a36',stroke:'white','stroke-width':1.5},pg)}}function updateMetrics(){let q=nodes.reduce((a,n)=>a+(n.qty||0),0)+transit.reduce((a,t)=>a+t.qty,0);$('m-time').textContent=fmt(simTime/60);$('m-wip').textContent=Math.round(q).toLocaleString();$('m-out').textContent=Math.round(completed).toLocaleString();$('m-lead').textContent=leadCount?fmt(leadTotal/leadCount):'—';let max=nodes.reduce((a,n)=>n.qty>a.qty?n:a,{qty:0,name:'—'});$('m-queue').textContent=max.name;$('m-distance').textContent=fmt(links.reduce((s,l)=>{let a=nodes.find(n=>n.id===l.from),b=nodes.find(n=>n.id===l.to);return s+(a&&b?dist(a,b):0)},0));$('clock').textContent='Simulation: '+String(Math.floor(simTime/60)).padStart(2,'0')+':'+String(Math.floor(simTime%60)).padStart(2,'0')}function saveProject(){const data={version:1,nodes:nodes.map(({batches,accum,...n})=>n),links,shift:$('shift').value,transport:$('transport').value};const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='factory-layout-project.json';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000)}function validateProject(d){
 if(!d||d.version!==1||!Array.isArray(d.nodes)||!Array.isArray(d.links)||d.nodes.length>500||d.links.length>1000)throw Error('Unsupported or invalid project format');
 const ids=new Set();const numeric=(v,min,max,label)=>{if(typeof v!=='number'||!Number.isFinite(v)||v<min||v>max)throw Error('Invalid '+label);return v};
 const clean=d.nodes.map(n=>{if(!n||!['machine','station','wip','conveyor'].includes(n.type)||typeof n.name!=='string'||n.name.length>100)throw Error('Invalid object');numeric(n.id,1,1e9,'ID');if(!Number.isInteger(n.id)||ids.has(n.id))throw Error('Duplicate or invalid ID');ids.add(n.id);
 const o={id:n.id,type:n.type,name:n.name};for(const [k,min,max] of [['x',0,1100],['y',0,700],['w',10,1100],['h',10,700],['count',1,10000],['ct',1,86400],['delay',0,100000],['initial',0,1e9],['capacity',0,1e9]])o[k]=numeric(n[k]??(k==='capacity'?0:undefined),min,max,k);
 if(o.x+o.w>1100||o.y+o.h>700)throw Error('Object outside floor');if(o.capacity&&o.initial>o.capacity)throw Error('Initial WIP exceeds capacity');return {...o,qty:0,processed:0,batches:[]}});
 const edges=new Set();const routes=d.links.map(l=>{if(!ids.has(l.from)||!ids.has(l.to)||l.from===l.to||edges.has(l.from+':'+l.to))throw Error('Invalid or duplicate route');edges.add(l.from+':'+l.to);return {from:l.from,to:l.to}});
 const shift=Number(d.shift),transport=Number(d.transport);numeric(shift,.1,24,'shift');numeric(transport,1,100000,'transport');return {version:1,plantScenario:Number.isInteger(d.plantScenario)&&d.plantScenario>=1&&d.plantScenario<=4?d.plantScenario:1,nodes:clean,links:routes,shift,transport};
}
function projectData(){return {version:1,plantScenario:typeof plantScenario==='number'?plantScenario:1,nodes:nodes.map(({batches,accum,qty,processed,...n})=>n),links,shift:Number($('shift').value),transport:Number($('transport').value)}}
function persist(){try{localStorage.setItem('factory-layout-v3',JSON.stringify(projectData()));$('save-status').textContent='Saved in this browser'}catch{$('save-status').textContent='Browser save unavailable — export JSON'}}
function applyProject(d){d=validateProject(d);plantScenario=d.plantScenario;nodes=d.nodes;links=d.links;nextId=Math.max(0,...nodes.map(n=>n.id))+1;$('shift').value=d.shift;$('transport').value=d.transport;selected=null;properties();resetSim()}
async function loadProject(e){const f=e.target.files[0];if(!f)return;try{if(f.size>2000000)throw Error('Project must be smaller than 2 MB');applyProject(JSON.parse(await f.text()));persist()}catch(err){alert('Unable to load project: '+err.message)}e.target.value=''}
function showText(){$('modal-action').textContent='Generate Editable Layout';$('modal-action').onclick=buildFromText;$('modal').classList.add('show');$('modal-title').textContent='Create a layout from text';$('modal-desc').textContent='Describe a sequence using commas or arrows. Example: Boarding 6 machines, WIP, Packing 4 tables, Dispatch. Boarding cycle time 60 seconds.';$('prompt').style.display='block';$('report').style.display='none';$('modal-action').style.display='inline-block'}function closeModal(){$('modal').classList.remove('show')}function buildFromText(){const raw=$('prompt').value;let head=raw.split(/[.!\n]/)[0];let parts=head.split(/\s*(?:,|→|->| then | followed by )\s*/i).map(s=>s.trim()).filter(Boolean);if(parts.length<2){alert('Please describe at least two operations separated by commas or arrows.');return}parts=parts.slice(0,12);nodes=[];links=[];nextId=1;parts.forEach((p,i)=>{const isWip=/wip|buffer|store|inventory/i.test(p),isConveyor=/conveyor/i.test(p),type=isWip?'wip':isConveyor?'conveyor':'machine';const countMatch=p.match(/\b(\d+)\s*(?:machines?|tables?|stations?|operators?)\b/i);const count=countMatch?Number(countMatch[1]):1;let name=p.replace(/\b\d+\s*(?:machines?|tables?|stations?|operators?)\b/ig,'').trim()||'Operation '+(i+1);let cycle=new RegExp(name.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'\\s+cycle\\s*time\\s*(\\d+)','i').exec(raw);let n=node(type,name,70+(i%4)*250,85+Math.floor(i/4)*175,{count,ct:cycle?Number(cycle[1]):60});nodes.push(n);if(i)links.push({from:nodes[i-1].id,to:n.id})});selected=null;properties();resetSim();persist();closeModal()}function showReport(){let report=`FACTORY LAYOUT ARCHITECT — ENGINEERING SUMMARY\n\nMODEL\nObjects: ${nodes.length}\nMaterial connections: ${links.length}\nTotal modeled route length: ${$('m-distance').textContent} m\nShift: ${$('shift').value} hours\n\nSIMULATION\nElapsed: ${fmt(simTime/60)} hours\nCompleted output: ${fmt(completed,0)} units\nTotal WIP (including in transit): ${$('m-wip').textContent} units\nAverage observed lead time: ${$('m-lead').textContent} min\n\nOPERATIONS\n`+nodes.map(n=>`${n.name} [${n.type}] | ${n.count} parallel | ${n.ct}s/unit | hold ${n.delay} min | current WIP ${fmt(n.qty,0)} | processed ${fmt(n.processed,0)}`).join('\n')+`\n\nIMPORTANT LIMITATIONS\nPrototype uses deterministic 0.1-minute-step processing, no stochastic downtime, no shift breaks, finite buffers with upstream blocking, no resource contention, and approximate center-to-center distances. It is not yet a validated discrete-event digital twin. Validate all engineering assumptions before operational decisions.`;$('modal').classList.add('show');$('modal-title').textContent='Engineering Report';$('modal-desc').textContent='Current scenario and simulation results. Copy or save this text for review.';$('prompt').style.display='none';$('report').style.display='block';$('report').textContent=report;$('modal-action').style.display='inline-block';$('modal-action').textContent='Download Report';$('modal-action').onclick=()=>{const a=document.createElement('a'),b=new Blob([report],{type:'text/plain'});a.href=URL.createObjectURL(b);a.download='factory-layout-report.txt';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000)}}seed();try{const saved=localStorage.getItem('factory-layout-v3');if(saved)applyProject(JSON.parse(saved))}catch{$('save-status').textContent='Saved project could not be restored'}
for(const id of ['shift','transport'])$(id).addEventListener('change',()=>{const input=$(id),v=Number(input.value);input.value=Number.isFinite(v)?Math.max(id==='shift'?.1:1,Math.min(id==='shift'?24:100000,v)):(id==='shift'?8:30);resetSim();persist()});
$('modal').addEventListener('click',e=>{if(e.target===$('modal'))closeModal()});document.addEventListener('keydown',e=>{if(e.key==='Escape')closeModal()});
function label(parent,x,y,text,size=12,color='#28445d',weight=500){const t=el('text',{x,y,'text-anchor':'middle','font-size':size,fill:color,'font-weight':weight},parent);t.textContent=text;return t}
function drawBuilding(){if($('floor-title'))$('floor-title').textContent=isTextile()?'Textile factory · Knitting / Processing / Finishing':'Production floor · Stock & lag demo';const b=$('building');if(!b)return;b.replaceChildren();
 el('rect',{x:20,y:28,width:1060,height:640,rx:12,fill:'#f8fafc',stroke:'#486478','stroke-width':5},b);
 for(let x=40;x<1080;x+=20)el('path',{d:'M'+x+' 32V664',stroke:'#e5ecf1','stroke-width':.6},b);
 for(let y=48;y<668;y+=20)el('path',{d:'M24 '+y+'H1076',stroke:'#e5ecf1','stroke-width':.6},b);
 if(isTextile()){drawTextileZones(b);return;}
 el('rect',{x:35,y:326,width:1030,height:72,fill:'#e5eaf0'},b);
 el('path',{d:'M40 362H1060',stroke:'#f3b936','stroke-width':3,'stroke-dasharray':'18 10'},b);
 label(b,550,352,'MATERIAL HANDLING AISLE · KEEP CLEAR',13,'#65788b',700);
 label(b,550,61,'FACTORY FLOOR — TOP VIEW',17,'#183850',800);
 label(b,170,102,'01  RECEIVING',13,'#8d6823',800);label(b,550,102,'02  CUTTING MACHINES',13,'#2069a4',800);label(b,930,102,'03  CURING BUFFER',13,'#8d6823',800);
 label(b,170,633,'06  DISPATCH',13,'#218066',800);label(b,550,633,'05  FINISHED STOCK',13,'#8d6823',800);label(b,930,633,'04  PACKING STATIONS',13,'#218066',800);
}
function drawEquipment(g,n,fill,stroke){
 // Scale the equipment illustration into its editable footprint.
 const c=el('g',{transform:'scale('+n.w/200+' '+n.h/160+')','pointer-events':'none'},g);
 el('rect',{x:0,y:0,width:200,height:160,rx:12,fill,stroke,'stroke-width':2},c);
 label(c,100,24,n.name,14,'#16344e',800);
 const isBuffer=n.type==='wip';
 if(isBuffer){
  for(let row=0;row<2;row++)for(let col=0;col<3;col++){
   const x=29+col*49,y=39+row*32;el('rect',{x,y,width:42,height:26,rx:2,fill:n.qty>0?'#d9a35f':'#f5ead7',stroke:'#a87b3f'},c);
   el('path',{d:'M'+(x+21)+' '+y+'v26M'+x+' '+(y+8)+'h42',stroke:'#b58649'},c);
   el('rect',{x:x-2,y:y+27,width:46,height:4,fill:'#8e6c45'},c);
  }
  label(c,100,123,Math.round(n.qty)+' units in stock',16,'#8e5f13',800);
  label(c,100,143,(n.delay? n.delay/60+' h hold':'Available stock')+(n.capacity?' · max '+n.capacity:''),11,'#886526',600);
 }else{
  const count=Math.min(4,Math.max(1,Math.round(n.count)));const width=145/count;
  for(let i=0;i<count;i++){const x=28+i*width;
   if(/knit/i.test(n.name)){
    el('rect',{x:x+3,y:77,width:width-13,height:25,rx:4,fill:'#408bb8',stroke:'#235c7f'},c);
    el('ellipse',{cx:x+(width-7)/2,cy:72,rx:(width-15)/2,ry:15,fill:'#b9dce7',stroke:'#235c7f','stroke-width':2},c);
    for(let j=0;j<6;j++)el('path',{d:'M'+(x+8+j*(width-22)/5)+' 67v-17',stroke:'#577a8d','stroke-width':1.7},c);
    el('path',{d:'M'+(x+width/2-8)+' 42l5-13h8l5 13Z',fill:'#d4a3cf',stroke:'#8b6494'},c);
   }else if(/dye|wash/i.test(n.name)){
    el('rect',{x,y:43,width:width-7,height:60,rx:7,fill:'#8e9dd0',stroke:'#546395'},c);
    el('circle',{cx:x+(width-7)/2,cy:72,r:Math.min(23,(width-17)/2),fill:'#d5e5f3',stroke:'#546395','stroke-width':4},c);
    el('path',{d:'M'+(x+8)+' 76h'+(width-23),stroke:'#548ecb','stroke-width':4},c);
   }else if(/finish|dryer/i.test(n.name)){
    el('rect',{x,y:46,width:width-7,height:53,rx:5,fill:'#45a587',stroke:'#22765e'},c);
    for(let j=0;j<3;j++)el('rect',{x:x+5,y:52+j*14,width:width-17,height:9,rx:4,fill:'#ccece0',stroke:'#22765e'},c);
   }else{
   el('rect',{x,y:44,width:width-7,height:48,rx:4,fill:n.type==='station'?'#43a884':'#3b82b4',stroke:'#1b567a'},c);
   el('rect',{x:x+6,y:50,width:width-19,height:22,rx:2,fill:'#c8e9f2',stroke:'#245a75'},c);
   el('circle',{cx:x+10,cy:82,r:3,fill:running?'#93eea9':'#f9c95d'},c);
   el('rect',{x:x+5,y:94,width:6,height:10,fill:'#496574'},c);el('rect',{x:x+width-18,y:94,width:6,height:10,fill:'#496574'},c);
   }
  }
  label(c,100,123,n.count+' machines · '+n.ct+' sec/unit',12,'#245b7a',800);
  label(c,100,143,Math.round(n.qty)+' units at station · '+Math.floor(n.processed)+' processed',11,'#486b7e',600);if(n.delay)label(c,100,156,(n.delay/60)+' h process hold',10,'#815b9d',700);
 }
}
function loadFactoryDemo(){
 nextId=1;nodes=[
 node('wip','Raw stock',70,130,{w:200,h:160,initial:240,capacity:240}),
 node('machine','Cutting',450,130,{w:200,h:160,count:2,ct:60,capacity:30}),
 node('wip','Curing buffer',830,130,{w:200,h:160,delay:60,capacity:120}),
 node('station','Packing',830,440,{w:200,h:160,count:2,ct:90,capacity:30}),
 node('wip','Finished stock',450,440,{w:200,h:160,delay:30,capacity:80}),
 node('station','Dispatch',70,440,{w:200,h:160,count:2,ct:30,capacity:20})
 ];links=nodes.slice(1).map((n,i)=>({from:nodes[i].id,to:n.id}));selected=null;$('shift').value=4;$('transport').value=15;$('speed').value=1;properties();resetSim();persist();
}

if(typeof localStorage!=='undefined'){try{if(!localStorage.getItem('factory-layout-v3'))loadFactoryDemo()}catch{}}

function isTextile(){return nodes.some(n=>/knitting/i.test(n.name))&&nodes.some(n=>/dyeing/i.test(n.name))}
function drawTextileZones(b){
 const zones=[{x:38,c:'#edf5fc',title:'01  KNITTING HALL',sub:'YARN → KNITTING → GREIGE STOCK'},{x:418,c:'#f1eef9',title:'02  PROCESSING',sub:'DYEING / WASH → DRYING → HOLD'},{x:798,c:'#edf8f2',title:'03  FINISHING',sub:'FINISH / INSPECT → STOCK → DISPATCH'}];
 for(const z of zones){el('rect',{x:z.x,y:72,width:264,height:565,rx:8,fill:z.c,stroke:'#cbd9e4','stroke-dasharray':'5 4'},b);label(b,z.x+132,92,z.title,15,'#214760',800);label(b,z.x+132,653,z.sub,9,'#627b8c',700)}
 for(const x of [340,720]){el('rect',{x,y:72,width:40,height:565,fill:'#e1e7ed'},b);el('path',{d:'M'+(x+20)+' 78V632',stroke:'#e3b43a','stroke-width':2,'stroke-dasharray':'12 9'},b)}
 label(b,550,56,'TEXTILE FACTORY — MATERIAL FLOW LAYOUT',17,'#183850',800);
}
function loadTextileDemo(){
 nextId=1;nodes=[
 node('wip','Yarn stock',70,112,{w:200,h:140,initial:240,capacity:240}),
 node('machine','Circular knitting',70,297,{w:200,h:140,count:4,ct:120,capacity:24}),
 node('wip','Greige buffer',70,482,{w:200,h:140,delay:30,capacity:60}),
 node('machine','Dyeing & washing',450,482,{w:200,h:140,count:2,ct:180,delay:60,capacity:36}),
 node('machine','Hydro / dryer',450,297,{w:200,h:140,count:2,ct:120,delay:15,capacity:24}),
 node('wip','Processed buffer',450,112,{w:200,h:140,delay:30,capacity:48}),
 node('machine','Finishing / inspect',830,112,{w:200,h:140,count:3,ct:120,capacity:24}),
 node('wip','Finished stock',830,297,{w:200,h:140,delay:15,capacity:60}),
 node('station','Pack & dispatch',830,482,{w:200,h:140,count:2,ct:90,capacity:24})
 ];links=nodes.slice(1).map((n,i)=>({from:nodes[i].id,to:n.id}));selected=null;$('shift').value=8;$('transport').value=20;$('speed').value=.3;properties();resetSim();persist();
}

function isPlant4(){return nodes.some(n=>n.name==='Triveneta dryer')&&nodes.some(n=>n.name==='HS Ghibli')}
function render(){const plant=isPlant4();if($('plant-controls'))$('plant-controls').style.display=plant?'block':'none';if($('plant-activity'))$('plant-activity').style.display=plant?'block':'none';if(!plant){renderLegacy();return}renderPlant4()}
function loadPlant4(){nextId=1;nodes=[
 node('machine','Knitting line 5',210,65,{w:180,h:172,count:2,ct:180,capacity:20}),
 node('machine','Knitting line 6',425,65,{w:180,h:172,count:2,ct:180,capacity:20}),
 node('machine','Knitting line 7',640,65,{w:180,h:172,count:2,ct:180,capacity:20}),
 node('machine','Knitting line 8',855,65,{w:180,h:172,count:2,ct:180,capacity:20}),
 node('wip','Unassorted area',210,285,{w:240,h:105,initial:8,capacity:80,delay:60}),
 node('wip','Short cartons',485,285,{w:205,h:105,initial:5,capacity:60}),
 node('wip','Leftover rack',725,285,{w:310,h:105,initial:13,capacity:100}),
 node('machine','Triveneta dryer',875,480,{w:160,h:140,count:1,ct:90,delay:15,capacity:24}),
 node('machine','HS Ghibli',600,510,{w:230,h:110,count:1,ct:90,capacity:20}),
 node('station','Packing table',395,510,{w:160,h:110,count:2,ct:120,capacity:24}),
 node('wip','Complete carton',215,510,{w:130,h:110,initial:0,capacity:100})
 ];$('shift').value=8;$('transport').value=20;$('speed').value=.3;selected=null;selectPlantRoute(1);properties()}
function selectPlantRoute(s){plantScenario=s;if(!isPlant4()){loadPlant4();plantScenario=s}const id=name=>nodes.find(n=>n.name===name).id;const source=s===2?id('Unassorted area'):id('Triveneta dryer');links=nodes.filter(n=>/^Knitting line/.test(n.name)).map(n=>({from:n.id,to:source}));
 if(s===2)links.push({from:id('Unassorted area'),to:id('Triveneta dryer')});
 links.push({from:id('Triveneta dryer'),to:id('HS Ghibli')},{from:id('HS Ghibli'),to:id('Packing table')},{from:id('Packing table'),to:id(s===3?'Short cartons':'Complete carton')});
 if(s===4)links.push({from:id('Complete carton'),to:id('Leftover rack')});
 nodes.find(n=>n.name==='Complete carton').delay=s===4?30:0;selected=null;properties();resetSim();persist()}
function plantColor(){return ['#1687c4','#ec8b23','#647787','#9b58d4'][plantScenario-1]||'#1687c4'}
function pathLength(points){let d=0;for(let i=1;i<points.length;i++)d+=Math.hypot(points[i].x-points[i-1].x,points[i].y-points[i-1].y);return d}
function plantRoutePoints(a,b){const p=xy(a),q=xy(b),P=(x,y)=>({x,y});
 if(/^Knitting line/.test(a.name)){return [P(p.x,a.y+a.h),P(p.x,250),P(150,250),P(150,425),P(q.x,425),P(q.x,b.type==='wip'?b.y+b.h:b.y)]}
 if(a.name==='Unassorted area')return [P(p.x,a.y+a.h),P(p.x,425),P(q.x,425),P(q.x,b.y)];
 if(a.name==='Triveneta dryer'||a.name==='HS Ghibli')return [P(a.x,p.y),P(b.x+b.w,p.y),P(b.x+b.w,q.y)];
 if(a.name==='Packing table'&&b.name==='Complete carton')return [P(a.x,p.y),P(b.x+b.w,q.y)];
 if(a.name==='Packing table')return [P(p.x,a.y),P(p.x,425),P(q.x,425),P(q.x,b.y+b.h)];
 if(a.name==='Complete carton')return [P(p.x,a.y),P(p.x,425),P(q.x,425),P(q.x,b.y+b.h)];
 return [p,q];
}
function plantText(parent,x,y,text,size=11,color='#34526a',weight=600){return label(parent,x,y,text,size,color,weight)}
function renderPlant4(){if($('plant-play'))$('plant-play').textContent=running?'Ⅱ Pause simulation':'▶ Run simulation';const b=$('building'),eg=$('edges'),og=$('objects');b.replaceChildren();eg.replaceChildren();og.replaceChildren();
 $('floor-title').textContent='PLANT 4 · MATERIAL FLOW / EQUIPMENT LAYOUT';
 el('rect',{x:16,y:16,width:1068,height:668,rx:4,fill:'#f4f5f4',stroke:'#465c70','stroke-width':5},b);
 for(let x=30;x<1080;x+=20)el('path',{d:'M'+x+' 20V680',stroke:'#dfe5e7','stroke-width':.5},b);
 for(let y=36;y<680;y+=20)el('path',{d:'M20 '+y+'H1080',stroke:'#dfe5e7','stroke-width':.5},b);
 el('rect',{x:195,y:47,width:855,height:205,fill:'#e7eff5',stroke:'#b5c7d6'},b);
 el('rect',{x:120,y:45,width:61,height:596,fill:'#ffe774'},b);el('rect',{x:120,y:401,width:930,height:48,fill:'#ffe774'},b);
 el('path',{d:'M126 54V636M175 54V398M181 405H1045M181 445H1045',fill:'none',stroke:'#c99425','stroke-width':2,'stroke-dasharray':'9 6'},b);
 el('path',{d:'M190 263H1050',stroke:'#607486','stroke-width':7},b);
 plantText(b,620,277,'KNITTING BOUNDARY WALL',11,'#3f5363',800);
 plantText(b,620,432,'MATERIAL MOVEMENT AISLE',12,'#6a531c',800);
 const side=el('text',{x:74,y:375,transform:'rotate(-90 74 375)','text-anchor':'middle','font-size':13,'font-weight':800,fill:'#6d5921'},b);side.textContent='CENTRAL AISLE · KNITTING ENTRANCE / EXIT';
 plantText(b,620,38,'KNITTING HALL · LINES 5–8',17,'#173950',800);
 plantText(b,620,666,['FLOW 1 · DIRECT PRODUCTION → COMPLETE CARTON','FLOW 2 · UNASSORTED BATCH → HOLD → COMPLETE CARTON','FLOW 3 · DIRECT PRODUCTION → SHORT CARTON AREA','FLOW 4 · COMPLETE CARTON → ORDER CLOSE → LEFTOVER RACK'][plantScenario-1],12,plantColor(),800);
 const defs=el('defs',{},eg),marker=el('marker',{id:'plant-arrow',markerWidth:7,markerHeight:7,refX:6,refY:3.5,orient:'auto',markerUnits:'strokeWidth'},defs);el('path',{d:'M0 0L7 3.5L0 7Z',fill:plantColor()},marker);
 links.forEach(l=>{const a=nodes.find(n=>n.id===l.from),d=nodes.find(n=>n.id===l.to);if(!a||!d)return;const pts=plantRoutePoints(a,d),data=pts.map((p,i)=>(i?'L':'M')+p.x+' '+p.y).join(' ');el('path',{d:data,fill:'none',stroke:'white','stroke-width':8,'stroke-linejoin':'round'},eg);el('path',{d:data,fill:'none',stroke:plantColor(),'stroke-width':3.5,'stroke-linejoin':'round',class:running&&transit.some(t=>t.from===l.from&&t.to===l.to)?'route-moving':'','marker-end':'url(#plant-arrow)'},eg)});
 nodes.forEach(n=>{const g=el('g',{class:'node'+(selected===n.id?' selected':''),transform:'translate('+n.x+','+n.y+')','data-id':n.id,role:'button','aria-label':n.name},og);drawPlantEquipment(g,n);g.addEventListener('pointerdown',e=>{e.stopPropagation();if(tool==='connect'){if(connectStart===null){connectStart=n.id}else if(connectStart!==n.id){if(!links.some(l=>l.from===connectStart&&l.to===n.id))links.push({from:connectStart,to:n.id});connectStart=null;resetSim();persist()}}selected=n.id;properties();if(tool==='select'){drag={id:n.id,startX:e.clientX,startY:e.clientY,x:n.x,y:n.y};$('floor').setPointerCapture(e.pointerId)}render()})});
 $('flowlist').textContent='Select a route above the floor. Orange dots show moving material; stocks and holds update during the simulation.';
 if(typeof document.querySelectorAll==='function')document.querySelectorAll('.plant-routes button').forEach((button,i)=>button.classList.toggle('active',i===plantScenario-1));updateMetrics();updatePlantActivity();
}
function drawPlantEquipment(g,n){const w=n.w,h=n.h;const knitting=/^Knitting/.test(n.name),stock=n.type==='wip';
 el('rect',{width:w,height:h,rx:3,fill:stock?'#fff7e3':knitting?'#e9f1f8':'#e4f0f5',stroke:selected===n.id?'#ec932b':stock?'#c59a52':'#6c94ad','stroke-width':selected===n.id?3:1.5},g);
 plantText(g,w/2,16,n.name,knitting?13:12,'#183950',800);
 if(knitting){
  for(let i=0;i<2;i++){const x=43+i*88;el('rect',{x:x-25,y:58,width:50,height:67,rx:6,fill:'#4788ad',stroke:'#275e7d'},g);el('ellipse',{cx:x,cy:68,rx:29,ry:17,fill:'#c6d9df',stroke:'#3b6579','stroke-width':2},g);
   for(let k=0;k<10;k++){const angle=k*Math.PI/5,xx=x+Math.cos(angle)*28,yy=56+Math.sin(angle)*14;el('path',{d:'M'+xx+' '+yy+'v-21',stroke:'#6c7f8b','stroke-width':1.4},g);el('path',{d:'M'+(xx-4)+' '+(yy-21)+'l2-9h4l2 9Z',fill:['#e8d5ba','#c6dfdf','#dac5da'][k%3],stroke:'#a7a29c','stroke-width':.7},g)}
   el('rect',{x:x-18,y:87,width:36,height:28,rx:3,fill:'#c0dde8'},g);el('circle',{cx:x+15,cy:120,r:3,fill:running?'#4acb8d':'#e9b83c'},g);
  }
  plantText(g,w/2,h-27,n.count+' machines · '+n.ct+' s/unit',10,'#335a70');plantText(g,w/2,h-11,Math.floor(n.qty)+' queued · '+Math.floor(n.processed)+' processed',10,'#335a70');
 }else if(stock){
  const refs={'Unassorted area':'REFERENCE: 8 TROLLEYS','Short cartons':'REFERENCE: 5 PALLETS','Leftover rack':'REFERENCE: 13 CARTONS / 11 TROLLEYS'};if(refs[n.name])plantText(g,w/2,27,refs[n.name],8,'#7f6a40',700);
  const slots=n.name==='Unassorted area'?8:n.name==='Short cartons'?5:n.name==='Leftover rack'?11:3;const gap=(w-18)/slots;
  for(let i=0;i<slots;i++){const x=10+i*gap,ww=gap-4,y=29,hh=h-58;
   if(n.name==='Short cartons'||n.name==='Complete carton'){for(let row=0;row<3;row++)el('rect',{x,y:y+row*hh/3,width:ww,height:hh/3-2,fill:n.qty?'#d4a76d':'#ede2cc',stroke:'#a98450','stroke-width':.7},g);el('rect',{x:x-1,y:y+hh,width:ww+2,height:4,fill:'#55748f'},g)}
   else{el('rect',{x,y,width:ww,height:hh,fill:'#e5e9e6',stroke:'#617785','stroke-width':1.4},g);for(let row=0;row<3;row++)for(let col=0;col<2;col++)el('circle',{cx:x+ww*(col+.5)/2,cy:y+hh*(row+.5)/3,r:Math.min(ww/5,5),fill:n.qty?'#c7a27d':'#f7f5ed',stroke:'#9b846a','stroke-width':.6},g);el('circle',{cx:x+3,cy:y+hh+3,r:2,fill:'#486477'},g);el('circle',{cx:x+ww-3,cy:y+hh+3,r:2,fill:'#486477'},g)}
  }
  plantText(g,w/2,h-12,Math.round(n.qty)+' units'+(n.delay?' · '+n.delay/60+' h hold':''),11,'#8b601c',800);
 }else if(n.name==='Triveneta dryer'){
  el('rect',{x:12,y:29,width:w-24,height:77,rx:6,fill:'#4192c0',stroke:'#246786','stroke-width':2},g);for(const x of [w*.34,w*.67]){el('circle',{cx:x,cy:65,r:24,fill:'#d6dfe0',stroke:'#466578','stroke-width':3},g);el('circle',{cx:x,cy:65,r:15,fill:'#426375'},g)}el('path',{d:'M22 28V20H'+(w-25)+'V28',fill:'none',stroke:'#7896a7','stroke-width':5},g);plantText(g,w/2,h-18,'PROCESSING · '+n.delay/60+' h lag',10,'#295b78',800);plantText(g,w/2,h-5,Math.floor(n.qty)+' queued · '+Math.floor(n.processed)+' processed',9,'#295b78');
 }else if(n.name==='HS Ghibli'){
  el('rect',{x:9,y:38,width:w-18,height:38,fill:'#487d99',stroke:'#2b566f'},g);for(let i=0;i<9;i++)el('rect',{x:15+i*(w-30)/9,y:43,width:12,height:28,rx:5,fill:'#c4d8df',stroke:'#476a7d'},g);el('path',{d:'M24 36V26H'+(w-24)+'V36',fill:'none',stroke:'#7896a7','stroke-width':5},g);plantText(g,w/2,h-17,'FINISHING · '+n.ct+' s/unit',10,'#295b78',800);plantText(g,w/2,h-4,Math.floor(n.qty)+' queued · '+Math.floor(n.processed)+' processed',9,'#295b78');
 }else{
  el('rect',{x:16,y:39,width:w-32,height:30,rx:3,fill:'#e4d6bb',stroke:'#7c8d93','stroke-width':2},g);for(const x of [26,w-26]){el('circle',{cx:x,cy:31,r:7,fill:'#397cb0'},g);el('circle',{cx:x,cy:79,r:7,fill:'#397cb0'},g)}plantText(g,w/2,h-17,'PACKING · '+n.count+' operators',10,'#295b78',800);plantText(g,w/2,h-4,Math.floor(n.qty)+' queued · '+Math.floor(n.processed)+' processed',9,'#295b78');
 }
}
function drawPlantParticles(){const pg=$('particles');pg.replaceChildren();for(const t of transit){const a=nodes.find(n=>n.id===t.from),b=nodes.find(n=>n.id===t.to);if(!a||!b)continue;const pts=plantRoutePoints(a,b),len=pathLength(pts);let remaining=len*Math.max(0,Math.min(1,(simTime-t.start)/Math.max(.01,t.arrive-t.start)));for(let i=1;i<pts.length;i++){const p=pts[i-1],q=pts[i],d=Math.hypot(q.x-p.x,q.y-p.y);if(remaining<=d||i===pts.length-1){const f=d?Math.min(1,remaining/d):0;const x=p.x+(q.x-p.x)*f,y=p.y+(q.y-p.y)*f;const cart=el('g',{transform:'translate('+x+','+y+')'},pg);el('rect',{x:-9,y:-7,width:18,height:14,rx:3,fill:'#ee8a1b',stroke:'white','stroke-width':2},cart);el('path',{d:'M-5 -5V5M0 -5V5M5 -5V5',stroke:'#ffd9a5','stroke-width':1},cart);el('circle',{cx:-5,cy:9,r:2,fill:'#31475a'},cart);el('circle',{cx:5,cy:9,r:2,fill:'#31475a'},cart);break}remaining-=d}}}

if(typeof location!=='undefined'&&new URLSearchParams(location.search).get('layout')==='plant4')loadPlant4();

function plantActivity(){
 const sinks=nodes.filter(n=>n.type==='wip'&&links.some(l=>l.to===n.id)&&!links.some(l=>l.from===n.id));
 const full=sinks.find(n=>n.capacity&&n.qty+transit.filter(t=>t.to===n.id).reduce((s,t)=>s+t.qty,0)>=n.capacity-1e-6);
 const summary='Output received: '+Math.floor(completed)+' · Dispatched: '+Math.floor(plantDispatched)+' · Transfers moving: '+transit.length;
 if(full)return {kind:'blocked',title:'BLOCKED — '+full.name+' is full ('+Math.round(full.qty)+' / '+full.capacity+').',detail:'Click “Dispatch finished stock” to make room. '+summary};
 if(!running)return {kind:'paused',title:simTime?'PAUSED / SHIFT FINISHED':'READY — click Run simulation.',detail:summary};
 if(transit.length)return {kind:'moving',title:'MATERIAL MOVING — follow the orange trolley markers.',detail:summary};
 const held=nodes.filter(n=>n.delay&&links.some(l=>l.from===n.id)).flatMap(n=>(n.batches||[]).filter(b=>b.ready>simTime).map(b=>({name:n.name,wait:b.ready-simTime}))).sort((a,b)=>a.wait-b.wait)[0];
 return {kind:'waiting',title:held?'PROCESS HOLD — '+held.name+' releases material in '+fmt(held.wait)+' simulated minutes.':'PROCESSING — the simulation clock is advancing.',detail:summary};
}
function updatePlantActivity(){const el=$('plant-activity');if(!el)return;const s=plantActivity();el.className='plant-activity '+s.kind;el.replaceChildren();const title=document.createElement('strong');title.textContent=s.title;el.appendChild(title);const detail=document.createElement('span');detail.textContent=s.detail;el.appendChild(detail)}
function dispatchPlantStock(){if(!isPlant4())return;const sinks=nodes.filter(n=>n.type==='wip'&&links.some(l=>l.to===n.id)&&!links.some(l=>l.from===n.id));for(const n of sinks){plantDispatched+=n.qty;n.qty=0;n.batches=[]}render();drawParticles()}
