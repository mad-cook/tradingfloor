import {spawn} from 'node:child_process';
const options={stdio:'inherit',env:process.env,windowsHide:true};
const worker=spawn(process.execPath,['--import','tsx','apps/floor-worker/index.ts'],options);
const web=spawn(process.execPath,['node_modules/next/dist/bin/next','dev','-p','3100'],options);
const shutdown=()=>{worker.kill();web.kill();};process.on('SIGINT',shutdown);process.on('SIGTERM',shutdown);
worker.on('exit',code=>{if(code)web.kill();});web.on('exit',()=>worker.kill());

