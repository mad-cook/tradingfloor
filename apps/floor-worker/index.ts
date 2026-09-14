import {createServer} from 'node:http';
import {mkdir,appendFile,stat,rename,rm} from 'node:fs/promises';
import {join} from 'node:path';
import {createStore} from '../../packages/db/store';
import {LiveEngine} from '../../packages/live/engine';
import {FloorEngine} from '../../packages/core/sim/engine';
import {Audience} from '../../packages/core/audience';
import type {Snapshot} from '../../packages/core/types';
const tradingMode=process.env.DATA_MODE==='live'||process.env.DATA_MODE==='shadow';
if(!tradingMode&&process.env.PAPER==='0')throw Error('PAPER=0 requires DATA_MODE=live');
if(process.env.DATA_MODE&&!['demo','shadow','live'].includes(process.env.DATA_MODE))throw Error('Unknown DATA_MODE');
const data=process.env.DATA_DIR??'data';await mkdir(data,{recursive:true});
const engine=tradingMode?await LiveEngine.open():new FloorEngine(),audience=new Audience();const store=await createStore();const stored=tradingMode?null:await store.load();
if(stored){if(stored.mode!=='demo'||stored.desks?.length!==12)throw Error('Invalid saved rehearsal state');engine.restore(stored as Snapshot);}
const clients=new Set<import('node:http').ServerResponse>();let writing=Promise.resolve(),healthy=true,stopping=false,lastLogged=engine.state.events.at(-1)?.id??0;
function send(client:import('node:http').ServerResponse,payload:string){if(client.writableLength>1024*1024){client.destroy();clients.delete(client);}else client.write(payload);}
function publish(){const payload=JSON.stringify(engine.state);for(const client of clients)send(client,'data: '+payload+'\n\n');
 const fresh=engine.state.events.filter(e=>e.id>lastLogged);lastLogged=Math.max(lastLogged,...engine.state.events.map(e=>e.id));
 writing=writing.then(async()=>{if(!tradingMode)await store.save(JSON.parse(payload));if(fresh.length){const log=join(data,'events.jsonl');const size=await stat(log).then(s=>s.size).catch(()=>0);if(size>10*1024*1024){await rm(log+'.1',{force:true});await rename(log,log+'.1');}await appendFile(log,fresh.map(e=>JSON.stringify(e)).join('\n')+'\n');}healthy=true;}).catch(()=>{healthy=false;console.error('Persistence write failed');});
}
async function readBody(req:import('node:http').IncomingMessage){let body='';for await(const chunk of req){body+=chunk;if(body.length>1000)throw Error('Body too large');}return JSON.parse(body);}
const server=createServer(async(req,res)=>{
 const path=new URL(req.url??'/', 'http://localhost').pathname;res.setHeader('Cache-Control','no-store');
 if(path==='/health'){res.statusCode=healthy&&!stopping?200:503;res.setHeader('Content-Type','application/json');res.end(JSON.stringify({ok:healthy&&!stopping,mode:engine.state.mode,paper:engine.state.mode!=='live'}));return;}
 if(path==='/state'){res.setHeader('Content-Type','application/json');res.end(JSON.stringify(engine.state));return;}
 if(path==='/events'){if(clients.size>=1000){res.statusCode=503;res.end();return;}res.writeHead(200,{'Content-Type':'text/event-stream',Connection:'keep-alive'});res.write('data: '+JSON.stringify(engine.state)+'\n\n');clients.add(res);req.on('close',()=>clients.delete(res));return;}
 if(path==='/audience'){res.setHeader('Content-Type','application/json');try{if(req.method==='GET')res.end(JSON.stringify(audience.snapshot()));else if(req.method==='POST'){const {id,reaction}=await readBody(req);if(typeof id!=='string'||!/^[a-f0-9]{64}$/.test(id))throw Error('Invalid viewer');res.end(JSON.stringify(audience.vote(id,reaction)));}else{res.statusCode=405;res.end();}}catch(e){res.statusCode=429;res.end(JSON.stringify({error:(e as Error).message}));}return;}
 if(path==='/command'&&req.method==='POST'){
 if(process.env.ALLOW_LOCAL_CONTROLS!=='1'){res.statusCode=403;res.end(JSON.stringify({error:'Operator controls disabled'}));return;}
 try{const {action}=await readBody(req);if(!['pause','night','kill','close','risk'].includes(action))throw Error('Unknown action');engine.command(action);publish();res.end(JSON.stringify({ok:true}));}catch(e){res.statusCode=400;res.end(JSON.stringify({error:(e as Error).message}));}return;}
 res.statusCode=404;res.end('Not found');
});
let cycling=false;
const ticker=setInterval(async()=>{if(cycling||stopping)return;cycling=true;try{if(process.env.KILL_SWITCH==='1')engine.state.killed=true;if(engine instanceof LiveEngine)await engine.cycle();else engine.tick();publish();}catch{engine.state.killed=true;healthy=false;engine.emit('FAIL','Worker halted after an unexpected error');console.error('Worker tick failed');publish();}finally{cycling=false;}},tradingMode?15_000:5000);
const heartbeat=setInterval(()=>{for(const client of clients)send(client,': heartbeat\n\n');},15000);
async function shutdown(){if(stopping)return;stopping=true;if(engine instanceof LiveEngine)engine.requestStop();clearInterval(ticker);clearInterval(heartbeat);for(const client of clients)client.end();clients.clear();server.close();while(cycling)await new Promise(r=>setTimeout(r,50));publish();await writing;await store.close();process.exit(0);}
process.on('SIGINT',()=>void shutdown());process.on('SIGTERM',()=>void shutdown());
server.listen(Number(process.env.WORKER_PORT??3101),'127.0.0.1',()=>console.log('Floor worker ready: '+engine.state.mode));
