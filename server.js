import express from 'express'; import https from 'https'; import http from 'http'; import os from 'os';
import { WebSocketServer } from 'ws'; import selfsigned from 'selfsigned'; import QRCode from 'qrcode';
const PORT = process.env.PORT || 3000;
const lan = () => Object.values(os.networkInterfaces()).flat().filter(i => !i.address.startsWith('192.168.56.')).find(i => i.family === 'IPv4' && !i.internal)?.address || 'localhost';
const app = express(); app.use(express.static('public'));
app.get('/ip', (q, r) => r.json({ ip: lan() }));
app.get('/qr', async (q, r) => r.type('png').send(await QRCode.toBuffer(String(q.query.u), { width: 240 })));
const pems = selfsigned.generate([{ name: 'commonName', value: 'meshdrop.local' }], { days: 365, keySize: 2048 });
// On hosts like Render/Railway the platform provides HTTPS, so set PLAIN_HTTP=1 there. Locally we serve our own self-signed HTTPS.
const srv = process.env.PLAIN_HTTP ? http.createServer(app) : https.createServer({ key: pems.private, cert: pems.cert }, app);
// Signaling + fallback relay: passes WebRTC offers/answers/ICE between peers in a room, and relays data
// (text as JSON {t:'r',to,d}, binary as [idLen][toId][payload]) only when a direct WebRTC link cannot open.
const wss = new WebSocketServer({ server: srv, path: '/ws' }); const rooms = new Map(); let n = 0;
wss.on('connection', (ws, req) => {
  const room = new URL(req.url, 'http://x').searchParams.get('room') || '';
  if (!rooms.has(room)) rooms.set(room, new Map()); const set = rooms.get(room); const id = 'p' + (++n);
  ws.send(JSON.stringify({ t: 'hello', id, peers: [...set.keys()] })); set.set(id, ws);
  ws.on('message', (m, isBin) => { try {
    if (isBin) { const L = m[0], t = set.get(m.subarray(1, 1 + L).toString()); if (t) { const me = Buffer.from(id); t.send(Buffer.concat([Buffer.from([me.length]), me, m.subarray(1 + L)]), { binary: true }); } return; }
    const d = JSON.parse(m); set.get(d.to)?.send(JSON.stringify({ ...d, from: id }));
  } catch {} });
  ws.on('close', () => { set.delete(id); set.forEach(w => { try { w.send(JSON.stringify({ t: 'left', id })); } catch {} }); });
});
srv.listen(PORT, '0.0.0.0', () => console.log(`MeshDrop running: ${process.env.PLAIN_HTTP ? 'http' : 'https'}://${lan()}:${PORT}  (accept the self-signed cert warning)`));
