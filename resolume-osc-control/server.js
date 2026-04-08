const express = require('express');
const http = require('http');
const { WebSocketServer } = require('ws');
const osc = require('osc');
const path = require('path');
const fs = require('fs');

const CFG = path.join(__dirname, 'config.json');
const load = () => JSON.parse(fs.readFileSync(CFG, 'utf8'));
const save = c => fs.writeFileSync(CFG, JSON.stringify(c, null, 2), 'utf8');
let cfg = load();

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.get('/api/config', (_, r) => { cfg = load(); r.json(cfg); });
app.post('/api/config', (q, r) => {
  try { save(q.body); cfg = q.body; bcast({ type: 'reload' }); r.json({ ok: 1 }); }
  catch (e) { r.status(500).json({ error: e.message }); }
});

const server = http.createServer(app);
const wss = new WebSocketServer({ server });
const cls = new Set();
const bcast = d => { const j = JSON.stringify(d); for (const c of cls) if (c.readyState === 1) c.send(j); };
const valueStore = {};

wss.on('connection', ws => {
  cls.add(ws);
  ws.send(JSON.stringify({ type: 'midi_ports', ports: getMidiPorts() }));
  ws.send(JSON.stringify({ type: 'midi_status', connected: !!midiOut, port: cfg.midi?.outputPort || '' }));
  ws.on('message', raw => {
    try {
      const m = JSON.parse(raw);
      if (m.type === 'osc') { tx(m.address, m.value); checkMidiMap(m.address, m.value); }
      if (m.type === 'smooth') startSmooth(m.address, m.from, m.to, m.duration || 500);
      if (m.type === 'value_update') { valueStore[m.id] = m.value; processCombined(); }
      if (m.type === 'midi_select') selectMidiPort(m.port);
    } catch {}
  });
  ws.on('close', () => cls.delete(ws));
});

// ─── PRESETS ─────────────────────────────────
const PD = path.join(__dirname, 'presets');
if (!fs.existsSync(PD)) fs.mkdirSync(PD);
app.get('/api/presets', (_, r) => { try { r.json(fs.readdirSync(PD).filter(f=>f.endsWith('.json')).map(f=>f.replace('.json',''))); } catch{r.json([]);} });
app.post('/api/presets/:n', (q, r) => { try { const n=q.params.n.replace(/[^a-zA-Z0-9_-]/g,''); fs.writeFileSync(path.join(PD,n+'.json'),JSON.stringify(q.body,null,2)); r.json({ok:1}); } catch(e){r.status(500).json({error:e.message});} });
app.get('/api/presets/:n', (q, r) => { try { const n=q.params.n.replace(/[^a-zA-Z0-9_-]/g,''); r.json(JSON.parse(fs.readFileSync(path.join(PD,n+'.json'),'utf8'))); } catch{r.status(404).json({error:'Not found'});} });
app.delete('/api/presets/:n', (q, r) => { try { const n=q.params.n.replace(/[^a-zA-Z0-9_-]/g,''); fs.unlinkSync(path.join(PD,n+'.json')); r.json({ok:1}); } catch{r.status(404).json({error:'Not found'});} });

// ─── MIDI ────────────────────────────────────
let JZZ, jzzEngine = null, midiOut = null;
try { JZZ = require('jzz'); console.log('[MIDI] jzz loaded'); } catch { console.log('[MIDI] jzz unavailable'); }

function getMidiPorts() {
  if (!jzzEngine) return [];
  try { return jzzEngine.info().outputs.map((p, i) => ({ id: i, name: p.name })); } catch { return []; }
}

async function initMidi() {
  if (!JZZ) return;
  try { jzzEngine = await JZZ(); console.log('[MIDI] Ports:', getMidiPorts().map(p=>p.name).join(', ')||'none');
    if (cfg.midi?.outputPort) selectMidiPort(cfg.midi.outputPort);
  } catch(e) { console.log('[MIDI] Init failed:', e.message); }
}

async function selectMidiPort(name) {
  if (!jzzEngine) return;
  try { if (midiOut) try { midiOut.close(); } catch {}
    midiOut = jzzEngine.openMidiOut(name);
    console.log(`[MIDI] Opened: ${name}`);
    bcast({ type: 'midi_status', connected: true, port: name });
  } catch(e) { midiOut = null; bcast({ type: 'midi_status', connected: false }); }
}

function sendMidi(ch, cc, val) {
  if (!midiOut) return;
  try { midiOut.control(ch, cc, Math.max(0, Math.min(127, Math.round(val * 127)))); } catch {}
}

function checkMidiMap(address, value) {
  if (!cfg.midi?.mappings) return;
  cfg.midi.mappings.forEach(m => { if (m.oscAddress === address) sendMidi(m.channel||0, m.cc, value); });
}

function processCombined() {
  if (!cfg.midi?.combined) return;
  cfg.midi.combined.forEach(comb => {
    const vals = comb.sources.map(s => valueStore[s] || 0);
    const avg = vals.reduce((a, b) => a + b, 0) / Math.max(1, vals.length);
    sendMidi(comb.channel||0, comb.cc, avg);
    if (comb.oscOut) tx(comb.oscOut, avg);
    bcast({ type: 'combined_value', id: comb.id, value: avg });
  });
}

app.get('/api/midi/ports', (_, r) => r.json(getMidiPorts()));

// ─── OSC ─────────────────────────────────────
const udp = new osc.UDPPort({
  localAddress: '0.0.0.0', localPort: cfg.osc.receivePort,
  remoteAddress: cfg.osc.host, remotePort: cfg.osc.sendPort, metadata: true
});
udp.on('ready', () => console.log(`[OSC] → ${cfg.osc.host}:${cfg.osc.sendPort} ← :${cfg.osc.receivePort}`));
udp.on('message', msg => {
  bcast({ type: 'fb', address: msg.address, args: msg.args ? msg.args.map(a => a.value) : [] });
  if (msg.args?.[0]) checkMidiMap(msg.address, msg.args[0].value);
});
udp.on('error', e => console.error('[OSC]', e.message));
udp.open();

function tx(addr, val) {
  const t = typeof val === 'number' ? (Number.isInteger(val) ? 'i' : 'f') : 's';
  try { udp.send({ address: addr, args: [{ type: t, value: val }] }); } catch {}
}

// ─── SMOOTH ──────────────────────────────────
const anims = {};
function startSmooth(address, from, to, duration) {
  if (anims[address]) { clearInterval(anims[address].timer); delete anims[address]; }
  const FPS=60, iv=1000/FPS, steps=Math.max(1,Math.ceil(duration/iv));
  let step=0;
  const timer = setInterval(() => {
    step++; const t=Math.min(1,step/steps), e=t*t*(3-2*t), val=from+(to-from)*e;
    tx(address,val); checkMidiMap(address,val); bcast({type:'smooth_progress',address,value:val});
    if(step>=steps){clearInterval(timer);delete anims[address];tx(address,to);bcast({type:'smooth_done',address,value:to});}
  }, iv);
  anims[address] = { timer };
}

// ─── START ───────────────────────────────────
const port = cfg.server?.httpPort || 3333;
server.listen(port, '0.0.0.0', () => {
  const nets = require('os').networkInterfaces();
  let ip = '127.0.0.1';
  for (const a of Object.values(nets)) for (const n of a) if (n.family==='IPv4'&&!n.internal){ip=n.address;break;}
  console.log(`\n  RSLM CTRL v5`);
  console.log(`  Main    → http://${ip}:${port}`);
  console.log(`  Retroid → http://${ip}:${port}/retroid.html\n`);
  initMidi();
});
