import postgres from 'postgres';import {readFile} from 'node:fs/promises';
if(!process.env.DATABASE_URL)throw Error('DATABASE_URL is required');
const sql=postgres(process.env.DATABASE_URL,{max:1});try{await sql.unsafe(await readFile('packages/db/migrations/0001.sql','utf8'));console.log('Schema installed');}finally{await sql.end();}

