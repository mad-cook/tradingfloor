import {existsSync} from 'node:fs';
import {spawn} from 'node:child_process';
if(existsSync('.env.local'))process.loadEnvFile('.env.local');
process.env.ALLOW_LOCAL_CONTROLS??='1';
const options={stdio:'inherit',env:process.env,windowsHide:true};
const worker=spawn(process.execPath,['--import','tsx','apps/floor-worker/index.ts'],options);
const web=spawn(process.execPath,['node_modules/next/dist/bin/next','dev','-p','3100'],options);
const shutdown=()=>{worker.kill();web.kill();};process.on('SIGINT',shutdown);process.on('SIGTERM',shutdown);
worker.on('exit',code=>{if(code)web.kill();});web.on('exit',()=>worker.kill());
