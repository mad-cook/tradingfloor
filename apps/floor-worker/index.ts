import {createServer} from 'node:http';
import {mkdir,appendFile} from 'node:fs/promises';
import {createStore} from '../../packages/db/store';
import {FloorEngine} from '../../packages/core/sim/engine';
import type {Snapshot} from '../../packages/core/types';
if(process.env.PAPER==='0')throw Error('Live execution is not available');
if(process.env.DATA_MODE&&process.env.DATA_MODE!=='demo')throw Error('Market mode remains gated by preflight; this worker is rehearsal only');
await mkdir('data',{recursive:true});
const engine=new FloorEngine();const store=await createStore();const stored=await store.load();if(stored){if(stored.mode!=='demo'||stored.desks?.length!==12)throw Error('Invalid saved rehearsal state');engine.restore(stored as Snapshot);}
const clients=new Set<import('node:http').ServerResponse>();let writing=Promise.resolve();let lastLogged=0;
function publish(){const payload=JSON.stringify(engine.state);for(const client of clients)client.write('data: '+payload+'\n\n');
 const fresh=engine.state.events.filter(e=>e.id>lastLogged);lastLogged=Math.max(lastLogged,...engine.state.events.map(e=>e.id));
 writing=writing.then(async()=>{await store.save(JSON.parse(payload));if(fresh.length)await appendFile('data/events.jsonl',fresh.map(e=>JSON.stringify(e)).join('\n')+'\n');}).catch(e=>console.error('Persistence error',e.message));}
const server=createServer(async(req,res)=>{
 const path=new URL(req.url??'/', 'http://localhost').pathname;
 res.setHeader('Cache-Control','no-store');
 if(path==='/health'){res.setHeader('Content-Type','application/json');res.end(JSON.stringify({ok:true,mode:'demo',paper:true}));return;}
 if(path==='/state'){res.setHeader('Content-Type','application/json');res.end(JSON.stringify(engine.state));return;}
 if(path==='/events'){res.writeHead(200,{'Content-Type':'text/event-stream',Connection:'keep-alive'});res.write('data: '+JSON.stringify(engine.state)+'\n\n');clients.add(res);req.on('close',()=>clients.delete(res));return;}
 if(path==='/command'&&req.method==='POST'){
 try{let body='';for await(const chunk of req){body+=chunk;if(body.length>1000)throw Error('Body too large');}
 const {action}=JSON.parse(body);engine.command(action);publish();res.end(JSON.stringify({ok:true}));}catch(e){res.statusCode=400;res.end(JSON.stringify({error:(e as Error).message}));}return;
 }
 res.statusCode=404;res.end('Not found');
});
setInterval(()=>{try{if(process.env.KILL_SWITCH==='1')engine.state.killed=true;engine.tick();publish();}catch(e){engine.state.killed=true;engine.emit('FAIL','Worker halted after an unexpected error');console.error(e);publish();}},5000);
setInterval(()=>{for(const client of clients)client.write(': heartbeat\n\n');},15000);
server.listen(Number(process.env.WORKER_PORT??3101),'127.0.0.1',()=>console.log('Floor worker http://127.0.0.1:'+ (process.env.WORKER_PORT??3101)+' · rehearsal only'));




