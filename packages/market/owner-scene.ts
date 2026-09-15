import {mkdir,readFile,writeFile,rename} from 'node:fs/promises';
import {join} from 'node:path';
import {randomUUID} from 'node:crypto';
import type {CutawayEvent} from '../core/cutaway';
const DELIVERY_MS=120000;
type Saved={event:CutawayEvent;expiresAt:number};
let writing:Promise<unknown>=Promise.resolve();
async function saved(dir:string):Promise<Saved|null>{try{return JSON.parse(await readFile(join(dir,'owner-scene.json'),'utf8'));}catch(e){if((e as NodeJS.ErrnoException).code==='ENOENT')return null;throw e;}}
export async function readOwnerScene(dir=process.env.DATA_DIR??'data',now=Date.now()){const value=await saved(dir);return value&&value.expiresAt>now?value.event:null;}
export function triggerOwnerScene(dir=process.env.DATA_DIR??'data',now=Date.now()):Promise<CutawayEvent>{
 const task=writing.then(async()=>{await mkdir(dir,{recursive:true});const old=await saved(dir);if(old&&old.expiresAt>now)return old.event;
 const event:CutawayEvent={id:'owner:'+randomUUID(),startedAt:now,generation:(old?.event.generation??1)+1,manual:true};const file=join(dir,'owner-scene.json');await writeFile(file+'.tmp',JSON.stringify({event,expiresAt:now+DELIVERY_MS}),{mode:0o600});await rename(file+'.tmp',file);return event;});writing=task.catch(()=>{});return task;
}
