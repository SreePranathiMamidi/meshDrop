// Run from the meshdrop folder (the one with package.json):  node patch.mjs
import fs from 'fs';
const edit = (file, pairs) => {
  let s = fs.readFileSync(file, 'utf8');
  for (const [a, b] of pairs) {
    const n = s.split(a).length - 1;
    if (n !== 1) { console.log('FAILED (found ' + n + ' times) in ' + file + ': ' + a.slice(0, 60)); process.exit(1); }
    s = s.split(a).join(b);
  }
  fs.writeFileSync(file, s); console.log('patched ' + file);
};
edit('public/index.html', [
 ["const send=(p,m)=>p.dc?.readyState=='open'&&p.dc.send(JSON.stringify(m));",
  "const ready=p=>p.dc?.readyState=='open'||p.rl;const raw=(p,d)=>{if(p.dc?.readyState=='open')return p.dc.send(d);if(typeof d=='string')return ws.send(JSON.stringify({t:'r',to:p.id,d}));const id=new TextEncoder().encode(p.id),f=new Uint8Array(1+id.length+d.byteLength);f[0]=id.length;f.set(id,1);f.set(new Uint8Array(d),1+id.length);ws.send(f)};const send=(p,m)=>ready(p)&&raw(p,JSON.stringify(m));const greet=p=>{send(p,{t:'hi',name:myName,os,br,pin});for(const f of files.values()){send(p,{t:'man',m:f.m});send(p,{t:'have',f:f.m.id,a:[...f.mine]})}ui()};"],
 ["dc.onopen=()=>{send(p,{t:'hi',name:myName,os,br,pin});for(const f of files.values()){send(p,{t:'man',m:f.m});send(p,{t:'have',f:f.m.id,a:[...f.mine]})}ui()};",
  "dc.onopen=()=>greet(p);"],
 ["else pc.ondatachannel=e=>setup(e.channel);",
  "else pc.ondatachannel=e=>setup(e.channel);setTimeout(()=>{if(peers[id]===p&&!ready(p)){p.rl=true;log('Direct link failed, using server relay for '+id);greet(p)}},6000);"],
 ["if(!r||p.dc?.readyState!='open')return;const dc=p.dc,n=r.ct.byteLength;",
  "if(!r||!ready(p))return;const n=r.ct.byteLength;"],
 ["for(let o=0;o<n;o+=FR){if(dc.bufferedAmount>1<<20)await new Promise(x=>dc.addEventListener('bufferedamountlow',x,{once:true}));dc.send(r.ct.slice(o,o+FR))}}",
  "for(let o=0;o<n;o+=FR){while((p.dc?.readyState=='open'?p.dc:ws).bufferedAmount>1<<20)await new Promise(x=>setTimeout(x,10));if(!ready(p))return;raw(p,r.ct.slice(o,o+FR))}}"],
 ["if(p.blocked||p.bad>=3||p.dc?.readyState!='open')continue;",
  "if(p.blocked||p.bad>=3||!ready(p))continue;"],
 ["const open=Object.values(peers).filter(p=>p.dc?.readyState=='open').length,",
  "const open=Object.values(peers).filter(ready).length,"],
 ["const live=Object.values(peers).filter(p=>!p.blocked&&p.dc?.readyState=='open');",
  "const live=Object.values(peers).filter(p=>!p.blocked&&ready(p));"],
 ["<span class=\"b\">WebRTC</span>",
  "<span class=\"b\">${p.dc?.readyState=='open'?'WebRTC direct':p.rl?'via server relay':'connecting…'}</span>"],
 ["<span class=\"b\">${p.blocked?'link cut':'linked'}</span>",
  "<span class=\"b\">${p.blocked?'link cut':ready(p)?'linked':'connecting'}</span>"],
 ["ws=new WebSocket('wss://'+location.host+'/ws?room='+room);",
  "ws=new WebSocket('wss://'+location.host+'/ws?room='+room);ws.binaryType='arraybuffer';"],
 ["ws.onmessage=async e=>{const m=JSON.parse(e.data);",
  "ws.onmessage=async e=>{if(typeof e.data!='string'){const u=new Uint8Array(e.data),L=u[0],p=peers[new TextDecoder().decode(u.slice(1,1+L))];if(p){p.rl=true;onMsg(p,e.data.slice(1+L))}return}const m=JSON.parse(e.data);if(m.t=='r'){const p=peers[m.from];if(p){p.rl=true;onMsg(p,m.d)}return}if(m.t=='left'){const p=peers[m.id];if(p&&p.dc?.readyState!='open'){unlink(p);delete peers[m.id];ui();pump()}return}"],
]);
edit('server.js', [
 ["ws.on('message', m => { try { const d = JSON.parse(m); set.get(d.to)?.send(JSON.stringify({ ...d, from: id })); } catch {} });",
  "ws.on('message', (m, isBin) => { try { if (isBin) { const L = m[0], t = set.get(m.subarray(1, 1 + L).toString()); if (t) { const me = Buffer.from(id); t.send(Buffer.concat([Buffer.from([me.length]), me, m.subarray(1 + L)]), { binary: true }); } return; } const d = JSON.parse(m); set.get(d.to)?.send(JSON.stringify({ ...d, from: id })); } catch {} });"],
 ["ws.on('close', () => set.delete(id));",
  "ws.on('close', () => { set.delete(id); set.forEach(w => { try { w.send(JSON.stringify({ t: 'left', id })); } catch {} }); });"],
]);
console.log('Done. Restart with: npm start');
