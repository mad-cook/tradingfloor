import {join} from 'node:path';
import postgres from 'postgres';import {mkdir,readFile,writeFile,rename,appendFile} from 'node:fs/promises';import type {Snapshot} from '../core/types';
export async function createStore(){
 const data=process.env.DATA_DIR??'data';
 if(process.env.DATABASE_URL){
 const sql=postgres(process.env.DATABASE_URL,{max:2,connect_timeout:10});
 return {
 async load():Promise<Snapshot|null>{const rows=await sql`SELECT snapshot FROM floor_runtime WHERE id = 'rehearsal'`;return rows[0]?.snapshot as Snapshot??null;},
 async save(snapshot:Snapshot){await sql`INSERT INTO floor_runtime (id, snapshot, updated_at) VALUES ('rehearsal', ${sql.json(snapshot as any)}, now()) ON CONFLICT (id) DO UPDATE SET snapshot = excluded.snapshot, updated_at = excluded.updated_at`;},
 async close(){await sql.end();}
 };
 }
 await mkdir(data,{recursive:true});
 return {
 async load():Promise<Snapshot|null>{try{return JSON.parse(await readFile(join(data,'snapshot.json'),'utf8'));}catch(e){if((e as NodeJS.ErrnoException).code==='ENOENT')return null;throw e;}},
 async save(snapshot:Snapshot){await writeFile(join(data,'snapshot.tmp'),JSON.stringify(snapshot));await rename(join(data,'snapshot.tmp'),join(data,'snapshot.json'));},
 async close(){}
 };
}
